// The seal state of every note, from one `list` call, kept until something changes. Obsidian does not
// watch hidden files such as .waxseals.yaml, so a seal made in serve or a terminal is noticed when the
// window gets focus back (see main.ts), not by polling.

import type { Bowerbird } from './bowerbird';
import { SealInfo, stateFromRow } from './seal';

export class SealIndex {
	private load: Promise<Map<string, SealInfo>> | null = null;

	constructor(private readonly source: () => Bowerbird) {}

	invalidate(): void {
		this.load = null;
	}

	/** The state of one collection path; `outside` when bowerbird does not list it. */
	async get(collectionPath: string): Promise<SealInfo> {
		const map = await this.all();
		return map.get(collectionPath) ?? { state: 'outside', reviewer: null };
	}

	all(): Promise<Map<string, SealInfo>> {
		if (!this.load) {
			const load = this.fetch();
			this.load = load;
			load.catch(() => {
				if (this.load === load) this.load = null; // a failure is not kept: the next refresh asks again
			});
		}
		return this.load;
	}

	private async fetch(): Promise<Map<string, SealInfo>> {
		const rows = await this.source().concepts();
		return new Map(rows.map((r) => [r.file, stateFromRow(r.tier, r.stale)]));
	}
}
