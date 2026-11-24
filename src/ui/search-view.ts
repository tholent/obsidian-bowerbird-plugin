// Passage search in a sidebar (bbq Q4): ranked hits with file, line and trust tier. Hit text is data from
// the vault, shown as text and never as HTML (bbq Q19). Nothing found is said plainly: a gap.

import { ItemView, SearchComponent, WorkspaceLeaf } from 'obsidian';
import type { Hit } from '../bowerbird';
import type BowerbirdPlugin from '../main';
import { fileLink, tierWords } from './open';

export const SEARCH_VIEW = 'bowerbird-search';

const SNIPPET = 320;

export class SearchView extends ItemView {
	private input!: SearchComponent;
	private results!: HTMLElement;
	private serial = 0;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: BowerbirdPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return SEARCH_VIEW;
	}

	getDisplayText(): string {
		return 'Bowerbird search';
	}

	getIcon(): string {
		return 'bird';
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass('bowerbird-search');
		this.input = new SearchComponent(root.createDiv({ cls: 'bowerbird-search-box' })).setPlaceholder('Search passages, then press Enter');
		this.input.inputEl.addEventListener('keydown', (evt) => {
			if (evt.key === 'Enter') void this.search(this.input.getValue());
		});
		this.results = root.createDiv({ cls: 'bowerbird-results' });
		this.results.createDiv({ cls: 'bowerbird-quiet', text: 'Search finds the passages that best answer your words, with the file, line and how far each can be trusted.' });
	}

	focusInput(): void {
		this.input?.inputEl.focus();
	}

	async search(query: string): Promise<void> {
		const q = query.trim();
		if (!q) return;
		const n = ++this.serial;
		this.results.empty();
		this.results.createDiv({ cls: 'bowerbird-quiet', text: 'Searching…' });
		try {
			await this.plugin.ensure();
			const found = await this.plugin.bb().passages(q, this.plugin.settings.searchLimit);
			if (n !== this.serial) return;
			this.results.empty();
			if (found.gap) {
				this.results.createDiv({ cls: 'bowerbird-gap', text: 'Gap: nothing in the collection answers this.' });
				return;
			}
			this.results.createDiv({ cls: 'bowerbird-quiet', text: `${found.hits.length} of ${found.total} passages` });
			for (const hit of found.hits) this.drawHit(hit);
		} catch (e) {
			if (n !== this.serial) return;
			this.results.empty();
			this.results.createDiv({ cls: 'bowerbird-error', text: 'The search did not run. See the notice for why.' });
			this.plugin.report(e);
		}
	}

	private drawHit(hit: Hit): void {
		const card = this.results.createDiv({ cls: 'bowerbird-hit' });
		const head = card.createDiv({ cls: 'bowerbird-hit-head' });
		const where = hit.line !== null ? `${hit.file}:${hit.line}` : hit.file;
		fileLink(head, this.app, this.plugin.toVault(hit.file), hit.title || hit.file, hit.line, (e) => this.plugin.report(e));
		if (hit.heading) head.createSpan({ cls: 'bowerbird-heading', text: ` · ${hit.heading}` });
		const meta = card.createDiv({ cls: 'bowerbird-hit-meta' });
		meta.createSpan({ text: where });
		const tier = meta.createSpan({ cls: `bowerbird-tier bowerbird-tier-${hit.tier || 'unknown'}`, text: tierWords(hit.tier) });
		tier.setAttr('aria-label', 'How far this passage can be trusted');
		if (hit.stale) meta.createSpan({ cls: 'bowerbird-stale', text: 'stale' });
		if (hit.match !== null) meta.createSpan({ cls: 'bowerbird-match', text: `${hit.match}%` });
		const text = hit.text.length > SNIPPET ? `${hit.text.slice(0, SNIPPET)}…` : hit.text;
		card.createDiv({ cls: 'bowerbird-hit-text', text });
	}
}
