import { describe, expect, it } from 'vitest';
import { BowerbirdError, UnavailableError } from '../../src/bowerbird';
import { CliOptions, CliTransport, Runner, RunResult } from '../../src/transport/cli';

interface Call {
	argv: string[];
	cwd: string;
	env: Record<string, string>;
}

function fake(answer: (argv: string[]) => RunResult) {
	const calls: Call[] = [];
	const detached: Call[] = [];
	const runner: Runner = {
		run: (argv, cwd, env) => {
			calls.push({ argv, cwd, env });
			return Promise.resolve(answer(argv));
		},
		detach: (argv, cwd, env) => {
			detached.push({ argv, cwd, env });
		},
	};
	return { runner, calls, detached };
}

const ok = (stdout: string, code = 0): RunResult => ({ code, stdout, stderr: '' });
const version = ok('bowerbird-mcp 2.3.0\n');

function opts(over: Partial<CliOptions> = {}): CliOptions {
	return {
		command: '',
		vaultRoot: '/v',
		collectionRoot: '/v',
		servePort: 26937,
		allowSemantic: false,
		platform: 'linux',
		lookup: { pathEnv: '/usr/bin', home: '/home/ann', platform: 'linux', exists: (f) => f === '/usr/bin/bowerbird-mcp' },
		env: { PATH: '/usr/bin' },
		...over,
	};
}

