// Starting bowerbird-mcp with Node's child_process (desktop only, bbq Q7).

import { spawn } from 'child_process';
import type { Runner, RunResult } from './cli';

const MAX_OUTPUT = 32 * 1024 * 1024;

export const nodeRunner: Runner = {
	run(argv: string[], cwd: string, env: Record<string, string>, timeoutMs: number): Promise<RunResult> {
		return new Promise((resolve) => {
			const [program, ...rest] = argv;
			if (!program) {
				resolve({ code: null, stdout: '', stderr: '', notFound: true });
				return;
			}
			let stdout = '';
			let stderr = '';
			let done = false;
			const finish = (r: RunResult) => {
				if (done) return;
				done = true;
				window.clearTimeout(timer);
				resolve(r);
			};
			const child = spawn(program, rest, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
			const timer = window.setTimeout(() => {
				child.kill();
				finish({ code: null, stdout, stderr: `${stderr}\nerror: bowerbird-mcp took longer than ${timeoutMs / 1000} s and was stopped` });
			}, timeoutMs);
			child.stdout.setEncoding('utf8');
			child.stderr.setEncoding('utf8');
			child.stdout.on('data', (s: string) => {
				if (stdout.length < MAX_OUTPUT) stdout += s;
			});
			child.stderr.on('data', (s: string) => {
				if (stderr.length < MAX_OUTPUT) stderr += s;
			});
			child.on('error', (e: NodeJS.ErrnoException) => {
				const missing = e.code === 'ENOENT' || e.code === 'EACCES';
				finish({ code: null, stdout, stderr: `${stderr}\nerror: ${e.message}`, notFound: missing });
			});
			child.on('close', (code) => finish({ code, stdout, stderr }));
		});
	},

	detach(argv: string[], cwd: string, env: Record<string, string>): void {
		const [program, ...rest] = argv;
		if (!program) return;
		const child = spawn(program, rest, { cwd, env, detached: true, windowsHide: true, stdio: 'ignore' });
		child.on('error', () => undefined); // the port probe that follows reports a failed start
		child.unref();
	},
};
