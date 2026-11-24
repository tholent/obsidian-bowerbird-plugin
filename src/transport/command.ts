// Choosing the command that runs bowerbird-mcp (bbq Q9): an override from the settings, else
// `bowerbird-mcp` on PATH or in ~/.local/bin, else `uvx --from ...`. Pure: the file system is passed in.

export const VERSION_RANGE = '>=2.3,<3';
export const UVX_FROM = `bowerbird-mcp[obsidian]${VERSION_RANGE}`;
export const UVX_FROM_SERVE = `bowerbird-mcp[obsidian,serve]${VERSION_RANGE}`;

export type Via = 'setting' | 'path' | 'uvx';

export interface Command {
	argv: string[];
	via: Via;
}

export interface Lookup {
	pathEnv: string;
	home: string;
	platform: string;
	exists: (file: string) => boolean;
}

/** Split a command line into words, honouring single quotes, double quotes and backslashes (outside single quotes). */
export function splitCommand(line: string): string[] {
	const words: string[] = [];
	let word = '';
	let inWord = false;
	let quote: '"' | "'" | null = null;
	for (let i = 0; i < line.length; i++) {
		const c = line.charAt(i);
		if (quote === "'") {
			if (c === "'") quote = null;
			else word += c;
		} else if (quote === '"') {
			if (c === '"') quote = null;
			else if (c === '\\' && i + 1 < line.length && '"\\'.includes(line.charAt(i + 1))) word += line.charAt(++i);
			else word += c;
		} else if (c === "'" || c === '"') {
			quote = c;
			inWord = true;
		} else if (c === '\\' && i + 1 < line.length) {
			word += line.charAt(++i);
			inWord = true;
		} else if (/\s/.test(c)) {
			if (inWord) words.push(word);
			word = '';
			inWord = false;
		} else {
			word += c;
			inWord = true;
		}
	}
	if (quote) throw new Error(`unclosed ${quote} in the command`);
	if (inWord) words.push(word);
	return words;
}

/** The folders to look in: PATH first, then ~/.local/bin (where `uv tool install` puts commands). */
export function searchDirs(look: Lookup): string[] {
	const sep = look.platform === 'win32' ? ';' : ':';
	const slash = look.platform === 'win32' ? '\\' : '/';
	const dirs = look.pathEnv.split(sep).filter((d) => d.length > 0);
	const local = `${look.home}${slash}.local${slash}bin`;
	if (look.home && !dirs.includes(local)) dirs.push(local);
	return dirs;
}

/** The first folder holding the program `name`, as a full path, or null. */
export function findProgram(name: string, look: Lookup): string | null {
	const slash = look.platform === 'win32' ? '\\' : '/';
	const names = look.platform === 'win32' ? [`${name}.exe`, `${name}.cmd`, name] : [name];
	for (const dir of searchDirs(look)) {
		for (const n of names) {
			const full = `${dir.replace(/[\\/]+$/, '')}${slash}${n}`;
			if (look.exists(full)) return full;
		}
	}
	return null;
}

/** The command to run, or null when nothing was found. `serve` asks uvx for the serve extra too (bbq Q11). */
export function chooseCommand(setting: string, look: Lookup, serve = false): Command | null {
	if (setting.trim()) return { argv: splitCommand(setting.trim()), via: 'setting' };
	const own = findProgram('bowerbird-mcp', look);
	if (own) return { argv: [own], via: 'path' };
	const uvx = findProgram('uvx', look);
	if (uvx) return { argv: [uvx, '--from', serve ? UVX_FROM_SERVE : UVX_FROM, 'bowerbird-mcp'], via: 'uvx' };
	return null;
}

/** The same command, but able to run `serve`: only a uvx command changes. */
export function withServe(cmd: Command): Command {
	if (cmd.via !== 'uvx') return cmd;
	return { argv: cmd.argv.map((a) => (a === UVX_FROM ? UVX_FROM_SERVE : a)), via: cmd.via };
}

/** Quote one word for a person to paste into a terminal. */
export function quoteWord(word: string, platform: string): string {
	if (/^[\w@%+=:,./-]+$/.test(word)) return word;
	if (platform === 'win32') return `"${word.replace(/"/g, '\\"')}"`;
	return `'${word.replace(/'/g, `'\\''`)}'`;
}

export const INSTALL_HELP =
	"Bowerbird could not find bowerbird-mcp. Install uv (https://docs.astral.sh/uv/), then run: uv tool install 'bowerbird-mcp[obsidian,serve]'. Or set the full command in Settings → Bowerbird.";