describe('CliTransport', () => {
	it('checks the version once, then runs each tool with --config from the collection root', async () => {
		const f = fake((a) => (a.includes('--version') ? version : ok('{"total": 0, "gap": true, "hits": []}')));
		const t = new CliTransport(opts(), f.runner);
		const p = await t.passages('deploy', 5);
		await t.passages('again', 5);
		expect(p.gap).toBe(true);
		expect(f.calls.map((c) => c.argv)).toEqual([
			['/usr/bin/bowerbird-mcp', '--version'],
			['/usr/bin/bowerbird-mcp', '--config', '/v', 'passages', 'query=deploy', 'limit=5', 'output=json'],
			['/usr/bin/bowerbird-mcp', '--config', '/v', 'passages', 'query=again', 'limit=5', 'output=json'],
		]);
		expect(f.calls[1]?.cwd).toBe('/v');
	});

	it('turns semantic search off unless the setting allows it', async () => {
		const f = fake((a) => (a.includes('--version') ? version : ok('{"concepts": []}')));
		await new CliTransport(opts(), f.runner).concepts();
		expect(f.calls[1]?.env.BOWERBIRD_SEMANTIC).toBe('false');
		const g = fake((a) => (a.includes('--version') ? version : ok('{"concepts": []}')));
		await new CliTransport(opts({ allowSemantic: true }), g.runner).concepts();
		expect(g.calls[1]?.env.BOWERBIRD_SEMANTIC).toBeUndefined();
	});

	it('reads exit 1 from seal check as findings', async () => {
		const out = '{"tool": "seal", "ok": false, "files_checked": 2, "total": 1, "findings": [{"kind": "unsigned", "severity": "error", "bundle": ".", "file": "a.md", "message": "m", "fix": "f"}]}';
		const f = fake((a) => (a.includes('--version') ? version : ok(out, 1)));
		const r = await new CliTransport(opts(), f.runner).lacking();
		expect(r.findings[0]?.kind).toBe('unsigned');
		expect(f.calls[1]?.argv.slice(3)).toEqual(['seal', 'check=true', 'output=json']);
	});

	it("throws bowerbird's own error and fix", async () => {
		const f = fake((a) => (a.includes('--version') ? version : { code: 2, stdout: '', stderr: "error: 'x.md' is not a .md file | fix: pass bundle=\n" }));
		const err = await new CliTransport(opts(), f.runner).links('x.md').catch((e: unknown) => e);
		expect(err).toBeInstanceOf(BowerbirdError);
		expect((err as BowerbirdError).message).toBe("'x.md' is not a .md file");
		expect((err as BowerbirdError).fix).toBe('pass bundle=');
	});

	it('says how to install when nothing is found, and does not retry', async () => {
		const f = fake(() => version);
		const t = new CliTransport(opts({ lookup: { pathEnv: '', home: '/h', platform: 'linux', exists: () => false } }), f.runner);
		await expect(t.ready()).rejects.toBeInstanceOf(UnavailableError);
		await expect(t.passages('q', 1)).rejects.toBeInstanceOf(UnavailableError);
		expect(f.calls).toHaveLength(0);
	});

	it('is unavailable when the command cannot start, asked once', async () => {
		const f = fake(() => ({ code: null, stdout: '', stderr: 'spawn ENOENT', notFound: true }));
		const t = new CliTransport(opts({ command: '/nope/bowerbird-mcp' }), f.runner);
		await expect(t.ready()).rejects.toThrow(/uv tool install/);
		await expect(t.concepts()).rejects.toBeInstanceOf(UnavailableError);
		expect(f.calls).toHaveLength(1);
	});

	it('warns once about a version outside the range', async () => {
		const f = fake(() => ok('bowerbird-mcp 3.0.0\n'));
		expect(await new CliTransport(opts(), f.runner).ready()).toMatch(/found 3\.0\.0/);
	});

	it('asks for setup when there is no bower.yaml', async () => {
		const f = fake(() => version);
		const err = await new CliTransport(opts({ collectionRoot: null }), f.runner).concepts().catch((e: unknown) => e);
		expect((err as BowerbirdError).fix).toMatch(/Set up this vault/);
	});

	it('runs create without --config, for the vault, with format obsidian', async () => {
		const f = fake((a) => (a.includes('--version') ? version : ok('{"would_edit": {".": ["bower.yaml"]}, "diff": "+x"}')));
		const r = await new CliTransport(opts({ collectionRoot: null }), f.runner).create('My notes.', false);
		expect(r.files).toEqual(['bower.yaml']);
		expect(f.calls[1]?.argv).toEqual(['/usr/bin/bowerbird-mcp', 'create', 'path=/v', 'holds=obsidian', 'about=My notes.', 'apply=false', 'output=json']);
		expect(f.calls[1]?.cwd).toBe('/v');
	});

	it('starts serve with the serve extra under uvx, and says when the extra is missing', async () => {
		const uvx = { pathEnv: '/usr/bin', home: '/h', platform: 'linux', exists: (p: string) => p === '/usr/bin/uvx' };
		const f = fake((a) =>
			a.includes('--version') ? version : { code: 2, stdout: "error: serve needs the markdown package | fix: pip install 'bowerbird-mcp[serve]'", stderr: '' },
		);
		const r = await new CliTransport(opts({ lookup: uvx }), f.runner).serve('start');
		expect(f.calls[1]?.argv).toEqual(['/usr/bin/uvx', '--from', 'bowerbird-mcp[obsidian,serve]>=2.3,<3', 'bowerbird-mcp', '--config', '/v', 'serve', 'start', '26937']);
		expect(r).toEqual({ ok: false, missingExtra: true, message: 'serve needs the markdown package' });
	});

	it('starts serve detached in the foreground on Windows', async () => {
		const f = fake(() => version);
		const look = { pathEnv: 'C:\\bin', home: 'C:\\h', platform: 'win32', exists: (p: string) => p === 'C:\\bin\\bowerbird-mcp.exe' };
		const r = await new CliTransport(opts({ platform: 'win32', lookup: look, collectionRoot: 'C:\\v' }), f.runner).serve('start');
		expect(r.ok).toBe(true);
		expect(f.detached[0]?.argv).toEqual(['C:\\bin\\bowerbird-mcp.exe', '--config', 'C:\\v', 'serve', 'start', '-f', '26937']);
	});

	it('gives the terminal seal command with the command it found', async () => {
		const f = fake(() => version);
		expect(await new CliTransport(opts(), f.runner).sealCommand('a b.md')).toBe("cd /v && /usr/bin/bowerbird-mcp seal 'a b.md' --attest");
	});
});
