// The note panel: what bowerbird knows about the active note (bbq Q4). Its seal first and prominently
// (bbq Q19), then its lint warnings, its links in and out with broken ones marked, and its facts.
// Everything shown is data from the vault, as text.

import { ButtonComponent, ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type { Fact, Findings, Links } from '../bowerbird';
import { copySealCommand, openInServe } from '../handoff';
import type BowerbirdPlugin from '../main';
import { needsReview, sealDescription, sealLabel } from '../seal';
import { drawFindings } from './findings-modal';
import { fileLink } from './open';

export const NOTE_VIEW = 'bowerbird-note';

export interface NoteFacts {
	lint: Findings;
	links: Links;
	facts: Fact[];
}

export class NoteView extends ItemView {
	private serial = 0;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: BowerbirdPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return NOTE_VIEW;
	}

	getDisplayText(): string {
		return 'Bowerbird note';
	}

	getIcon(): string {
		return 'shield-check';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('bowerbird-note');
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const n = ++this.serial;
		const root = this.contentEl;
		const file = this.plugin.app.workspace.getActiveFile();
		if (!(file instanceof TFile) || file.extension !== 'md') {
			// keep showing the last note while another kind of view (this panel, a sidebar) has focus
			if (!root.hasChildNodes()) root.createDiv({ cls: 'bowerbird-quiet', text: 'Open a note to see what bowerbird knows about it.' });
			return;
		}
		if (!this.plugin.hasCollection()) {
			root.empty();
			root.createDiv({ cls: 'bowerbird-quiet', text: 'This vault has no bower.yaml yet. Run "Bowerbird: Set up this vault".' });
			return;
		}
		const collectionPath = this.plugin.toCollection(file.path);
		if (collectionPath === null) {
			root.empty();
			root.createEl('h4', { text: file.basename });
			root.createDiv({ cls: 'bowerbird-quiet', text: 'This note is outside the bowerbird collection.' });
			return;
		}
		if (root.dataset.file !== collectionPath) {
			root.empty();
			root.createDiv({ cls: 'bowerbird-quiet', text: 'Reading…' });
		}
		try {
			await this.plugin.ensure();
			const [seal, about] = await Promise.all([this.plugin.seals.get(collectionPath), this.plugin.aboutNote(file, collectionPath)]);
			if (n !== this.serial) return;
			root.empty();
			root.dataset.file = collectionPath;
			root.createEl('h4', { text: file.basename });

			const box = root.createDiv({ cls: `bowerbird-seal bowerbird-state-${seal.state}` });
			box.createDiv({ cls: 'bowerbird-seal-label', text: sealLabel(seal) });
			box.createDiv({ cls: 'bowerbird-seal-desc', text: sealDescription(seal) });
			if (needsReview(seal)) {
				const row = box.createDiv({ cls: 'bowerbird-buttons' });
				new ButtonComponent(row)
					.setButtonText('Open in serve to seal')
					.setCta()
					.onClick(() => this.plugin.attempt(() => openInServe(this.plugin, collectionPath)));
				new ButtonComponent(row)
					.setButtonText('Copy terminal command')
					.onClick(() => this.plugin.attempt(() => copySealCommand(this.plugin, collectionPath)));
			}

			this.drawLint(root, about.lint);
			this.drawLinks(root, about.links);
			this.drawFacts(root, about.facts, file.path);
		} catch (e) {
			if (n !== this.serial) return;
			root.empty();
			delete root.dataset.file;
			root.createDiv({ cls: 'bowerbird-error', text: 'Bowerbird could not read this note. See the notice for why.' });
			this.plugin.report(e, true);
		}
	}

	private section(root: HTMLElement, title: string, count: number): HTMLElement {
		const s = root.createDiv({ cls: 'bowerbird-section' });
		s.createDiv({ cls: 'bowerbird-section-title', text: `${title} (${count})` });
		return s;
	}

	private drawLint(root: HTMLElement, lint: Findings): void {
		const s = this.section(root, 'Lint', lint.findings.length);
		if (lint.findings.length === 0) s.createDiv({ cls: 'bowerbird-quiet', text: 'No findings.' });
		else drawFindings(s, this.plugin, lint.findings.map((f) => ({ ...f, file: '' })));
	}

	private drawLinks(root: HTMLElement, links: Links): void {
		const out = this.section(root, 'Links out', links.out.length);
		if (links.out.length === 0) out.createDiv({ cls: 'bowerbird-quiet', text: 'None.' });
		for (const l of links.out) {
			const row = out.createDiv({ cls: 'bowerbird-link' });
			if (l.exists === false) row.createSpan({ cls: 'bowerbird-broken', text: 'broken' });
			if (l.target && l.exists !== false) {
				fileLink(row, this.app, this.plugin.toVault(l.target), l.label, null, (e) => this.plugin.report(e));
			} else {
				row.createSpan({ cls: 'bowerbird-link-label', text: l.label });
			}
			if (l.target && l.target !== l.label && l.exists !== false) row.createSpan({ cls: 'bowerbird-link-target', text: ` → ${l.target}` });
		}
		const inbound = this.section(root, 'Links in', links.in.length);
		if (links.in.length === 0) inbound.createDiv({ cls: 'bowerbird-quiet', text: 'None.' });
		for (const f of links.in) {
			fileLink(inbound.createDiv({ cls: 'bowerbird-link' }), this.app, this.plugin.toVault(f), f, null, (e) => this.plugin.report(e));
		}
	}

	private drawFacts(root: HTMLElement, facts: Fact[], vaultPath: string): void {
		const s = this.section(root, 'Facts', facts.length);
		if (facts.length === 0) s.createDiv({ cls: 'bowerbird-quiet', text: 'No fact blocks.' });
		for (const f of facts) {
			const row = s.createDiv({ cls: `bowerbird-fact bowerbird-fact-${f.status}` });
			const head = row.createDiv({ cls: 'bowerbird-fact-head' });
			fileLink(head, this.app, vaultPath, `${f.kind} fact${f.id ? ` ${f.id}` : ''}`, f.line, (e) => this.plugin.report(e));
			head.createSpan({ cls: 'bowerbird-fact-status', text: f.at ? `${f.status} ${f.at}` : f.status });
			if (f.due) head.createSpan({ cls: 'bowerbird-stale', text: 'due' });
			row.createDiv({ cls: 'bowerbird-fact-source', text: f.source });
		}
	}
}
