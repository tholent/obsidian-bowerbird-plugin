// "New note from template" (bbq Q4): bowerbird's `new` writes the note from a template; the plugin then
// opens it. `new` refuses a file that exists, so nothing is overwritten.

import { App, Modal, Notice, Setting } from 'obsidian';
import type BowerbirdPlugin from '../main';
import { newNotePath } from '../paths';
import { openAt } from './open';

const TEMPLATES: Record<string, string> = {
	'': "The folder's own",
	markdown: 'Markdown: title and tags',
	adr: 'ADR: a decision record, dated today',
	okf: 'OKF: type, title, description and status',
};

export class NewNoteModal extends Modal {
	private folder: string;
	private name = '';
	private title = '';
	private template = '';

	constructor(
		app: App,
		private readonly plugin: BowerbirdPlugin,
	) {
		super(app);
		this.folder = app.workspace.getActiveFile()?.parent?.path ?? '';
		if (this.folder === '/') this.folder = '';
	}

	onOpen() {
		this.setTitle('New note from template');
		const { contentEl } = this;
		new Setting(contentEl)
			.setName('Folder')
			.setDesc('From the vault root. Empty is the root.')
			.addText((t) => t.setValue(this.folder).onChange((v) => (this.folder = v)));
		new Setting(contentEl)
			.setName('File name')
			.setDesc('.md is added.')
			.addText((t) => {
				t.setPlaceholder('deploy-runbook').onChange((v) => (this.name = v));
				window.setTimeout(() => t.inputEl.focus(), 0);
			});
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Leave empty to use the file name.')
			.addText((t) => t.onChange((v) => (this.title = v)));
		new Setting(contentEl).setName('Template').addDropdown((d) => d.addOptions(TEMPLATES).setValue('').onChange((v) => (this.template = v)));
		new Setting(contentEl).addButton((b) =>
			b
				.setButtonText('Create')
				.setCta()
				.onClick(() => void this.plugin.attempt(() => this.create())),
		);
	}

	private async create(): Promise<void> {
		const vaultPath = newNotePath(this.folder, this.name);
		if (!vaultPath) {
			new Notice('Bowerbird: give the note a file name.');
			return;
		}
		if (this.app.vault.getAbstractFileByPath(vaultPath)) {
			new Notice(`Bowerbird: ${vaultPath} already exists.`);
			return;
		}
		const collectionPath = this.plugin.toCollection(vaultPath);
		if (collectionPath === null) {
			new Notice('Bowerbird: that folder is outside the collection.');
			return;
		}
		await this.plugin.ensure();
		await this.plugin.bb().newNote(collectionPath.replace(/\.md$/i, ''), this.template, this.title.trim());
		this.close();
		// the note was written outside Obsidian: wait, briefly, for the vault to see it
		for (let i = 0; i < 20 && !this.app.vault.getFileByPath(vaultPath); i++) {
			await new Promise((r) => window.setTimeout(r, 150));
		}
		await openAt(this.app, vaultPath, null);
	}

	onClose() {
		this.contentEl.empty();
	}
}
