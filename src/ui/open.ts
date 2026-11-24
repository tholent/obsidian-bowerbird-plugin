import { App, MarkdownView } from 'obsidian';

/** Open a vault note, at a line (1 = the first) when given. */
export async function openAt(app: App, vaultPath: string, line: number | null): Promise<void> {
	const file = app.vault.getFileByPath(vaultPath);
	if (!file) throw new Error(`${vaultPath} is not in the vault`);
	const leaf = app.workspace.getLeaf(false);
	const at = line !== null && line > 0 ? line - 1 : null;
	await leaf.openFile(file, at === null ? { active: true } : { active: true, eState: { line: at } });
	if (at !== null && leaf.view instanceof MarkdownView) {
		const editor = leaf.view.editor;
		const pos = { line: Math.min(at, editor.lastLine()), ch: 0 };
		editor.setCursor(pos);
		editor.scrollIntoView({ from: pos, to: pos }, true);
	}
}

/** Trust tiers, in the words the plugin shows. */
export function tierWords(tier: string): string {
	switch (tier) {
		case 'human-reviewed':
			return 'reviewed by a person';
		case 'machine-confirmed':
			return 'machine-confirmed';
		case 'unverified':
			return 'unverified';
		default:
			return tier || 'unknown trust';
	}
}

/** A link-like line for a file: clickable when the file is in the vault, plain text when it is not. */
export function fileLink(
	parent: HTMLElement,
	app: App,
	vaultPath: string | null,
	text: string,
	line: number | null,
	onError: (e: unknown) => void,
): HTMLElement {
	if (vaultPath === null) {
		return parent.createSpan({ cls: 'bowerbird-file bowerbird-file-outside', text, attr: { 'aria-label': 'Outside this vault' } });
	}
	const a = parent.createEl('a', { cls: 'bowerbird-file', text, href: '#' });
	a.addEventListener('click', (evt) => {
		evt.preventDefault();
		openAt(app, vaultPath, line).catch(onError);
	});
	return a;
}
