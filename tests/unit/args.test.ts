import { describe, expect, it } from 'vitest';
import { configArgs, serveArgs, toolArgs } from '../../src/transport/args';

describe('toolArgs', () => {
	it('writes name=value words and asks for JSON', () => {
		expect(toolArgs('passages', { query: 'roll back a deploy', limit: 8 })).toEqual([
			'passages',
			'query=roll back a deploy',
			'limit=8',
			'output=json',
		]);
		expect(toolArgs('lint', { file: undefined, limit: 0 })).toEqual(['lint', 'limit=0', 'output=json']);
		expect(toolArgs('create', { path: '/v', apply: false })).toEqual(['create', 'path=/v', 'apply=false', 'output=json']);
	});

	it('keeps a query that starts with a dash from reading as a flag', () => {
		expect(toolArgs('passages', { query: '-rf' })[1]).toBe('query=-rf');
	});

	it('refuses tools and arguments it does not list', () => {
		expect(() => toolArgs('move', { file: 'a.md' })).toThrow();
		expect(() => toolArgs('passages', { bundle: 'x' })).toThrow();
		expect(() => toolArgs('new', { body: 'x' })).toThrow();
		expect(() => toolArgs('passages', { query: 'a\nb' })).toThrow(/line break/);
	});

	it('only runs factcheck for one file, never with an id or a result', () => {
		expect(() => toolArgs('factcheck', {})).toThrow();
		expect(() => toolArgs('factcheck', { file: 'a.md', id: '1' })).toThrow();
		expect(() => toolArgs('factcheck', { file: 'a.md', result: 'x' })).toThrow();
		expect(() => toolArgs('factcheck', { file: 'a.md', fetch: true })).toThrow();
	});
});

describe('no code path seals (bbq Q6)', () => {
	it('runs seal only as seal check=true', () => {
		expect(toolArgs('seal', { check: true })).toEqual(['seal', 'check=true', 'output=json']);
		expect(() => toolArgs('seal', { file: 'a.md' })).toThrow();
		expect(() => toolArgs('seal', { check: false })).toThrow();
		expect(() => toolArgs('seal', { check: true, file: 'a.md' })).toThrow();
		expect(() => toolArgs('seal', { check: true, by: 'process:x' })).toThrow();
		expect(() => toolArgs('seal', { check: true, decision: 'accepted' })).toThrow();
	});

	it('refuses seal by its other names, and provenance', () => {
		for (const t of ['ratify', 'verify', 'accepted', 'provenance', 'fact']) {
			expect(() => toolArgs(t, { file: 'a.md' })).toThrow();
		}
	});

	it('never passes --attest', () => {
		for (const t of ['passages', 'list', 'lint', 'new', 'create']) {
			const words = (() => {
				try {
					return toolArgs(t, { query: 'q', file: 'f', path: 'p' });
				} catch {
					return [];
				}
			})();
			expect(words.some((w) => w.includes('attest'))).toBe(false);
		}
	});
});

describe('serveArgs and configArgs', () => {
	it('builds serve calls with the port', () => {
		expect(serveArgs('start', 26937)).toEqual(['serve', 'start', '26937']);
		expect(serveArgs('start', 8080, true)).toEqual(['serve', 'start', '-f', '8080']);
		expect(() => serveArgs('restart' as never, 1)).toThrow();
	});

	it('names the collection', () => {
		expect(configArgs('/v')).toEqual(['--config', '/v']);
		expect(configArgs(null)).toEqual([]);
	});
});
