import { debounce, FileSystemAdapter, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Bowerbird, BowerbirdError, UnavailableError } from './bowerbird';
import { filesLackingReview, lintVault } from './commands';
import { copySealCommand, openInServe, stopServe } from './handoff';
import { collectionRoot, toCollection, toVault } from './paths';
import { SealIndex } from './seal-index';
import { BowerbirdSettingTab, BowerbirdSettings, DEFAULT_SETTINGS } from './settings';
import { CliTransport } from './transport/cli';
import { nodeRunner } from './transport/node-runner';
import { SealBadge } from './ui/badge';
import { NOTE_VIEW, NoteFacts, NoteView } from './ui/note-view';
import { SEARCH_VIEW, SearchView } from './ui/search-view';

export default class BowerbirdPlugin extends Plugin {
	settings!: BowerbirdSettings;
	seals!: SealIndex;
	private transport: Bowerbird | null = null;
	private collection: string | null = null;
	private toldUnavailable = false;
	private toldVersion = false;
	private badge!: SealBadge;
	private notes = new Map<string, Promise<NoteFacts>>();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new BowerbirdSettingTab(this.app, this));
		this.seals = new SealIndex(() => this.bb());
		this.badge = new SealBadge(this);
		this.registerView(SEARCH_VIEW, (leaf) => new SearchView(leaf, this));
		this.registerView(NOTE_VIEW, (leaf) => new NoteView(leaf, this));
		this.addRibbonIcon('bird', 'Bowerbird search', () => void this.openSearch());

		const refresh = debounce(() => void this.refreshAll(), 400, true);
		const changed = debounce(
			() => {
				this.forget();
				refresh();
			},
			1500,
			true,
		);
		this.registerEvent(this.app.workspace.on('file-open', refresh));
		this.registerEvent(this.app.workspace.on('active-leaf-change', refresh));
		this.registerEvent(this.app.vault.on('modify', changed));
		this.registerEvent(this.app.vault.on('create', changed));
		this.registerEvent(this.app.vault.on('delete', changed));
		this.registerEvent(this.app.vault.on('rename', changed));
		// a seal made in serve or a terminal changes a hidden file Obsidian does not watch: look again on return
		this.registerDomEvent(window, 'focus', changed);

		this.addCommand({ id: 'open-search', name: 'Search passages', callback: () => void this.openSearch() });
		this.addCommand({ id: 'files-lacking-review', name: 'Files lacking review', callback: () => this.attempt(() => filesLackingReview(this)) });
		this.addCommand({ id: 'open-note-panel', name: 'Open the note panel', callback: () => void this.openSide(NOTE_VIEW) });
		this.addCommand({ id: 'lint-vault', name: 'Lint the whole vault', callback: () => this.attempt(() => lintVault(this)) });
		this.addActiveNoteCommand('open-in-serve', 'Open the active note in serve to seal', (p) => openInServe(this, p));
		this.addActiveNoteCommand('copy-seal-command', 'Copy the terminal command to seal the active note', (p) => copySealCommand(this, p));
		this.addCommand({ id: 'stop-serve', name: 'Stop serve', callback: () => this.attempt(() => stopServe(this)) });
		this.addCommand({
			id: 'check-setup',
			name: 'Check setup again',
			callback: () => {
				this.reset();
				void this.attempt(async () => {
					await this.ensure();
					new Notice(this.hasCollection() ? 'Bowerbird: ready.' : 'Bowerbird: ready, but this vault has no bower.yaml yet.');
				});
			},
		});

		this.app.workspace.onLayoutReady(() => void this.refreshAll());
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<BowerbirdSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.reset();
		void this.refreshAll();
	}

	/** The vault's folder on disk. */
	vaultRoot(): string {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) throw new Error('Bowerbird needs a vault on the local disk');
		return adapter.getBasePath();
	}

	/** The collection root, or null when its bower.yaml is missing. */
	collectionRoot(): string | null {
		if (this.transport === null) this.bb();
		return this.collection;
	}

	hasCollection(): boolean {
		return this.collectionRoot() !== null;
	}

	/** The transport, made from the settings on first use. */
	bb(): Bowerbird {
		if (this.transport) return this.transport;
		const vault = this.vaultRoot();
		const root = collectionRoot(this.settings.collection, vault, os.homedir(), path);
		this.collection = fs.existsSync(path.join(root, 'bower.yaml')) ? root : null;
		const env: Record<string, string> = {};
		for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') env[k] = v;
		const local = path.join(os.homedir(), '.local', 'bin');
		env.PATH = [env.PATH ?? '', local].filter((p) => p).join(path.delimiter);
		this.transport = new CliTransport(
			{
				command: this.settings.command,
				vaultRoot: vault,
				collectionRoot: this.collection,
				servePort: this.settings.servePort,
				allowSemantic: this.settings.allowSemantic,
				platform: process.platform,
				lookup: { pathEnv: env.PATH, home: os.homedir(), platform: process.platform, exists: (f) => fs.existsSync(f) },
				env,
			},
			nodeRunner,
		);
		return this.transport;
	}

	/** Find and check bowerbird-mcp once; show a version warning once. */
	async ensure(): Promise<void> {
		const warning = await this.bb().ready();
		if (warning && !this.toldVersion) {
			this.toldVersion = true;
			new Notice(`Bowerbird: ${warning}`, 10000);
		}
	}

	/** Start again from the settings: find the command and the collection anew. */
	reset(): void {
		this.transport = null;
		this.collection = null;
		this.toldUnavailable = false;
		this.toldVersion = false;
		this.seals?.invalidate();
		this.notes.clear();
	}

	/** Drop what was read from bowerbird, so the next look asks again. */
	forget(): void {
		this.seals.invalidate();
		this.notes.clear();
	}

	/** Lint, links and facts of one note, kept until something changes. */
	aboutNote(file: TFile, collectionPath: string): Promise<NoteFacts> {
		let p = this.notes.get(collectionPath);
		if (!p) {
			p = this.readNote(file, collectionPath);
			this.notes.set(collectionPath, p);
			p.catch(() => this.notes.delete(collectionPath));
		}
		return p;
	}

	private async readNote(file: TFile, collectionPath: string): Promise<NoteFacts> {
		const bb = this.bb();
		const text = await this.app.vault.cachedRead(file);
		const [lint, links, facts] = await Promise.all([
			bb.lint(collectionPath),
			bb.links(collectionPath),
			text.includes('[fact.') ? bb.facts(collectionPath) : Promise.resolve([]),
		]);
		return { lint, links, facts };
	}

	toCollection(vaultPath: string): string | null {
		const root = this.collectionRoot();
		return root ? toCollection(vaultPath, { vault: this.vaultRoot(), collection: root }, path) : null;
	}

	toVault(collectionPath: string): string | null {
		const root = this.collectionRoot();
		return root ? toVault(collectionPath, { vault: this.vaultRoot(), collection: root }, path) : null;
	}

	/** One plain notice per failure, with bowerbird's own message and fix. quiet: only the install message. */
	report(e: unknown, quiet = false): void {
		if (e instanceof UnavailableError) {
			if (this.toldUnavailable) return;
			this.toldUnavailable = true;
			new Notice(e.message, 0);
			return;
		}
		if (quiet) return;
		if (e instanceof BowerbirdError) {
			new Notice(`Bowerbird: ${e.message}${e.fix ? `\nFix: ${e.fix}` : ''}`, 10000);
			return;
		}
		new Notice(`Bowerbird: ${e instanceof Error ? e.message : String(e)}`, 10000);
	}

	/** Run a user's action and report its failure. */
	async attempt(action: () => Promise<void>): Promise<void> {
		try {
			await action();
		} catch (e) {
			this.report(e);
		}
	}

	async refreshAll(): Promise<void> {
		const views = this.app.workspace
			.getLeavesOfType(NOTE_VIEW)
			.map((l) => l.view)
			.filter((v): v is NoteView => v instanceof NoteView);
		await Promise.all([this.badge.refresh(), ...views.map((v) => v.refresh())]);
	}

	/** Open a view in the right sidebar, reusing one that is already open. */
	async openSide(type: string): Promise<WorkspaceLeaf | null> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(type)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return null;
			await leaf.setViewState({ type, active: true });
		}
		await workspace.revealLeaf(leaf);
		return leaf;
	}

	async openSearch(): Promise<void> {
		const leaf = await this.openSide(SEARCH_VIEW);
		if (leaf?.view instanceof SearchView) leaf.view.focusInput();
	}

	setUpVault(): void {
		new Notice('Bowerbird: vault setup comes in a later step of this build.');
	}

	/** A command that acts on the active note's collection path. */
	private addActiveNoteCommand(id: string, name: string, act: (collectionPath: string) => Promise<void>): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
				if (!(file instanceof TFile) || !this.hasCollection()) return false;
				const p = this.toCollection(file.path);
				if (p === null) return false;
				if (!checking) void this.attempt(() => act(p));
				return true;
			},
		});
	}
}
