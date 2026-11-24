// Turning bowerbird's JSON into the plugin's own shapes. Everything here is data from another program:
// each field is checked, and a missing or odd one becomes an empty value, never a crash.

import type { Concept, Created, Fact, Finding, Findings, Hit, LinkOut, Links, Passages } from '../bowerbird';
import { joinBundle } from '../paths';

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
	return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
}

function arr(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
	if (typeof v === 'string') return v;
	if (typeof v === 'number' || typeof v === 'boolean') return String(v);
	return '';
}

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function path(o: Obj): string {
	return joinBundle(str(o.bundle), str(o.file));
}

export function toPassages(data: unknown): Passages {
	const d = obj(data);
	const hits: Hit[] = arr(d.hits).map((h) => {
		const o = obj(h);
		return {
			file: path(o),
			line: num(o.line),
			heading: str(o.heading),
			title: str(o.title),
			tier: str(o.tier),
			stale: o.stale === true,
			match: num(o.match),
			text: str(o.text),
		};
	});
	return { gap: d.gap === true || hits.length === 0, total: num(d.total) ?? hits.length, hits };
}

export function toConcepts(data: unknown): Concept[] {
	return arr(obj(data).concepts).map((c) => {
		const o = obj(c);
		return { file: path(o), title: str(o.title), tier: str(o.tier), stale: o.stale === true };
	});
}

export function toFindings(data: unknown): Findings {
	const d = obj(data);
	const findings: Finding[] = arr(d.findings).map((f) => {
		const o = obj(f);
		return { file: path(o), kind: str(o.kind), severity: str(o.severity), message: str(o.message), fix: str(o.fix) };
	});
	return { ok: d.ok !== false, total: num(d.total) ?? findings.length, findings, checked: num(d.files_checked) };
}

export function toLinks(data: unknown): Links {
	const d = obj(data);
	const out: LinkOut[] = arr(d.out).map((l) => {
		const o = obj(l);
		const t = o.target === null || o.target === undefined ? null : path(obj(o.target));
		const label = o.field !== undefined ? `${str(o.field)}: ${str(o.path)}` : str(o.link);
		return { label, target: t || null, exists: typeof o.exists === 'boolean' ? o.exists : null };
	});
	// `in` names files within the note's own bundle
	const bundle = str(d.bundle);
	return { out, in: arr(d.in).map((f) => joinBundle(bundle, str(f))).filter((f) => f.length > 0) };
}

export function toFacts(data: unknown): Fact[] {
	return arr(obj(data).blocks).map((b) => {
		const o = obj(b);
		return {
			line: num(o.line),
			id: str(o.id),
			kind: str(o.kind),
			source: str(o.source),
			status: str(o.status) || 'unchecked',
			at: str(o.at) || null,
			due: o.due === true,
		};
	});
}

/** The files a write tool changed (`edited`) or would change (`would_edit`), and its diff. */
export function toCreated(data: unknown): Created {
	const d = obj(data);
	const files: string[] = [];
	for (const key of ['edited', 'would_edit']) {
		for (const [bundle, names] of Object.entries(obj(d[key]))) {
			for (const n of arr(names)) files.push(joinBundle(bundle, str(n)));
		}
	}
	if (files.length === 0 && d.file !== undefined) files.push(str(d.file));
	return { files, diff: str(d.diff), raw: JSON.stringify(data, null, 2) ?? '' };
}
