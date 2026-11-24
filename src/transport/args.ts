// The words passed to bowerbird-mcp for one call. Every tool the plugin may run is listed here with the
// arguments it may pass, so no code path can seal, ratify or attest (bbq Q6): `seal` runs only as
// `seal check=true`, and `--attest` is never passed.

export type Value = string | number | boolean;
export type Args = Record<string, Value | undefined>;

const ALLOWED: Record<string, readonly string[]> = {
	passages: ['query', 'limit', 'offset', 'dir', 'tag', 'type'],
	list: ['limit', 'offset'],
	links: ['file'],
	lint: ['file', 'limit'],
	factcheck: ['file'],
	seal: ['check', 'since'],
	new: ['file', 'template', 'title'],
	create: ['path', 'apply', 'about', 'holds'],
};

const SERVE_VERBS = ['start', 'stop', 'status'] as const;
export type ServeVerb = (typeof SERVE_VERBS)[number];

/** `--config <root>`: always given, so bowerbird reads this collection and no other. */
export function configArgs(root: string | null): string[] {
	return root ? ['--config', root] : [];
}

/** The words for one tool call, as name=value (the stable form for scripts), asking for JSON. */
export function toolArgs(tool: string, args: Args): string[] {
	const allowed = ALLOWED[tool];
	if (!allowed) throw new Error(`the plugin does not run ${tool}`);
	if (tool === 'seal' && args.check !== true) throw new Error('the plugin runs seal only as seal check=true');
	if (tool === 'factcheck' && !args.file) throw new Error('the plugin runs factcheck only for one file');
	const words = [tool];
	for (const [k, v] of Object.entries(args)) {
		if (v === undefined || v === '') continue;
		if (!allowed.includes(k)) throw new Error(`${tool} does not take ${k} here`);
		const s = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
		if (/[\r\n]/.test(s)) throw new Error(`${k} holds a line break`);
		words.push(`${k}=${s}`);
	}
	words.push('output=json');
	return words;
}

/** `serve <verb> [port]`: start, stop or status only. */
export function serveArgs(verb: ServeVerb, port: number, foreground = false): string[] {
	if (!SERVE_VERBS.includes(verb)) throw new Error(`the plugin does not run serve ${String(verb)}`);
	return ['serve', verb, ...(foreground ? ['-f'] : []), String(port)];
}
