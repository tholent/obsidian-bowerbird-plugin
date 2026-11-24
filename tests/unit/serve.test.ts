import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Bowerbird, Concept } from '../../src/bowerbird';
import { SealIndex } from '../../src/seal-index';
import { ask, noteUrl } from '../../src/serve';

describe('noteUrl', () => {
	it("is the note's page on 127.0.0.1", () => {
		expect(noteUrl(26937, 'My Notes/deploy.md')).toBe('http://127.0.0.1:26937/My%20Notes/deploy.md');
	});
});

describe('ask', () => {
	let server: http.Server;
	let port = 0;
	const seen: { url?: string; host?: string; method?: string }[] = [];

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			seen.push({ url: req.url, host: req.headers.host, method: req.method });
			const known = req.url === '/_api/status?f=notes%2Fa.md';
			res.writeHead(known ? 200 : 400, { 'Content-Type': 'application/json' });
			res.end(known ? '{"file": "notes/a.md"}' : '{"error": "not a file of the collection"}');
		});
		await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(() => new Promise<void>((r) => server.close(() => r())));

	it('knows when serve has the note, with a GET and the Host serve expects', async () => {
		expect(await ask(port, 'notes/a.md')).toBe('serves-it');
		expect(seen.at(-1)).toEqual({ url: '/_api/status?f=notes%2Fa.md', host: `127.0.0.1:${port}`, method: 'GET' });
	});

	it('knows when serve is serving another collection', async () => {
		expect(await ask(port, 'elsewhere.md')).toBe('other-collection');
	});

	it('knows when nothing answers', async () => {
		const free = http.createServer();
		await new Promise<void>((r) => free.listen(0, '127.0.0.1', r));
		const gone = (free.address() as AddressInfo).port;
		await new Promise<void>((r) => free.close(() => r()));
		expect(await ask(gone, 'a.md', 500)).toBe('down');
	});
});

describe('SealIndex', () => {
	function source(rows: Concept[] | Error) {
		let calls = 0;
		const bb = {
			concepts: () => {
				calls++;
				return rows instanceof Error ? Promise.reject(rows) : Promise.resolve(rows);
			},
		} as unknown as Bowerbird;
		return { bb, calls: () => calls };
	}

	it('lists once, until invalidated', async () => {
		const s = source([
			{ file: 'a.md', title: 'A', tier: 'human-reviewed', stale: false },
			{ file: 'b.md', title: 'B', tier: 'unverified', stale: true },
		]);
		const idx = new SealIndex(() => s.bb);
		expect(await idx.get('a.md')).toEqual({ state: 'sealed', reviewer: 'person' });
		expect(await idx.get('b.md')).toEqual({ state: 'broken-seal', reviewer: null });
		expect(await idx.get('c.canvas')).toEqual({ state: 'outside', reviewer: null });
		expect(s.calls()).toBe(1);
		idx.invalidate();
		await idx.get('a.md');
		expect(s.calls()).toBe(2);
	});

	it('does not keep a failure', async () => {
		const s = source(new Error('boom'));
		const idx = new SealIndex(() => s.bb);
		await expect(idx.get('a.md')).rejects.toThrow('boom');
		await expect(idx.get('a.md')).rejects.toThrow('boom');
		expect(s.calls()).toBe(2);
	});
});
