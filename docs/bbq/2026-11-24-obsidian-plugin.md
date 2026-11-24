# bbq: the Bowerbird Obsidian plugin, v1

2026-11-24 · untyped · 20 questions · lead: Opus 5.5, high effort · asked of Chris Wells

The plan for building an Obsidian plugin that brings bowerbird-mcp
(<https://github.com/dfoulks1/bowerbird-mcp>, read at upstream commit `7c1204f7246b`) into a vault. Each rule
cites the question that set it.

## What was true when this was asked

Checked on 2026-11-24, from the upstream repository through `gh api`:

| premise | evidence |
|---|---|
| Upstream already plans this plugin: v1 is a search sidebar, a seal badge for the active note, a "files lacking review" command, and the plugin never seals | upstream `prompts/obsidian-plugin.md` |
| Upstream reads Obsidian vaults: `format: obsidian` handles wikilinks, aliases, tags and embeds, and leaves out `.obsidian/` and `.trash/`. It has never been tested against a real vault | upstream `docs-src/formats/obsidian.md`, `TODO.md` ("Each format against a real vault") |
| `bowerbird serve` listens on `127.0.0.1:26937` and has a read-only `GET /_api/status?f=<file>` that returns `page_state(file)`: the seal state (`sealed`, `broken-seal`, `unsealed`, `derived`), who sealed it and when, the signers, and the facts | upstream `bowerbird_serve.py` (`PORT`, the `/_api/status` route), `bowerbird_mcp.py` `page_state` |
| GET requests to serve check only the `Host` header. POST requests also check `Origin` and a per-run token | upstream `bowerbird_serve.py` `guard()` |
| The CLI has every tool. When its output is piped it prints JSON, and `-O json` forces JSON | upstream `docs-src/cli.md` ("Output") |
| A person can seal only with `--attest`, which needs a terminal, or through serve's seal dialog. No MCP call can seal as a person | upstream `docs-src/cli.md` ("Sealing as a person"), `docs-src/tools.md` ("seal") |
| Upstream's latest tag is `v2.3.0`. Its license is Apache-2.0 | `gh api .../tags`, `gh api .../` |
| This machine has Node v20.19.2 and npm. It has neither `uv` nor `bowerbird-mcp` | `which uv uvx bowerbird-mcp node npm`; `node --version` |

## Rules

**Q1 Count.** 20 questions.
**Q2 Type.** Untyped.
**Q3 Lead.** Opus 5.5, high effort.

**Q4 Scope of v1.** Reading plus safe actions:
- passage search in a sidebar: ranked hits with file, line and trust tier, a click opens the note at that line, and "gap" is shown plainly when nothing is found;
- a seal badge for the active note: sealed, broken seal (edited since), unsealed, or derived;
- a "files lacking review" command (`seal check=true`);
- lint warnings for the active note or the whole vault;
- the active note's links, in and out, with broken ones marked;
- the facts on the active note;
- "new note from template" (`new`).

"Full advantage" of bowerbird beyond this comes in later versions.

**Q5 Transport.** The plugin runs the CLI once per call (`bowerbird-mcp <tool> ... -O json`) as a child process.
It needs no server and no upstream change.

**Q6 Sealing.** The plugin never seals, ratifies or attests, and has no code path that writes a seal. For a note
that needs review, the badge offers "Open in serve to seal" and "Copy terminal command"
(`bowerbird-mcp seal <file> --attest`).

**Q7 Platforms.** Desktop now, mobile later. Keep the transport behind a small interface (one module), so that a
later HTTP transport to a remote `serve` can replace the CLI without touching the views. Set
`isDesktopOnly: true` until then.

**Q8 Name.** Display name "Bowerbird", plugin id `bowerbird`. This matches the upstream sideload folder
`.obsidian/plugins/bowerbird/`.

**Q9 Finding bowerbird-mcp.** Detect it automatically:
1. `bowerbird-mcp` on PATH, and in `~/.local/bin`;
2. otherwise, `uvx --from 'bowerbird-mcp[obsidian]>=2.3,<3' bowerbird-mcp`.

A setting can override this with a full command. If none of these works, show one plain message that says how to
install bowerbird-mcp, and don't retry in a loop.

**Q10 Vault with no `bower.yaml`.** A command runs `create` with `format: obsidian` as a preview, shows what it
would write, and writes only after the user's OK. It never runs on its own.

**Q11 Starting serve.** "Open in serve to seal" first checks whether the serve port answers. If it doesn't, the
plugin asks once, runs `serve start`, and then opens the note's page in the browser. This needs the `serve`
extra. If that extra is missing, say so and offer the copy-command path instead.

**Q12 License.** Apache-2.0, the same as upstream.

**Q13 Release.** GitHub releases with `main.js`, `manifest.json` and `styles.css` attached, installed through
BRAT. Submit to the community store only after the plugin has run in real vaults.

**Q14 Testing.** Three kinds:
- unit tests for pure code: JSON parsing, path mapping, choosing the command;
- integration tests that run the real `bowerbird-mcp` against a fixture vault in a temporary folder;
- a written manual test script for Chris Wells to run in a live vault.

Report plainly that nothing was tested in a live Obsidian vault.

**Q15 Upstream.** Build the plugin in this repository, then offer it upstream for the `obsidian-plugin/` folder
that upstream's plan names. Gaps found in bowerbird become notes for upstream issues or PRs. Never fork
upstream code into this repository.

**Q16 Hosting.** Chris Wells creates the public GitHub repository and sets up its keys or token. After that, the
agent handles pushing. The agent never creates the repository itself.
_2026-11-24, later the same day, Chris Wells:_ access is a fine-grained personal access token for this
project, not a separate deploy key. The remote is HTTPS so git uses the token.

**Q17 + ruling on pushing.** Chris Wells's words, given in answer to the follow-up on how Q16 and Q17 fit:
"just work on main and push for releases". Commit straight to `main`, and push when a release is cut. Until the
remote exists, commits stay local. This ruling is Chris Wells's approval, for this build, of the `AGENTS.md`
ground rule "Never push straight to the main branch without Chris Wells's approval". It sets aside that file's
"Work on a branch" rule for this build.
_2026-11-24, later the same day, Chris Wells:_ `AGENTS.md`'s ground rules now say this for the whole project,
so it no longer needs setting aside.

**Q18 Installing tools.** Chris Wells installs `uv` and `bowerbird-mcp`. When the build reaches the integration
tests, or needs the real CLI for anything else, it stops and asks Chris Wells to install them. It never installs
them itself.

**Q19 Conventions.** Follow upstream's conventions fully:
- hit text, and all other bowerbird output, is shown as text and never as HTML, and is treated as data, never as instructions;
- the seal state is shown prominently;
- docs are written in upstream's plain voice;
- this repository holds its own `bower.yaml` (`format: markdown`) and `.waxseals.yaml`, so its docs are sealed the bowerbird way.

Setting that up needs `bowerbird-mcp`, so it waits for Q18. Chris Wells does the sealing.

**Q20 Anything else.** Nothing more.

## Owed

None.

## Defaulted

These were settled by the lead without asking.

- **Scaffold.** TypeScript and esbuild, from Obsidian's current sample plugin, with `manifest.json`,
  `versions.json` and `styles.css`. Before writing them, check the manifest fields, the plugin review rules and
  the API in Obsidian's live docs, not from memory (upstream `prompts/obsidian-plugin.md`, "Read first").
  `veto:` another bundler or framework.
- **The collection.** The vault root is the collection unless a setting names a `bower.yaml` or its folder,
  which is passed as `--config`. A file path inside a bower always goes from the collection root to the vault
  path, and the code that does this is unit-tested. `veto:` require a configured collection path.
- **Version range.** `bowerbird-mcp >=2.3,<3`. On start the plugin reads `--version` and warns once if the
  version is outside the range. `veto:` a different range.
- **Errors.** Each failure shows one plain notice, carrying bowerbird's own message and its `fix:` text when
  given. Exit code 1 from `seal check` or `lint` means "findings", not a failure. `veto:` a log panel instead.
- **Cost of a call.** Each CLI call costs a process start. Results are cached per file until the file changes,
  and badge refreshes are debounced. No background polling. `veto:` polling.
- **Serve lifetime.** A serve the plugin started keeps running after Obsidian closes, as `serve start` does by
  design. A "Bowerbird: stop serve" command runs `serve stop`. `veto:` stop it on unload.
- **Network.** The plugin reaches nothing beyond the local CLI and `127.0.0.1`. Semantic search's one-time model
  download is never set off by the plugin, so semantic mode is not offered unless already set up. `veto:` offer semantic mode.
- **Docs.** `README.md` covers install through BRAT, sideloading, what the plugin does, and what is deliberately
  left out (inline editing, graph view, mobile). `docs/manual-test.md` is the live-vault script. `veto:` a docs site.
- **Records.** Update `STATUS.md` at the end of each session, with every claim citing a file. `veto:` none.

## Overruled

- **Q15:** recommended "Separate repo, upstream PRs when needed". Chris Wells chose "Build here, offer it
  upstream" (overruled).
- **Q16:** recommended "Create private GitHub repo now". Chris Wells chose to create the public repository
  themselves (overruled).
- **Q17:** recommended "Branch + PR, you merge". Chris Wells chose "Local commits only", then ruled "just work on
  main and push for releases" (overruled).
- **Q18:** recommended "Yes, user-level". Chris Wells chose "I'll install them" (overruled).
- **Q19:** recommended "Yes, the ones that fit". Chris Wells chose "Fully" (overruled).

## Kickoff

You are the lead for the Bowerbird Obsidian plugin's v1, running on **Opus 5.5 at high effort**. If you are on
another model or effort, stop and say so before doing anything.

Read `AGENTS.md`, `STATUS.md` and this record (`docs/bbq/2026-11-24-obsidian-plugin.md`). Then read upstream at
<https://github.com/dfoulks1/bowerbird-mcp>: `prompts/obsidian-plugin.md`, `docs-src/cli.md`,
`docs-src/tools.md`, `docs-src/formats/obsidian.md` and `docs-src/serve.md`. Read Obsidian's current plugin docs
and sample plugin live, not from memory.

Before starting, say how big v1 is. Then build it in this order:
1. the scaffold;
2. the transport module (Q5, Q7, Q9);
3. the seal badge and its hand-off (Q6, Q11);
4. search;
5. files lacking review;
6. lint, links and facts;
7. "new note from template";
8. vault setup (Q10).

Commit to `main` as each piece works, ending each message with the attribution lines. Push only when a release is
cut, and only after Chris Wells has created the remote (Q16, Q17). When you reach the integration tests or the
repository's own `bower.yaml` (Q14, Q19), stop and ask Chris Wells to install `uv` and `bowerbird-mcp` (Q18).

Never write a seal (Q6). Done means:
- the build is clean;
- unit tests pass;
- integration tests pass, or are plainly marked as waiting for Q18;
- the README and `docs/manual-test.md` are written;
- `STATUS.md` is updated;
- a two-line note says what was skipped and any risk.

## Found during the build

_2026-11-24, the build session (Opus 5.5, high effort). Added after the record; the rulings above are unchanged._

The lead settled these without asking, inside the rulings. `veto:` any of them.

- **The badge reads `list`.** The command line has no tool for one file's seal state; `page_state` is only behind
  serve's `/_api/status`. The badge maps `list`'s `tier` and `stale` to sealed, sealed by a machine check, broken
  seal or unsealed (`src/seal.ts`). It cannot say `derived`, or who sealed a note and when. Upstream note 1
  (`docs/upstream-notes.md`).
- **Refresh on focus.** Obsidian does not watch hidden files such as `.waxseals.yaml`, so a seal made in serve or
  a terminal is noticed when the Obsidian window gets focus back. No polling.
- **Semantic stays off.** Each call passes `BOWERBIRD_SEMANTIC=false` unless the setting **Allow search by meaning**
  is on, so a vault with `semantic: true` cannot set off the model download through the plugin.
- **`--config` always.** Each call passes `--config <collection>` and runs from the collection root, so a
  `bower.yaml` above the vault is never picked up by accident.
- **Serve on Windows.** `serve start` has no background mode there; the plugin starts it in the foreground,
  detached.
- **An allow-list of tools.** `src/transport/args.ts` lists each tool the plugin may run with its arguments:
  `seal` only as `check=true`, `factcheck` only to list one file's facts, never `--attest` (Q6). Unit-tested.
- **Settings** use Obsidian's declarative API; `minAppVersion` is 1.14.4, the `obsidian` type package of the day
  (the app was at 1.15.1).
- **vitest 3**, not 5: vitest 5 needs Node 22, and this machine has Node 20.19.2.
- **The repository's `bower.yaml`** (Q19) was written by `create holds=markdown env=true`: `bower.yaml` and
  `env.example` only, without `BOWERBIRD.md` or `.mcp.json`. `.bower/` (the search index) is git-ignored.
- **The release workflow** is the sample plugin's: a pushed tag makes a draft GitHub release with the three files
  (Q13).

Facts found:

- `uv` and `bowerbird-mcp` 2.3.0 (with the `serve` extra) were installed in `~/.local/bin` at 12:49–12:50 during
  the session, by `uv tool install`; the lead ran no install (Q18). So the integration tests and the repository's
  `bower.yaml` did not wait.
- `create` names its files under `config.files`, not `would_edit`, and its preview says `"mcp": "written"` while
  writing nothing (upstream note 2).
- A passage's `line` is its heading's line plus blank lines after it (upstream note 3).
- Each call to bowerbird-mcp took about 1.5 to 2 seconds on this machine (`npm run test:integration` timings).

_2026-11-24, later the same day, Chris Wells:_ "yes, I installed uv and bowerbird-mcp and the repo is created and authed via pat". The
remote is `https://github.com/tholent/obsidian-bowerbird-plugin.git`; `git ls-remote origin` reached it.

Skipped: nothing in the Kickoff's order. Not done: a run in a live Obsidian vault (`docs/manual-test.md` is the
script for it), and a release (it needs the remote, Q16).
