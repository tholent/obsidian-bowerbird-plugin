// Mapping between a path in the vault and a path in the collection. They differ when the collection's
// bower.yaml is above the vault, or in a folder inside it. Pure: the platform's path rules are passed in.

export interface PathRules {
	join(...parts: string[]): string;
	relative(from: string, to: string): string;
	isAbsolute(p: string): boolean;
	sep: string;
}

export interface Roots {
	vault: string;
	collection: string;
}

function toSlashes(p: string): string {
	return p.split('\\').join('/');
}

function outside(rel: string, rules: PathRules): boolean {
	return rel === '..' || rel.startsWith(`..${rules.sep}`) || rules.isAbsolute(rel);
}

/** A vault path (`notes/a.md`) as a collection path, or null when the note is outside the collection. */
export function toCollection(vaultPath: string, roots: Roots, rules: PathRules): string | null {
	const abs = rules.join(roots.vault, vaultPath);
	const rel = rules.relative(roots.collection, abs);
	if (outside(rel, rules)) return null;
	return toSlashes(rel);
}

/** A collection path as a vault path, or null when the file is outside the vault. */
export function toVault(collectionPath: string, roots: Roots, rules: PathRules): string | null {
	const abs = rules.join(roots.collection, collectionPath);
	const rel = rules.relative(roots.vault, abs);
	if (outside(rel, rules) || rel === '') return null;
	return toSlashes(rel);
}

/** A file named the way bowerbird names it, {bundle, file}, as one collection path. */
export function joinBundle(bundle: string | undefined, file: string): string {
	if (!bundle || bundle === '.') return file;
	return `${bundle.replace(/\/+$/, '')}/${file}`;
}

/** Where the collection is: the folder a setting names (a bower.yaml or its folder; `~`, absolute, or from the vault), else the vault. */
export function collectionRoot(setting: string, vault: string, home: string, rules: PathRules): string {
	let s = setting.trim();
	if (!s) return vault;
	if (s === '~' || s.startsWith('~/') || s.startsWith('~\\')) s = rules.join(home, s.slice(1));
	const abs = rules.isAbsolute(s) ? s : rules.join(vault, s);
	return /(^|[\\/])bower\.yaml$/.test(abs) ? rules.join(abs, '..') : rules.join(abs);
}

/** The path segments of a collection path, quoted for a URL (as `urllib.parse.quote` does on serve's side). */
export function urlPath(collectionPath: string): string {
	return collectionPath.split('/').map(encodeURIComponent).join('/');
}

/** A vault path cleaned the way Obsidian's normalizePath cleans one: forward slashes, none doubled or at the ends. */
export function cleanVaultPath(p: string): string {
	return p
		.replace(/\u00A0/g, ' ')
		.replace(/[\\/]+/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.normalize();
}

/** The vault path of a new note, from a folder and a name (.md added); null when the name is not usable. */
export function newNotePath(folder: string, name: string): string | null {
	const n = cleanVaultPath(name.trim()).replace(/\.md$/i, '');
	if (!n || n.split('/').some((part) => part === '..' || part === '.')) return null;
	const f = cleanVaultPath(folder.trim());
	return f ? `${f}/${n}.md` : `${n}.md`;
}
