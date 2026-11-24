// The commands that run over the whole collection.

import { Notice } from 'obsidian';
import type BowerbirdPlugin from './main';
import { FindingsModal, SEAL_KINDS } from './ui/findings-modal';

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** `seal check=true`: what lacks a person's review (bbq Q4). It changes nothing. */
export async function filesLackingReview(plugin: BowerbirdPlugin): Promise<void> {
	await plugin.ensure();
	const notice = new Notice('Bowerbird: checking reviews…', 0);
	try {
		const r = await plugin.bb().lacking();
		const checked = r.checked !== null ? ` of ${plural(r.checked, 'file', 'files')} checked` : '';
		const summary = r.findings.length
			? `${plural(r.findings.length, 'file lacks', 'files lack')} a person's review${checked}. Open one, then seal it in serve or from a terminal.`
			: `Every file the seal policy covers has a person's review${checked}.`;
		new FindingsModal(plugin.app, plugin, 'Files lacking review', summary, r, SEAL_KINDS).open();
	} finally {
		notice.hide();
	}
}

/** `lint` over the whole collection (bbq Q4). It only reports; it never changes a file. */
export async function lintVault(plugin: BowerbirdPlugin): Promise<void> {
	await plugin.ensure();
	const notice = new Notice('Bowerbird: linting…', 0);
	try {
		const r = await plugin.bb().lint();
		const errors = r.findings.filter((f) => f.severity === 'error').length;
		const summary = r.findings.length
			? `${plural(r.findings.length, 'finding', 'findings')}, ${plural(errors, 'error', 'errors')}. Lint only reports; it changes nothing.`
			: 'No findings.';
		new FindingsModal(plugin.app, plugin, 'Lint', summary, r).open();
	} finally {
		notice.hide();
	}
}
