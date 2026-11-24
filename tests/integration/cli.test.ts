// Integration tests (bbq Q14): the real bowerbird-mcp against a made-up vault in a temporary folder,
// through the plugin's own transport. They need bowerbird-mcp, which Chris Wells installs (bbq Q18);
// without it every test here is skipped and says so.
//
// Run: npm run test:integration   (BOWERBIRD_CMD can name the command, as the plugin's setting does)

import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BowerbirdError } from '../../src/bowerbird';
import { CliOptions, CliTransport } from '../../src/transport/cli';
import { chooseCommand, Lookup } from '../../src/transport/command';
import { nodeRunner } from '../../src/transport/node-runner';
import { ask, noteUrl, waitFor } from '../../src/serve';
import http from 'http';

// the runner uses window timers, as Obsidian's popout windows need
(globalThis as unknown as { window: typeof globalThis }).window ??= globalThis;

const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') env[k] = v;
const lookup: Lookup = { pathEnv: env.PATH ?? '', home: os.homedir(), platform: process.platform, exists: (f) => fs.existsSync(f) };
const command = env.BOWERBIRD_CMD ?? '';
const found = chooseCommand(command, lookup) !== null;

if (!found) {
	console.warn('Integration tests skipped: bowerbird-mcp is not installed (waiting for bbq Q18).');
}

function write(root: string, file: string, text: string): void {
	fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
	fs.writeFileSync(path.join(root, file), text);
}

function transport(vault: string, collection: string | null, servePort = 26937): CliTransport {
	const opts: CliOptions = {
		command,
		vaultRoot: vault,
		collectionRoot: collection,
		servePort,
		allowSemantic: false,
		platform: process.platform,
		lookup,
		env,
	};
	return new CliTransport(opts, nodeRunner);
}

describe.skipIf(!found)('bowerbird-mcp against a made-up vault', () => {
	let vault = '';
	let bb: CliTransport;

	beforeAll(() => {
		vault = fs.mkdtempSync(path.join(os.tmpdir(), 'bowerbird-it-'));
		write(vault, 'bower.yaml', 'format: obsidian\nabout: A made-up vault for the plugin tests.\n');
		write(vault, 'a.md', '# A\n\nSee [[b]] and [[Missing]] and [[Alt Name]].\n\n%% [[Hidden]] %%\n');
		write(vault, 'sub/b.md', '---\naliases: [Alt Name]\n---\n# B\n\nThe second note.\n');
		write(vault, 'deploy.md', '# Deploy\n\n## Roll back\n\nTo roll back a deploy, run the previous release again.\n');
		write(vault, 'facts.md', '# Facts\n\n[fact.internal](deploy.md#Roll back) To roll back a deploy, run the previous release again. [fact.end]\n');
		write(vault, '.obsidian/workspace.md', '[[Nope]]\n');
		bb = transport(vault, vault);
	});

	afterAll(() => {
		if (vault) fs.rmSync(vault, { recursive: true, force: true });
	});

	it('finds the command and a version in range', async () => {
		expect(await bb.ready()).toBeNull();
	});

	it('finds a passage, with its file and line', async () => {
		const p = await bb.passages('roll back a deploy', 5);
		expect(p.gap).toBe(false);
		const hit = p.hits.find((h) => h.file === 'deploy.md');
		expect(hit).toBeDefined();
		expect(hit?.line).toBeGreaterThan(0);
		expect(hit?.tier).toBe('unverified');
	});

	it('says gap when nothing answers', async () => {
		expect((await bb.passages('zqxjvw', 5)).gap).toBe(true);
	});

	it('lists every note, and leaves out .obsidian', async () => {
		const files = (await bb.concepts()).map((c) => c.file).sort();
		expect(files).toEqual(['a.md', 'deploy.md', 'facts.md', 'sub/b.md']);
	});

	it('marks the broken link, and finds a note by its alias', async () => {
		const l = await bb.links('a.md');
		const byLabel = Object.fromEntries(l.out.map((o) => [o.label, o]));
		expect(byLabel['[[b]]']).toMatchObject({ target: 'sub/b.md', exists: true });
		expect(byLabel['[[Alt Name]]']).toMatchObject({ target: 'sub/b.md', exists: true });
		expect(byLabel['[[Missing]]']?.exists).toBe(false);
		expect(byLabel['[[Hidden]]']).toBeUndefined();
		expect((await bb.links('sub/b.md')).in).toContain('a.md');
	});

	it('lints one note: the dead link is a warning', async () => {
		const r = await bb.lint('a.md');
		const dead = r.findings.filter((f) => f.kind === 'dead_link');
		expect(dead).toHaveLength(1);
		expect(dead[0]?.file).toBe('a.md');
	});

	it('lists a note\'s facts without checking them', async () => {
		const before = fs.readdirSync(vault).sort();
		const facts = await bb.facts('facts.md');
		expect(facts.length).toBe(1);
		expect(facts[0]?.kind).toBe('internal');
		expect(facts[0]?.status).toBe('unchecked');
		expect(fs.readdirSync(vault).sort()).toEqual(before);
	});

	it('lists what lacks review, and seals nothing', async () => {
		const r = await bb.lacking();
		expect(r.findings.map((f) => f.file)).toEqual(expect.arrayContaining(['a.md', 'deploy.md']));
		expect(r.findings.every((f) => f.kind === 'unsigned')).toBe(true);
		expect(fs.existsSync(path.join(vault, '.waxseals.yaml'))).toBe(false);
	});

	it("maps list's tier and stale to the badge's seal state", async () => {
		// a machine check, by the test itself (never by the plugin), then an edit that breaks it
		const cmd = chooseCommand(command, lookup);
		const r = await nodeRunner.run([...(cmd?.argv ?? []), '--config', vault, 'seal', 'file=sub/b.md', 'by=process:plugin-test', 'output=json'], vault, env, 120000);
		expect(r.code).toBe(0);
		const sealed = (await bb.concepts()).find((c) => c.file === 'sub/b.md');
		expect(sealed).toMatchObject({ tier: 'machine-confirmed', stale: false });
		fs.appendFileSync(path.join(vault, 'sub/b.md'), '\nAn edit after the check.\n');
		const broken = (await bb.concepts()).find((c) => c.file === 'sub/b.md');
		expect(broken).toMatchObject({ tier: 'unverified', stale: true });
	});

	it('writes a new note from a template, and refuses one that exists', async () => {
		const made = await bb.newNote('notes/runbook', 'markdown', 'Runbook');
		expect(fs.existsSync(path.join(vault, 'notes/runbook.md'))).toBe(true);
		expect(made.files).toContain('notes/runbook.md');
		await expect(bb.newNote('notes/runbook', 'markdown', 'Again')).rejects.toBeInstanceOf(BowerbirdError);
	});

	it("reports bowerbird's own error and fix", async () => {
		const e = await bb.links('nowhere.md').catch((x: unknown) => x);
		expect(e).toBeInstanceOf(BowerbirdError);
		expect((e as BowerbirdError).message.length).toBeGreaterThan(0);
	});
});

