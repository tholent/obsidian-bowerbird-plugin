// What the views ask of bowerbird. The views use only this interface; today it runs the command line
// (src/transport/cli.ts, bbq Q5). A later HTTP transport to a remote `serve` can replace it (bbq Q7).
// Every path here is a collection path: from the collection root, with forward slashes.

import type { Failure } from './transport/output';

export interface Hit {
	file: string;
	line: number | null;
	heading: string;
	title: string;
	tier: string;
	stale: boolean;
	match: number | null;
	text: string;
}

export interface Passages {
	gap: boolean;
	total: number;
	hits: Hit[];
}

export interface Concept {
	file: string;
	title: string;
	tier: string;
	stale: boolean;
}

export interface Finding {
	file: string;
	kind: string;
	severity: string;
	message: string;
	fix: string;
}

export interface Findings {
	ok: boolean;
	total: number;
	findings: Finding[];
	/** How many files `seal check` looked at, when it says. */
	checked: number | null;
}

export interface LinkOut {
	/** What the note wrote: the link, or the frontmatter field. */
	label: string;
	/** The file it leads to, or null when it leads outside the collection or nowhere. */
	target: string | null;
	/** false when the link is broken; null when bowerbird cannot tell (a web address). */
	exists: boolean | null;
}

export interface Links {
	out: LinkOut[];
	in: string[];
}

export interface Fact {
	line: number | null;
	id: string;
	kind: string;
	source: string;
	status: string;
	at: string | null;
	due: boolean;
}

export interface Created {
	/** The files written or (in a preview) to be written. */
	files: string[];
	/** The diff, in a preview. */
	diff: string;
}

export interface ServeResult {
	ok: boolean;
	/** The serve extra is not installed: offer the terminal command instead (bbq Q11). */
	missingExtra: boolean;
	message: string;
}

/** A failure bowerbird reported, with its own message and `fix:` text. */
export class BowerbirdError extends Error {
	fix?: string;
	constructor(failure: Failure) {
		super(failure.message);
		this.name = 'BowerbirdError';
		this.fix = failure.fix;
	}
}

/** bowerbird-mcp could not be found or run at all. Shown once, never retried in a loop (bbq Q9). */
export class UnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnavailableError';
	}
}

export interface Bowerbird {
	/** Find and check the command once; later calls reuse the answer. Resolves to a warning to show once, or null. */
	ready(): Promise<string | null>;
	passages(query: string, limit: number): Promise<Passages>;
	concepts(): Promise<Concept[]>;
	links(file: string): Promise<Links>;
	lint(file?: string): Promise<Findings>;
	facts(file: string): Promise<Fact[]>;
	/** `seal check=true`: what lacks a person's review. Never seals. */
	lacking(): Promise<Findings>;
	newNote(file: string, template: string, title: string): Promise<Created>;
	/** `create` for a vault with no bower.yaml: a preview unless apply (bbq Q10). */
	create(about: string, apply: boolean): Promise<Created>;
	serve(verb: 'start' | 'stop' | 'status'): Promise<ServeResult>;
	/** What a person pastes into a terminal to seal the file themselves. */
	sealCommand(file: string): Promise<string>;
}
