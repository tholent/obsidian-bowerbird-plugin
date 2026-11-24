// The command-line transport (bbq Q5): one `bowerbird-mcp <tool> ... output=json` process per call,
// run from the collection root with `--config` naming it. How a process starts is passed in (Runner),
// so this file needs neither Obsidian nor a real bowerbird to be tested.

import {
	Bowerbird,
	BowerbirdError,
	Concept,
	Created,
	Fact,
	Findings,
	Links,
	Passages,
	ServeResult,
	UnavailableError,
} from '../bowerbird';
import { Args, configArgs, serveArgs, toolArgs } from './args';
import { chooseCommand, Command, INSTALL_HELP, Lookup, withServe } from './command';
import { parseVersion, readOutcome, versionInRange } from './output';
import { toConcepts, toCreated, toFacts, toFindings, toLinks, toPassages } from './shapes';
import { sealCommand } from '../seal';

export interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
	/** The program could not be started at all (not found, not allowed). */
	notFound?: boolean;
}

export interface Runner {
	run(argv: string[], cwd: string, env: Record<string, string>, timeoutMs: number): Promise<RunResult>;
	/** Start a program that keeps running on its own, without waiting for it. */
	detach(argv: string[], cwd: string, env: Record<string, string>): void;
}

export interface CliOptions {
	/** The command setting: empty means find bowerbird-mcp (bbq Q9). */
	command: string;
	vaultRoot: string;
	/** The collection root, or null when it has no bower.yaml yet. */
	collectionRoot: string | null;
	servePort: number;
	allowSemantic: boolean;
	platform: string;
	lookup: Lookup;
	env: Record<string, string>;
}

const CALL_MS = 120_000;
const FIRST_MS = 300_000; // uvx downloads bowerbird-mcp on its first run

export class CliTransport implements Bowerbird {
	private cmd: Command | null = null;
	private checked: Promise<string | null> | null = null;

	constructor(
		private readonly opts: CliOptions,
		private readonly runner: Runner,
	) {}

	ready(): Promise<string | null> {
		if (!this.checked) this.checked = this.check();
		return this.checked;
	}

	private async check(): Promise<string | null> {
		let cmd: Command | null;
		try {
			cmd = chooseCommand(this.opts.command, this.opts.lookup);
		} catch (e) {
			throw new UnavailableError(`The command setting could not be read: ${(e as Error).message}`);
		}
		if (!cmd || cmd.argv.length === 0) throw new UnavailableError(INSTALL_HELP);
		const r = await this.runner.run([...cmd.argv, '--version'], this.cwd(), this.env(), FIRST_MS);
		if (r.notFound) throw new UnavailableError(INSTALL_HELP);
		const v = parseVersion(r.stdout);
		if (r.code !== 0 || !v) {
			const why = readOutcome(r.code, r.stdout, r.stderr);
			const detail = why.ok ? '' : ` (${why.failure.message})`;
			throw new UnavailableError(`bowerbird-mcp did not start${detail}. ${INSTALL_HELP}`);
		}
		this.cmd = cmd;
		if (!versionInRange(v)) {
			return `Bowerbird is built for bowerbird-mcp >=2.3,<3, and found ${v.join('.')}. Some things may not work.`;
		}
		return null;
	}

	private cwd(): string {
		return this.opts.collectionRoot ?? this.opts.vaultRoot;
	}

	private env(): Record<string, string> {
		const env = { ...this.opts.env };
		if (!this.opts.allowSemantic) env.BOWERBIRD_SEMANTIC = 'false';
		return env;
	}

	private needCollection(): string {
		if (!this.opts.collectionRoot) {
			throw new BowerbirdError({
				message: 'this vault has no bower.yaml yet',
				fix: 'run the command "Bowerbird: Set up this vault", or name a collection in the settings',
			});
		}
		return this.opts.collectionRoot;
	}

	private async call(tool: string, args: Args): Promise<{ data: unknown; code: number }> {
		await this.ready();
		const root = this.needCollection();
		const words = toolArgs(tool, args);
		const r = await this.runner.run([...(this.cmd as Command).argv, ...configArgs(root), ...words], root, this.env(), CALL_MS);
		if (r.notFound) throw new UnavailableError(INSTALL_HELP);
		const out = readOutcome(r.code, r.stdout, r.stderr);
		if (!out.ok) throw new BowerbirdError(out.failure);
		return { data: out.data, code: out.code };
	}

	async passages(query: string, limit: number): Promise<Passages> {
		return toPassages((await this.call('passages', { query, limit })).data);
	}

	async concepts(): Promise<Concept[]> {
		return toConcepts((await this.call('list', { limit: 0 })).data);
	}

	async links(file: string): Promise<Links> {
		return toLinks((await this.call('links', { file })).data);
	}

	async lint(file?: string): Promise<Findings> {
		return toFindings((await this.call('lint', { file, limit: 0 })).data);
	}

	async facts(file: string): Promise<Fact[]> {
		return toFacts((await this.call('factcheck', { file })).data);
	}

	async lacking(): Promise<Findings> {
		return toFindings((await this.call('seal', { check: true })).data);
	}

	async newNote(file: string, template: string, title: string): Promise<Created> {
		return toCreated((await this.call('new', { file, template, title })).data);
	}

	async create(about: string, apply: boolean): Promise<Created> {
		await this.ready();
		// No --config: there is no bower.yaml yet. `path` names the vault, so nothing else is touched.
		const words = toolArgs('create', { path: this.opts.vaultRoot, holds: 'obsidian', about, apply });
		const r = await this.runner.run([...(this.cmd as Command).argv, ...words], this.opts.vaultRoot, this.env(), CALL_MS);
		const out = readOutcome(r.code, r.stdout, r.stderr);
		if (!out.ok) throw new BowerbirdError(out.failure);
		return toCreated(out.data);
	}

	async serve(verb: 'start' | 'stop' | 'status'): Promise<ServeResult> {
		await this.ready();
		const root = this.needCollection();
		const argv = withServe(this.cmd as Command).argv;
		const port = this.opts.servePort;
		if (verb === 'start' && this.opts.platform === 'win32') {
			// serve has no background mode on Windows: start it in the foreground, detached from Obsidian
			this.runner.detach([...argv, ...configArgs(root), ...serveArgs('start', port, true)], root, this.env());
			return { ok: true, missingExtra: false, message: 'starting' };
		}
		const r = await this.runner.run([...argv, ...configArgs(root), ...serveArgs(verb, port)], root, this.env(), FIRST_MS);
		if (r.notFound) throw new UnavailableError(INSTALL_HELP);
		const missingExtra = /serve needs the markdown package/.test(`${r.stdout}\n${r.stderr}`);
		if (r.code === 0 && !missingExtra) return { ok: true, missingExtra: false, message: r.stdout.trim() };
		const out = readOutcome(r.code, r.stdout, r.stderr); // serve prints text, so this finds its `error:` line
		return { ok: false, missingExtra, message: out.ok ? r.stdout.trim() : out.failure.message };
	}

	async sealCommand(file: string): Promise<string> {
		let argv: string[];
		try {
			await this.ready();
			argv = (this.cmd as Command).argv;
		} catch {
			argv = ['bowerbird-mcp'];
		}
		return sealCommand(argv, this.opts.collectionRoot ?? this.opts.vaultRoot, file, this.opts.platform);
	}
}
