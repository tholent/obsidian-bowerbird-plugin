import { App, ButtonComponent, Modal, Notice } from 'obsidian';

/** Ask a yes-or-no question; resolves true on yes. */
export function confirm(app: App, title: string, body: string, yes: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new (class extends Modal {
			answered = false;
			onOpen() {
				this.setTitle(title);
				this.contentEl.createEl('p', { text: body });
				const row = this.contentEl.createDiv({ cls: 'modal-button-container' });
				new ButtonComponent(row)
					.setButtonText(yes)
					.setCta()
					.onClick(() => {
						this.answered = true;
						resolve(true);
						this.close();
					});
				new ButtonComponent(row).setButtonText('Cancel').onClick(() => this.close());
			}
			onClose() {
				this.contentEl.empty();
				if (!this.answered) resolve(false);
			}
		})(app);
		modal.open();
	});
}

/** Show a command for a person to run themselves, with a button that copies it. */
export class CommandModal extends Modal {
	constructor(
		app: App,
		private readonly heading: string,
		private readonly intro: string,
		private readonly command: string,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle(this.heading);
		this.contentEl.createEl('p', { text: this.intro });
		this.contentEl.createEl('pre', { cls: 'bowerbird-command' }).createEl('code', { text: this.command });
		const row = this.contentEl.createDiv({ cls: 'modal-button-container' });
		new ButtonComponent(row)
			.setButtonText('Copy')
			.setCta()
			.onClick(async () => {
				await navigator.clipboard.writeText(this.command);
				new Notice('Copied.');
				this.close();
			});
		new ButtonComponent(row).setButtonText('Close').onClick(() => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}
}
