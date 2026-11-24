// Reading what bowerbird-mcp prints. Piped, it prints JSON; exit 1 from `lint` or `seal check=true`
// means findings, not a failure. An error is one line, `error: <message> | fix: <what to do>`.

export interface Failure {
	message: string;
	fix?: string;
}

export type Outcome = { ok: true; data: unknown; code: number } | { ok: false; failure: Failure };

/** Split bowerbird's `message | fix: text` into its two parts. */
export function splitFix(text: string): Failure {
	const t = text.trim().replace(/^error:\s*/, '');
	const at = t.indexOf(' | fix: ');
	if (at < 0) return { message: t };
	return { message: t.slice(0, at).trim(), fix: t.slice(at + ' | fix: '.length).trim() };
}

function lastErrorLine(text: string): string | null {
	const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith('error:'));
	return lines.length ? (lines[lines.length - 1] ?? null) : null;
}

/** The outcome of one call, from its exit code and output. */
export function readOutcome(code: number | null, stdout: string, stderr: string): Outcome {
	if (code === 0 || code === 1) {
		try {
			return { ok: true, data: JSON.parse(stdout) as unknown, code };
		} catch {
			// not JSON: fall through and report it
		}
	}
	const line = lastErrorLine(stderr) ?? lastErrorLine(stdout);
	if (line) return { ok: false, failure: splitFix(line) };
	const tail = (stderr.trim() || stdout.trim()).split(/\r?\n/).slice(-3).join(' ').slice(0, 400);
	const what = code === null ? 'bowerbird-mcp was stopped' : `bowerbird-mcp exited with code ${code}`;
	return { ok: false, failure: { message: tail ? `${what}: ${tail}` : what } };
}

/** [major, minor, patch] from `bowerbird-mcp 2.3.0 (...)`, or null. */
export function parseVersion(line: string): [number, number, number] | null {
	const m = /bowerbird-mcp\s+(\d+)\.(\d+)\.(\d+)/.exec(line);
	if (!m) return null;
	return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Inside the range the plugin is built for: >=2.3,<3. */
export function versionInRange(v: [number, number, number]): boolean {
	return v[0] === 2 && v[1] >= 3;
}
