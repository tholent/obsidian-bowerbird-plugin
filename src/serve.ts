// Talking to a running `bowerbird-mcp serve` on 127.0.0.1, read-only (bbq Q11). Two GET requests and
// nothing else: is it there, and does it serve this note. The plugin never calls a route that writes.

import http from 'http';
import { urlPath } from './paths';

export type Answer = 'serves-it' | 'other-collection' | 'down';

function get(port: number, path: string, timeoutMs: number): Promise<number | null> {
	return new Promise((resolve) => {
		const req = http.get({ host: '127.0.0.1', port, path, timeout: timeoutMs }, (res) => {
			res.resume();
			resolve(res.statusCode ?? null);
		});
		req.on('timeout', () => {
			req.destroy();
			resolve(null);
		});
		req.on('error', () => resolve(null));
	});
}

/** Is serve on the port, and does it know this file? `/_api/status` is a 400 for a file outside its collection. */
export async function ask(port: number, collectionPath: string, timeoutMs = 1500): Promise<Answer> {
	const code = await get(port, `/_api/status?f=${encodeURIComponent(collectionPath)}`, timeoutMs);
	if (code === null) return 'down';
	return code === 200 ? 'serves-it' : 'other-collection';
}

/** Wait for serve to answer after a start: a bounded wait, not polling. */
export async function waitFor(port: number, collectionPath: string, totalMs = 20000): Promise<Answer> {
	const until = Date.now() + totalMs;
	let last: Answer = 'down';
	while (Date.now() < until) {
		last = await ask(port, collectionPath, 1000);
		if (last !== 'down') return last;
		await new Promise((r) => window.setTimeout(r, 500));
	}
	return last;
}

export function noteUrl(port: number, collectionPath: string): string {
	return `http://127.0.0.1:${port}/${urlPath(collectionPath)}`;
}
