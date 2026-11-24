import { describe, expect, it } from 'vitest';
import { toConcepts, toCreated, toFacts, toFindings, toLinks, toPassages } from '../../src/transport/shapes';

describe('toPassages', () => {
	it('reads hits, joining bundle and file', () => {
		const p = toPassages({
			total: 1,
			gap: false,
			hits: [
				{ bundle: 'docs', file: 'deploy.md', line: 12, heading: 'Roll back', match: 100, title: 'Deploy', tier: 'unverified', stale: false, text: '<b>x</b>' },
			],
		});
		expect(p.gap).toBe(false);
		expect(p.hits[0]).toEqual({
			file: 'docs/deploy.md',
			line: 12,
			heading: 'Roll back',
			title: 'Deploy',
			tier: 'unverified',
			stale: false,
			match: 100,
			text: '<b>x</b>',
		});
	});

	it('reports a gap plainly', () => {
		expect(toPassages({ total: 0, gap: true, hits: [] })).toEqual({ gap: true, total: 0, hits: [] });
		expect(toPassages(null).gap).toBe(true);
		expect(toPassages({ hits: 'nonsense' }).hits).toEqual([]);
	});
});

describe('toConcepts', () => {
	it('reads list rows', () => {
		expect(toConcepts({ total: 1, concepts: [{ bundle: '.', file: 'a.md', title: 'A', tier: 'human-reviewed', stale: false }] })).toEqual([
			{ file: 'a.md', title: 'A', tier: 'human-reviewed', stale: false },
		]);
	});
});

describe('toFindings', () => {
	it('reads lint and seal check findings', () => {
		const f = toFindings({
			tool: 'seal',
			ok: false,
			files_checked: 3,
			total: 1,
			findings: [{ kind: 'unsigned', severity: 'error', bundle: '.', file: 'b.md', message: 'no review by a human', fix: 'a human reviews it' }],
		});
		expect(f).toEqual({
			ok: false,
			total: 1,
			checked: 3,
			findings: [{ file: 'b.md', kind: 'unsigned', severity: 'error', message: 'no review by a human', fix: 'a human reviews it' }],
		});
		expect(toFindings({ ok: true, findings: [] })).toEqual({ ok: true, total: 0, checked: null, findings: [] });
	});
});

describe('toLinks', () => {
	it('marks broken links and names the files', () => {
		const l = toLinks({
			bundle: '.',
			file: 'a.md',
			out: [
				{ link: 'b', target: { bundle: '.', file: 'sub/b.md' }, exists: true },
				{ link: 'Missing', target: { bundle: '.', file: 'Missing.md' }, exists: false },
				{ link: 'https://x.y/', target: null, exists: null },
				{ field: 'sources[0]', path: 'c.md', target: null, exists: false },
			],
			in: ['t.md'],
		});
		expect(l.out).toEqual([
			{ label: 'b', target: 'sub/b.md', exists: true },
			{ label: 'Missing', target: 'Missing.md', exists: false },
			{ label: 'https://x.y/', target: null, exists: null },
			{ label: 'sources[0]: c.md', target: null, exists: false },
		]);
		expect(l.in).toEqual(['t.md']);
		expect(toLinks({ bundle: 'docs', in: ['x.md'] }).in).toEqual(['docs/x.md']);
	});
});

describe('toFacts', () => {
	it('reads fact blocks with their last check', () => {
		expect(
			toFacts({
				calls: [],
				manual: [],
				blocks: [{ file: 'a.md', line: 4, id: '1', kind: 'file', source: 'run.sh#L1-2', status: 'checked', at: '2026-11-23', method: 'same words', due: false }],
			}),
		).toEqual([{ line: 4, id: '1', kind: 'file', source: 'run.sh#L1-2', status: 'checked', at: '2026-11-23', due: false }]);
		expect(toFacts({ blocks: [{}] })[0]?.status).toBe('unchecked');
	});
});

describe('toCreated', () => {
	it('lists the files a write changed or would change', () => {
		expect(toCreated({ edited: { '.': ['notes/x.md', 'log.md'] }, next: 'review' })).toEqual({ files: ['notes/x.md', 'log.md'], diff: '' });
		expect(toCreated({ would_edit: { docs: ['bower.yaml'] }, diff: '+format: obsidian' })).toEqual({
			files: ['docs/bower.yaml'],
			diff: '+format: obsidian',
		});
		expect(toCreated({ template: 'markdown', file: 'n.md' }).files).toEqual(['n.md']);
	});
});
