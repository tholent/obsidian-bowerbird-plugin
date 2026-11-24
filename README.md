# Bowerbird for Obsidian

Search your vault, see which notes a person has reviewed, and lint their links, with
[bowerbird-mcp](https://github.com/dfoulks1/bowerbird-mcp). The plugin runs bowerbird-mcp on your machine; it has
no server of its own and sends nothing anywhere.

**It never seals a note.** A seal says a person reviewed exactly this version, so only a person makes one: in
bowerbird's browser page (`serve`), or at a terminal with `--attest`. The plugin shows the seal and takes you
there.

Desktop only, for now. It was built and tested against bowerbird-mcp 2.3.0 and needs a version from 2.3 up to,
not including, 3.

## What it does

- **Seal badge.** The status bar shows the active note's seal: **Sealed** (a person reviewed this version),
  **Sealed by a machine check**, **Broken seal** (edited since it was reviewed), **Unsealed**, or **Not in the
  collection**. Click it for **Open in serve to seal** and **Copy terminal command**.
- **Search.** The bird in the left ribbon, or **Bowerbird: Search passages**, opens a sidebar. Type, press Enter:
  the passages that best answer you, each with its file, line and trust (reviewed by a person, machine-confirmed,
  or unverified), and whether it is stale. A click opens the note at that line. When nothing answers, it says
  **Gap** rather than showing a weak match.
- **Note panel.** **Bowerbird: Open the note panel** shows the active note's seal, its lint warnings, its links
  out (broken ones marked) and in, and its facts with their last check.
- **Files lacking review.** **Bowerbird: Files lacking review** lists every file the seal policy covers that no
  person has reviewed, or that was edited since. A click opens the file.
- **Lint the whole vault.** Every finding, with bowerbird's own fix. Lint only reports; it changes nothing.
- **New note from template.** A note from bowerbird's markdown, ADR or OKF template, or the folder's own.
- **Set up this vault.** For a vault with no `bower.yaml`: bowerbird shows what it would write, and writes it
  only when you choose **Write these files**.

Everything bowerbird says (passage text, file names, messages) is shown as text, never run as HTML, and never
read as instructions.

## Install

### 1. bowerbird-mcp

Install [uv](https://docs.astral.sh/uv/), then:

```sh
uv tool install 'bowerbird-mcp[obsidian,serve]'
```

The `serve` extra is what lets you seal in the browser. The plugin finds `bowerbird-mcp` on your PATH or in
`~/.local/bin`. Without it, it runs `uvx --from 'bowerbird-mcp[obsidian]>=2.3,<3' bowerbird-mcp`, which downloads
bowerbird-mcp the first time. If neither works, it says so once, with how to install it.

### 2. The plugin, through BRAT

1. In Obsidian, install the community plugin **BRAT** and turn it on.
2. Run **BRAT: Plugins: Add a beta plugin for testing (with or without version)** and give it this repository's
   address.
3. Turn on **Bowerbird** in **Settings → Community plugins**.

### Or sideload it

Download `main.js`, `manifest.json` and `styles.css` from a release, put them in
`<your vault>/.obsidian/plugins/bowerbird/`, then turn on **Bowerbird** in **Settings → Community plugins**.

### 3. The vault

Bowerbird reads a vault as a collection when the vault has a `bower.yaml` with `format: obsidian`. Run
**Bowerbird: Set up this vault** to make one. It shows what it would write first:

- `bower.yaml`, the vault's bowerbird settings (commit it if the vault is in git);
- `BOWERBIRD.md` and `.mcp.json`, for an AI assistant that uses bowerbird;
- `env.example` and `.env`, for personal settings (`.env` is added to `.gitignore` in a git repository).

Bowerbird also keeps its search index in `.bower/` in the vault, and the seals in a `.waxseals.yaml` in each
folder. Obsidian does not show files or folders that start with a dot.

## Seal a note

The badge, the note panel and the command palette all offer the same two ways:

- **Open in serve to seal.** Opens the note's page in `bowerbird-mcp serve`, in your browser. If serve is not
  running, the plugin asks once and starts it. Then use **Seal** (the gear) on the page. Serve keeps running after
  Obsidian closes; **Bowerbird: Stop serve** ends it.
- **Copy terminal command.** Copies `cd <collection> && bowerbird-mcp seal <file> --attest`. Run it in a terminal.

When you come back to Obsidian, the badge looks again.

## Settings

- **Command.** Empty: find bowerbird-mcp as above. Or the full command, quoted as in a shell.
- **Collection.** Empty: the `bower.yaml` at the vault root. Or a `bower.yaml`, or the folder holding one, if the
  collection is elsewhere (above the vault, or in a folder of it). A full path, a path starting with `~`, or a
  path from the vault root.
- **Serve port.** 26937 unless you changed serve's.
- **Passages per search.** 3 to 30.
- **Allow search by meaning.** Off. Bowerbird's semantic search downloads a model (about 65 MB) the first time;
  the plugin never sets that off. Turn this on only for a collection that has `semantic: true` and has already
  downloaded its model.

After installing bowerbird-mcp or changing the vault, run **Bowerbird: Check setup again**.

## What it reaches

Only the bowerbird-mcp command on your machine, and `bowerbird-mcp serve` on `127.0.0.1`, read-only: is it
running, and does it know this note. It opens serve's page in your browser when you ask. Through `uvx`,
bowerbird-mcp itself is downloaded from PyPI the first time. Nothing else.

## Left out on purpose

- Editing a note through bowerbird: Obsidian is the editor.
- A graph view: Obsidian has one.
- Mobile: the plugin runs bowerbird-mcp as a program, which phones cannot. A later version can talk to a `serve`
  on another machine instead.

## Limits

- Each look at bowerbird starts bowerbird-mcp once, about a second and a half on the machine it was tested on.
  The badge and the note panel keep their answers until a note changes, or you come back to Obsidian.
- The badge reads the seal from bowerbird's `list`, which gives the trust and whether a review was broken by an
  edit, not who sealed it or when. Serve's page shows those.
- It has not yet been tested in a live Obsidian vault: only by unit tests and by bowerbird-mcp 2.3.0 against
  made-up vaults. `docs/manual-test.md` is the script for the first live run.

## Develop

```sh
npm install
npm run build              # type check and bundle main.js
npm test                   # unit tests
npm run test:integration   # the real bowerbird-mcp against made-up vaults; skipped when it is not installed
npm run lint
```

## License

Apache-2.0, as bowerbird-mcp. See `LICENSE`.
