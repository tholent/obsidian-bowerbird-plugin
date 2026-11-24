// The seal state of a note, as the badge shows it (bbq Q4, Q6). The command line has no per-file state
// tool, so the state comes from `list`: its trust tier (from the reviews that still hold) and `stale`
// (a review that no longer holds, because the note was edited since). Pure.

import { quoteWord } from './transport/command';

export type SealState = 'sealed' | 'broken-seal' | 'unsealed' | 'derived' | 'outside';
export type Reviewer = 'person' | 'machine' | null;

export interface SealInfo {
	state: SealState;
	reviewer: Reviewer;
}

/** The state for one row of `list`: tier is unverified, machine-confirmed or human-reviewed. */
export function stateFromRow(tier: unknown, stale: unknown): SealInfo {
	if (tier === 'human-reviewed') return { state: 'sealed', reviewer: 'person' };
	if (tier === 'machine-confirmed') return { state: 'sealed', reviewer: 'machine' };
	if (stale === true) return { state: 'broken-seal', reviewer: null };
	return { state: 'unsealed', reviewer: null };
}

/** Needs a person's review: unsealed, a broken seal, or sealed only by a machine. */
export function needsReview(info: SealInfo): boolean {
	return info.state === 'unsealed' || info.state === 'broken-seal' || (info.state === 'sealed' && info.reviewer === 'machine');
}

export function sealLabel(info: SealInfo): string {
	switch (info.state) {
		case 'sealed':
			return info.reviewer === 'machine' ? 'Sealed by a machine check' : 'Sealed';
		case 'broken-seal':
			return 'Broken seal';
		case 'unsealed':
			return 'Unsealed';
		case 'derived':
			return 'Derived';
		case 'outside':
			return 'Not in the collection';
	}
}

export function sealDescription(info: SealInfo): string {
	switch (info.state) {
		case 'sealed':
			return info.reviewer === 'machine'
				? 'A machine check confirmed this version. No person has reviewed it.'
				: 'A person reviewed this exact version.';
		case 'broken-seal':
			return 'A person reviewed it, and it has been edited since. The review no longer holds.';
		case 'unsealed':
			return 'No one has reviewed this note.';
		case 'derived':
			return 'Built from the code, so it is never sealed.';
		case 'outside':
			return 'This note is not in the bowerbird collection.';
	}
}

/** The command a person runs in a terminal to seal the note themselves (bbq Q6): from the collection root. */
export function sealCommand(cmd: string[], root: string, file: string, platform: string): string {
	const q = (w: string) => quoteWord(w, platform);
	const run = [...cmd.map(q), 'seal', q(file), '--attest'].join(' ');
	return `cd ${q(root)} && ${run}`;
}
