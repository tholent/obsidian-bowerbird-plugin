// The seal badge for the active note, in the status bar (bbq Q4). A click offers the hand-off: open the
// note in serve to seal it, or copy the terminal command (bbq Q6).

import { Menu, setIcon, TFile } from 'obsidian';
import { BowerbirdError, UnavailableError } from '../bowerbird';
import { copySealCommand, openInServe } from '../handoff';
import type BowerbirdPlugin from '../main';
import { needsReview, SealInfo, sealDescription, sealLabel } from '../seal';

const ICONS: Record<string, string> = {
	sealed: 'shield-check',
	'broken-seal': 'shield-alert',
	unsealed: 'shield',
	derived: 'cog',
	outside: 'circle-slash',
	waiting: 'loader',
	trouble: 'alert-triangle',
};

export class SealBadge {
	private readonly el: HTMLElement;
	private shown: { collectionPath: string; info: SealInfo } | null = null;
	private serial = 0;

	constructor(private readonly plugin: BowerbirdPlugin) {
		this.el = plugin.addStatusBarItem();
		this.el.addClass('bowerbird-badge', 'mod-clickable');
		plugin.registerDomEvent(this.el, 'click', (evt) => this.menu(evt));
		this.el.hide();
	}

	async refresh(): Promise<void> {
		const n = ++this.serial;
		const file = this.plugin.app.workspace.getActiveFile();
		if (!file || file.extension !== 'md') {
			this.shown = null;
			this.el.hide();
			return;
		}
		this.el.show();
		if (!this.plugin.hasCollection()) {
			this.shown = null;
			this.draw('trouble', 'No bower.yaml', 'This vault has no bower.yaml yet. Click to set it up.');
			return;
		}
		const collectionPath = this.plugin.toCollection(file.path);
		if (collectionPath === null) {
			this.shown = null;
			this.draw('outside', 'Not in the collection', 'This note is outside the bowerbird collection.');
			return;
		}
		if (!this.shown || this.shown.collectionPath !== collectionPath) this.draw('waiting', '…', 'Reading the seal');
		try {
			await this.plugin.ensure();
			const info = await this.plugin.seals.get(collectionPath);
			if (n !== this.serial) return;
			this.shown = { collectionPath, info };
			this.draw(info.state, sealLabel(info), `${sealDescription(info)} Click for what to do.`);
		} catch (e) {
			if (n !== this.serial) return;
			this.shown = null;
			const why = e instanceof UnavailableError ? 'bowerbird-mcp is not set up' : e instanceof BowerbirdError ? e.message : String(e);
			this.draw('trouble', 'Bowerbird: trouble', `${why}. Click to try again.`);
			this.plugin.report(e, true);
		}
	}

	private draw(state: string, text: string, tip: string): void {
		this.el.empty();
		this.el.removeClass(...Object.keys(ICONS).map((s) => `bowerbird-state-${s}`));
		this.el.addClass(`bowerbird-state-${state}`);
		setIcon(this.el.createSpan({ cls: 'bowerbird-badge-icon' }), ICONS[state] ?? 'shield');
		this.el.createSpan({ cls: 'bowerbird-badge-text', text });
		this.el.setAttr('aria-label', tip);
		this.el.setAttr('data-tooltip-position', 'top');
	}

	private menu(evt: MouseEvent): void {
		const menu = new Menu();
		const file = this.plugin.app.workspace.getActiveFile();
		if (!this.plugin.hasCollection()) {
			menu.addItem((i) => i.setTitle('Set up this vault').setIcon('wand').onClick(() => this.plugin.setUpVault()));
		} else if (this.shown && this.shown.info.state !== 'outside' && file instanceof TFile) {
			const { collectionPath, info } = this.shown;
			if (needsReview(info) || info.state === 'sealed') {
				menu.addItem((i) =>
					i
						.setTitle('Open in serve to seal')
						.setIcon('external-link')
						.onClick(() => this.plugin.attempt(() => openInServe(this.plugin, collectionPath))),
				);
				menu.addItem((i) =>
					i
						.setTitle('Copy terminal command')
						.setIcon('copy')
						.onClick(() => this.plugin.attempt(() => copySealCommand(this.plugin, collectionPath))),
				);
			}
		}
		menu.addItem((i) =>
			i
				.setTitle('Refresh')
				.setIcon('refresh-cw')
				.onClick(() => {
					this.plugin.forget();
					void this.refresh();
				}),
		);
		menu.showAtMouseEvent(evt);
	}
}
