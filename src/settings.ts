import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type BowerbirdPlugin from './main';

export interface BowerbirdSettings {
	/** The full command that runs bowerbird-mcp; empty means find it (bbq Q9). */
	command: string;
	/** A bower.yaml or the folder holding one; empty means the vault root. */
	collection: string;
	/** The port `bowerbird-mcp serve` listens on. */
	servePort: number;
	/** How many passages a search shows. */
	searchLimit: number;
	/** Let search match by meaning. Only for a collection whose model is already downloaded. */
	allowSemantic: boolean;
}

export const DEFAULT_SETTINGS: BowerbirdSettings = {
	command: '',
	collection: '',
	servePort: 26937,
	searchLimit: 8,
	allowSemantic: false,
};

export class BowerbirdSettingTab extends PluginSettingTab {
	plugin: BowerbirdPlugin;

	constructor(app: App, plugin: BowerbirdPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Command',
				desc: "Leave empty to find bowerbird-mcp on your PATH, in ~/.local/bin, or through uvx. Or give the full command, such as: uvx --from 'bowerbird-mcp[obsidian]>=2.3,<3' bowerbird-mcp",
				control: { type: 'text', key: 'command', placeholder: 'bowerbird-mcp' },
			},
			{
				name: 'Collection',
				desc: 'Leave empty to use the bower.yaml at the root of this vault. Or name a bower.yaml, or the folder holding one: a full path, a path starting with ~, or a path from the vault root.',
				control: { type: 'text', key: 'collection', placeholder: 'bower.yaml' },
			},
			{
				name: 'Serve port',
				desc: 'The port bowerbird-mcp serve listens on, where you seal notes in the browser.',
				control: { type: 'number', key: 'servePort', min: 1, max: 65535, step: 1, defaultValue: DEFAULT_SETTINGS.servePort },
			},
			{
				name: 'Passages per search',
				desc: 'How many passages a search shows.',
				control: { type: 'slider', key: 'searchLimit', min: 3, max: 30, step: 1 },
			},
			{
				name: 'Allow search by meaning',
				desc: "Off by default: the plugin never starts semantic search's one-time model download. Turn this on only if this collection sets semantic: true and its model is already downloaded.",
				control: { type: 'toggle', key: 'allowSemantic' },
			},
		];
	}
}
