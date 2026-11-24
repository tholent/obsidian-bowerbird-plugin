import { describe, expect, it } from 'vitest';
import { parseVersion, readOutcome, splitFix, versionInRange } from '../../src/transport/output';

describe('readOutcome', () => {
	it('reads JSON on exit 0', () => {
		expect(readOutcome(0, '{"gap": true, "hits": []}', '')).toEqual({ ok: true, data: { gap: true, hits: [] }, code: 0 });
	});

	it('treats exit 1 with JSON as findings, not a failure', () => {
		const r = readOutcome(1, '{"ok": false, "findings": [{"kind": "unsigned"}]}', '');
		expect(r.ok).toBe(true);
		expect(r.ok && r.code).toBe(1);
	});

	it("reports bowerbird's own error and its fix", () => {
		const r = readOutcome(2, '', "error: 'zz.md' is not in the collection | fix: pass a path inside bundle= .\n");
		expect(r).toEqual({ ok: false, failure: { message: "'zz.md' is not in the collection", fix: 'pass a path inside bundle= .' } });
	});

	it('reads an error printed to stdout (serve does that)', () => {
		const r = readOutcome(1, 'error: port 26937 is in use by something else | fix: pick another port', '');
		expect(r).toEqual({ ok: false, failure: { message: 'port 26937 is in use by something else', fix: 'pick another port' } });
	});

	it('says something plain when there is no error line', () => {
		const r = readOutcome(139, '', 'Traceback\nboom');
		expect(r.ok).toBe(false);
		expect(!r.ok && r.failure.message).toMatch(/exited with code 139: Traceback boom/);
		const s = readOutcome(null, '', '');
		expect(!s.ok && s.failure.message).toBe('bowerbird-mcp was stopped');
	});
});

describe('splitFix', () => {
	it('keeps a message without a fix whole', () => {
		expect(splitFix('error: something broke')).toEqual({ message: 'something broke' });
	});
});

describe('version', () => {
	it('reads the version line', () => {
		expect(parseVersion('bowerbird-mcp 2.3.0')).toEqual([2, 3, 0]);
		expect(parseVersion('bowerbird-mcp 2.4.1 (development, git abc)')).toEqual([2, 4, 1]);
		expect(parseVersion('nope')).toBeNull();
	});

	it('accepts >=2.3,<3 only', () => {
		expect(versionInRange([2, 3, 0])).toBe(true);
		expect(versionInRange([2, 9, 9])).toBe(true);
		expect(versionInRange([2, 2, 9])).toBe(false);
		expect(versionInRange([3, 0, 0])).toBe(false);
	});
});
