// "Set up this vault" (bbq Q10): for a vault with no bower.yaml. bowerbird's `create` runs first as a
// preview, with format obsidian; the plugin shows what it would write, and writes only after the person's
// OK. It never runs on its own.

import { App, ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import type { Created } from '../bowerbird';
import type BowerbirdPlugin from '../main';

const DIFF_SHOWN = 20000;

export class SetupModal extends Modal {
	private about = 'My notes.';
	private preview: HTMLElement | null = null;
	private previewed: string | null = null;

	constructor(
		app: App,
		private readonly plugin: BowerbirdPlugin,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle('Set up this vault for Bowerbird');
		this.modalEl.addClass('bowerbird-setup-modal');
		const { contentEl } = this;
		contentEl.createEl('p', {
			text: 'This vault has no bower.yaml, so bowerbird does not know it yet. Bowerbird can make one, with format: obsidian. First it shows what it would write; nothing is written until you choose "Write these files".',
		});
		new Setting(contentEl)
			.setName('About')
			.setDesc('One sentence: what this vault holds.')
			.addText((t) =>
				t.setValue(this.about).onChange((v) => {
					this.about = v;
					this.previewed = null; // a changed answer needs a new preview
				}),
			);
		new Setting(contentEl).addButton((b) =>
			b
				.setButtonText('Preview')
				.setCta()
				.onClick(() => void this.plugin.attempt(() => this.showPreview())),
		);
		this.preview = contentEl.createDiv({ cls: 'bowerbird-setup-preview' });
	}

	private async showPreview(): Promise<void> {
		const about = this.about.trim();
		if (!about) {
			new Notice('Bowerbird: say in one sentence what this vault holds.');
			return;
		}
		await this.plugin.ensure();
		const plan = await this.plugin.bb().create(about, false);
		this.previewed = about;
		this.drawPreview(plan);
	}

	private drawPreview(plan: Created): void {
		const box = this.preview;
		if (!box) return;
		box.empty();
		if (plan.files.length) {
			box.createEl('p', { text: 'Bowerbird would write:' });
			const ul = box.createEl('ul');
			for (const f of plan.files) ul.createEl('li', { text: f });
		}
		if (plan.notes.length) {
			const ul = box.createEl('ul');
			for (const n of plan.notes) ul.createEl('li', { text: n });
		}
		const detail = plan.diff || (plan.files.length ? '' : plan.raw);
		if (detail) {
			const shown = detail.length > DIFF_SHOWN ? `${detail.slice(0, DIFF_SHOWN)}\n…` : detail;
			box.createEl('pre', { cls: 'bowerbird-diff' }).createEl('code', { text: shown });
		}
		const row = box.createDiv({ cls: 'modal-button-container' });
		new ButtonComponent(row)
			.setButtonText('Write these files')
			.setCta()
			.onClick(() => void this.plugin.attempt(() => this.write()));
		new ButtonComponent(row).setButtonText('Cancel').onClick(() => this.close());
	}

	private async write(): Promise<void> {
		if (this.previewed === null || this.previewed !== this.about.trim()) {
			new Notice('Bowerbird: preview again first.');
			return;
		}
		const done = await this.plugin.bb().create(this.previewed, true);
		this.close();
		this.plugin.reset();
		await this.plugin.refreshAll();
		const what = done.files.length ? done.files.join(', ') : 'the files it showed';
		new Notice(`Bowerbird: wrote ${what}. The vault is a bowerbird collection now.`, 10000);
	}

	onClose() {
		this.contentEl.empty();
	}
}