describe.skipIf(!found)('setting up a vault with no bower.yaml', () => {
	let vault = '';

	beforeAll(() => {
		vault = fs.mkdtempSync(path.join(os.tmpdir(), 'bowerbird-it-new-'));
		fs.mkdirSync(path.join(vault, '.git')); // the edge of the search for a bower.yaml, as in a real repository
		write(vault, 'note.md', '# Note\n');
	});

	afterAll(() => {
		if (vault) fs.rmSync(vault, { recursive: true, force: true });
	});

	it('previews, writes nothing, then writes after the OK', async () => {
		const bb = transport(vault, null);
		const plan = await bb.create('My notes.', false);
		expect(plan.files.length + plan.diff.length + plan.raw.length).toBeGreaterThan(0);
		expect(fs.existsSync(path.join(vault, 'bower.yaml'))).toBe(false);
		await bb.create('My notes.', true);
		const cfg = fs.readFileSync(path.join(vault, 'bower.yaml'), 'utf8');
		expect(cfg).toMatch(/^format: obsidian/m);
	});
});

describe.skipIf(!found)('serve, for the hand-off (bbq Q11)', () => {
	const port = 26990 + Math.floor(Math.random() * 9); // a spare port: never the one a person may be using
	let vault = '';
	let bb: CliTransport;

	beforeAll(() => {
		vault = fs.mkdtempSync(path.join(os.tmpdir(), 'bowerbird-it-serve-'));
		write(vault, 'bower.yaml', 'format: obsidian\nabout: A made-up vault for the serve test.\n');
		write(vault, 'My Notes/deploy.md', '# Deploy\n\nHow we deploy.\n');
		bb = transport(vault, vault, port);
	});

	afterAll(async () => {
		await bb.serve('stop');
		if (vault) fs.rmSync(vault, { recursive: true, force: true });
	});

	it('starts, knows the note, serves its page, and stops', async () => {
		expect(await ask(port, 'My Notes/deploy.md', 500)).toBe('down');
		const started = await bb.serve('start');
		if (started.missingExtra) {
			console.warn('serve test skipped: the serve extra is not installed');
			return;
		}
		expect(started.ok).toBe(true);
		expect(await waitFor(port, 'My Notes/deploy.md')).toBe('serves-it');
		expect(await ask(port, 'not-here.md')).toBe('other-collection');
		const page = await new Promise<number | undefined>((resolve) => {
			http.get(noteUrl(port, 'My Notes/deploy.md'), (res) => {
				res.resume();
				resolve(res.statusCode);
			}).on('error', () => resolve(undefined));
		});
		expect(page).toBe(200);
		const stopped = await bb.serve('stop');
		expect(stopped.ok).toBe(true);
		expect(await ask(port, 'My Notes/deploy.md', 500)).toBe('down');
	});
});
