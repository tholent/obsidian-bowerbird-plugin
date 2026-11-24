import { describe, expect, it } from 'vitest';
import { chooseCommand, findProgram, quoteWord, splitCommand, UVX_FROM, UVX_FROM_SERVE, withServe } from '../../src/transport/command';

const look = (files: string[], pathEnv = '/usr/bin:/opt/bin', platform = 'linux', home = '/home/ann') => ({
	pathEnv,
	home,
	platform,
	exists: (f: string) => files.includes(f),
});

describe('splitCommand', () => {
	it('splits on spaces and keeps quoted words whole', () => {
		expect(splitCommand(`uvx --from 'bowerbird-mcp[obsidian]>=2.3,<3' bowerbird-mcp`)).toEqual([
			'uvx',
			'--from',
			'bowerbird-mcp[obsidian]>=2.3,<3',
			'bowerbird-mcp',
		]);
		expect(splitCommand('"C:\\Program Files\\bb\\bowerbird-mcp.exe"  --x')).toEqual(['C:\\Program Files\\bb\\bowerbird-mcp.exe', '--x']);
		expect(splitCommand('a\\ b c')).toEqual(['a b', 'c']);
		expect(splitCommand(`''`)).toEqual(['']);
	});

	it('refuses an unclosed quote', () => {
		expect(() => splitCommand(`uvx 'oops`)).toThrow(/unclosed/);
	});
});

describe('chooseCommand (bbq Q9)', () => {
	it('uses the setting first', () => {
		expect(chooseCommand('/x/bowerbird-mcp', look(['/usr/bin/bowerbird-mcp']))).toEqual({ argv: ['/x/bowerbird-mcp'], via: 'setting' });
	});

	it('finds bowerbird-mcp on PATH', () => {
		expect(chooseCommand('', look(['/opt/bin/bowerbird-mcp', '/usr/bin/uvx']))).toEqual({ argv: ['/opt/bin/bowerbird-mcp'], via: 'path' });
	});

	it('finds bowerbird-mcp in ~/.local/bin when PATH lacks it', () => {
		expect(chooseCommand('', look(['/home/ann/.local/bin/bowerbird-mcp']))?.argv).toEqual(['/home/ann/.local/bin/bowerbird-mcp']);
	});

	it('falls back to uvx with the obsidian extra and the version range', () => {
		const c = chooseCommand('', look(['/home/ann/.local/bin/uvx']));
		expect(c).toEqual({ argv: ['/home/ann/.local/bin/uvx', '--from', 'bowerbird-mcp[obsidian]>=2.3,<3', 'bowerbird-mcp'], via: 'uvx' });
		expect(withServe(c!).argv[2]).toBe(UVX_FROM_SERVE);
		expect(chooseCommand('', look(['/usr/bin/uvx']), true)?.argv[2]).toBe(UVX_FROM_SERVE);
		expect(UVX_FROM).toBe('bowerbird-mcp[obsidian]>=2.3,<3');
	});

	it('returns null when nothing is found', () => {
		expect(chooseCommand('  ', look([]))).toBeNull();
	});

	it('looks for .exe on Windows', () => {
		const w = look(['C:\\Users\\ann\\.local\\bin\\bowerbird-mcp.exe'], 'C:\\Windows', 'win32', 'C:\\Users\\ann');
		expect(findProgram('bowerbird-mcp', w)).toBe('C:\\Users\\ann\\.local\\bin\\bowerbird-mcp.exe');
	});

	it('leaves a non-uvx command alone for serve', () => {
		expect(withServe({ argv: ['/b'], via: 'path' })).toEqual({ argv: ['/b'], via: 'path' });
	});
});

describe('quoteWord', () => {
	it('quotes only what needs it', () => {
		expect(quoteWord('notes/a.md', 'linux')).toBe('notes/a.md');
		expect(quoteWord("Ann's note.md", 'linux')).toBe(`'Ann'\\''s note.md'`);
		expect(quoteWord('My Notes/a.md', 'win32')).toBe('"My Notes/a.md"');
	});
});
