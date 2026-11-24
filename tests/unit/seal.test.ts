import { describe, expect, it } from 'vitest';
import { needsReview, sealCommand, sealLabel, stateFromRow } from '../../src/seal';

describe('stateFromRow', () => {
	it('maps the trust tier and stale to a seal state', () => {
		expect(stateFromRow('human-reviewed', false)).toEqual({ state: 'sealed', reviewer: 'person' });
		expect(stateFromRow('machine-confirmed', false)).toEqual({ state: 'sealed', reviewer: 'machine' });
		expect(stateFromRow('unverified', true)).toEqual({ state: 'broken-seal', reviewer: null });
		expect(stateFromRow('unverified', false)).toEqual({ state: 'unsealed', reviewer: null });
		expect(stateFromRow(undefined, undefined)).toEqual({ state: 'unsealed', reviewer: null });
	});

	it('lets a seal that holds win over stale', () => {
		expect(stateFromRow('human-reviewed', true).state).toBe('sealed');
	});
});

describe('needsReview', () => {
	it('is true until a person has reviewed this version', () => {
		expect(needsReview({ state: 'sealed', reviewer: 'person' })).toBe(false);
		expect(needsReview({ state: 'sealed', reviewer: 'machine' })).toBe(true);
		expect(needsReview({ state: 'broken-seal', reviewer: null })).toBe(true);
		expect(needsReview({ state: 'unsealed', reviewer: null })).toBe(true);
		expect(needsReview({ state: 'derived', reviewer: null })).toBe(false);
		expect(needsReview({ state: 'outside', reviewer: null })).toBe(false);
	});
});

describe('sealLabel', () => {
	it('says the state in words', () => {
		expect(sealLabel({ state: 'broken-seal', reviewer: null })).toBe('Broken seal');
		expect(sealLabel({ state: 'sealed', reviewer: 'machine' })).toBe('Sealed by a machine check');
	});
});

describe('sealCommand (bbq Q6)', () => {
	it('is the terminal command, run from the collection root', () => {
		expect(sealCommand(['bowerbird-mcp'], '/home/ann/vault', 'notes/deploy.md', 'linux')).toBe(
			'cd /home/ann/vault && bowerbird-mcp seal notes/deploy.md --attest',
		);
	});

	it('quotes paths with spaces, and keeps a uvx command whole', () => {
		const uvx = ['/home/ann/.local/bin/uvx', '--from', 'bowerbird-mcp[obsidian]>=2.3,<3', 'bowerbird-mcp'];
		expect(sealCommand(uvx, '/home/ann/My Vault', "Ann's note.md", 'linux')).toBe(
			"cd '/home/ann/My Vault' && /home/ann/.local/bin/uvx --from 'bowerbird-mcp[obsidian]>=2.3,<3' bowerbird-mcp seal 'Ann'\\''s note.md' --attest",
		);
		expect(sealCommand(['bowerbird-mcp'], 'C:\\My Vault', 'a b.md', 'win32')).toBe('cd "C:\\My Vault" && bowerbird-mcp seal "a b.md" --attest');
	});
});
