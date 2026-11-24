import path from 'path';
import { describe, expect, it } from 'vitest';
import { collectionRoot, joinBundle, toCollection, toVault, urlPath } from '../../src/paths';

const posix = path.posix;
const win = path.win32;

describe('vault and collection paths', () => {
	it('are the same when the vault is the collection', () => {
		const roots = { vault: '/home/ann/vault', collection: '/home/ann/vault' };
		expect(toCollection('notes/a.md', roots, posix)).toBe('notes/a.md');
		expect(toVault('notes/a.md', roots, posix)).toBe('notes/a.md');
	});

	it('add the vault folder when the collection is above the vault', () => {
		const roots = { vault: '/repo/vault', collection: '/repo' };
		expect(toCollection('a.md', roots, posix)).toBe('vault/a.md');
		expect(toVault('vault/a.md', roots, posix)).toBe('a.md');
		expect(toVault('README.md', roots, posix)).toBeNull();
	});

	it('leave out notes outside a collection inside the vault', () => {
		const roots = { vault: '/v', collection: '/v/work' };
		expect(toCollection('work/a.md', roots, posix)).toBe('a.md');
		expect(toCollection('home/b.md', roots, posix)).toBeNull();
		expect(toVault('a.md', roots, posix)).toBe('work/a.md');
	});

	it('use forward slashes on Windows', () => {
		const roots = { vault: 'C:\\Users\\ann\\vault', collection: 'C:\\Users\\ann' };
		expect(toCollection('notes/a.md', roots, win)).toBe('vault/notes/a.md');
		expect(toVault('vault/notes/a.md', roots, win)).toBe('notes/a.md');
	});

	it('never map a file to the vault folder itself', () => {
		expect(toVault('vault', { vault: '/r/vault', collection: '/r' }, posix)).toBeNull();
	});
});

describe('joinBundle', () => {
	it('joins a bundle and a file', () => {
		expect(joinBundle('.', 'a.md')).toBe('a.md');
		expect(joinBundle('', 'a.md')).toBe('a.md');
		expect(joinBundle(undefined, 'a.md')).toBe('a.md');
		expect(joinBundle('docs', 'a.md')).toBe('docs/a.md');
		expect(joinBundle('docs/', 'x/a.md')).toBe('docs/x/a.md');
	});
});

describe('collectionRoot', () => {
	it('is the vault unless a setting names another', () => {
		expect(collectionRoot('', '/v', '/home/ann', posix)).toBe('/v');
		expect(collectionRoot('bower.yaml', '/v', '/home/ann', posix)).toBe('/v');
		expect(collectionRoot('work', '/v', '/home/ann', posix)).toBe('/v/work');
		expect(collectionRoot('work/bower.yaml', '/v', '/home/ann', posix)).toBe('/v/work');
		expect(collectionRoot('../bower.yaml', '/r/v', '/home/ann', posix)).toBe('/r');
		expect(collectionRoot('~/notes', '/v', '/home/ann', posix)).toBe('/home/ann/notes');
		expect(collectionRoot('/srv/kb/bower.yaml', '/v', '/home/ann', posix)).toBe('/srv/kb');
		expect(collectionRoot('C:\\kb\\bower.yaml', 'D:\\v', 'C:\\Users\\ann', win)).toBe('C:\\kb');
	});
});

describe('urlPath', () => {
	it('quotes each segment', () => {
		expect(urlPath('My Notes/a b.md')).toBe('My%20Notes/a%20b.md');
		expect(urlPath('notes/#1?.md')).toBe('notes/%231%3F.md');
	});
});
