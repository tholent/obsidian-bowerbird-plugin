// A list of findings from `seal check=true` or `lint`: each with its file (a click opens it), what is
// wrong and bowerbird's fix, all shown as text.

import { App, Modal } from 'obsidian';
import type { Finding, Findings } from '../bowerbird';
import type BowerbirdPlugin from '../main';
import { fileLink } from './open';

const SHOWN = 500;

export const SEAL_KINDS: Record<string, string> = {
	unsigned: 'No review',
	stale_signature: 'Edited since review',
	short_of_quorum: 'Needs more reviewers',
	claims_accepted: 'Says accepted, not reviewed',
	orphan_signature: 'Review of a file that is gone',
	unreadable: 'Not text',
};

export function drawFindings(parent: HTMLElement, plugin: BowerbirdPlugin, findings: Finding[], kinds: Record<string, string> = {}): void {
	const list = parent.createDiv({ cls: 'bowerbird-findings' });
	for (const f of findings.slice(0, SHOWN)) {
		const row = list.createDiv({ cls: `bowerbird-finding bowerbird-severity-${f.severity || 'warning'}` });
		const head = row.createDiv({ cls: 'bowerbird-finding-head' });
		head.createSpan({ cls: 'bowerbird-kind', text: kinds[f.kind] ?? f.kind });
		if (f.file) fileLink(head, plugin.app, plugin.toVault(f.file), f.file, null, (e) => plugin.report(e));
		if (f.message) row.createDiv({ cls: 'bowerbird-finding-message', text: f.message });
		if (f.fix) row.createDiv({ cls: 'bowerbird-finding-fix', text: `Fix: ${f.fix}` });
	}
	if (findings.length > SHOWN) list.createDiv({ cls: 'bowerbird-quiet', text: `And ${findings.length - SHOWN} more.` });
}

export class FindingsModal extends Modal {
	constructor(
		app: App,
		private readonly plugin: BowerbirdPlugin,
		private readonly heading: string,
		private readonly summary: string,
		private readonly result: Findings,
		private readonly kinds: Record<string, string> = {},
	) {
		super(app);
	}

	onOpen() {
		this.setTitle(this.heading);
		this.modalEl.addClass('bowerbird-findings-modal');
		this.contentEl.createEl('p', { text: this.summary });
		drawFindings(this.contentEl, this.plugin, this.result.findings, this.kinds);
		// a click on a file opens it: close the list so the note is in view
		this.contentEl.addEventListener('click', (evt) => {
			const t = evt.target as Node | null;
			if (t?.instanceOf(HTMLElement) && t.closest('a.bowerbird-file')) this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
