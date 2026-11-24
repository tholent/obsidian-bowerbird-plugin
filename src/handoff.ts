// Handing a note to a person to seal (bbq Q6, Q11). The plugin never seals: it opens the note's page in
// `bowerbird-mcp serve`, where the person seals it in the browser, or gives them the terminal command.

import { Notice } from 'obsidian';
import { BowerbirdError } from './bowerbird';
import type BowerbirdPlugin from './main';
import { ask, noteUrl, waitFor } from './serve';
import { CommandModal, confirm } from './ui/modals';

export async function openInServe(plugin: BowerbirdPlugin, collectionPath: string): Promise<void> {
	const port = plugin.settings.servePort;
	let answer = await ask(port, collectionPath);
	if (answer === 'down') {
		const yes = await confirm(
			plugin.app,
			'Start serve?',
			`Serve is not running on port ${port}. Start it now? It keeps running after Obsidian closes. The command "Bowerbird: Stop serve" ends it.`,
			'Start serve',
		);
		if (!yes) return;
		const started = await plugin.bb().serve('start');
		if (started.missingExtra) {
			new CommandModal(
				plugin.app,
				'Serve is not installed',
				"Serve needs bowerbird-mcp's serve extra. Install it with: uv tool install 'bowerbird-mcp[obsidian,serve]'. Or seal this note from a terminal with this command:",
				await plugin.bb().sealCommand(collectionPath),
			).open();
			return;
		}
		if (!started.ok) throw new BowerbirdError({ message: started.message || 'serve did not start' });
		new Notice('Bowerbird: starting serve…');
		answer = await waitFor(port, collectionPath);
	}
	if (answer === 'down') {
		throw new BowerbirdError({ message: `serve did not answer on port ${port}`, fix: 'run bowerbird-mcp serve status in a terminal' });
	}
	if (answer === 'other-collection') {
		throw new BowerbirdError({
			message: `serve on port ${port} does not know ${collectionPath}: it may be serving another collection`,
			fix: 'run "Bowerbird: Stop serve" and try again, or set another serve port',
		});
	}
	window.open(noteUrl(port, collectionPath));
}

export async function copySealCommand(plugin: BowerbirdPlugin, collectionPath: string): Promise<void> {
	const command = await plugin.bb().sealCommand(collectionPath);
	await navigator.clipboard.writeText(command);
	new Notice(`Bowerbird: copied. Run it in a terminal; the seal records you, so it needs you there.\n${command}`, 10000);
}

export async function stopServe(plugin: BowerbirdPlugin): Promise<void> {
	const r = await plugin.bb().serve('stop');
	if (!r.ok) throw new BowerbirdError({ message: r.message || 'serve did not stop' });
	new Notice(`Bowerbird: ${r.message || 'serve stopped'}`);
}
