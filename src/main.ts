import { Plugin } from 'obsidian';
import { BowerbirdSettingTab, BowerbirdSettings, DEFAULT_SETTINGS } from './settings';

export default class BowerbirdPlugin extends Plugin {
	settings!: BowerbirdSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new BowerbirdSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<BowerbirdSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
