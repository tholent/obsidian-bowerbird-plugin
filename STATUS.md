# STATUS — obsidian-bowerbird-plugin

_Last updated: 2026-11-24_

The project's live state. Update it when work lands. Every claim cites at least one file that exists.

## Now

- Plugin v1 is built, all eight pieces of the Kickoff: seal badge and hand-off, search, files lacking review,
  lint, links and facts, new note from template, and vault setup (`src/main.ts`, `docs/bbq/2026-11-24-obsidian-plugin.md`).
- The plugin never seals: each tool it may run is listed with its arguments, and unit tests check it (`src/transport/args.ts`, `tests/unit/args.test.ts`).
- Build and lint are clean; 69 unit tests pass (`npm test`) and 13 integration tests pass against bowerbird-mcp 2.3.0 (`npm run test:integration`, `tests/integration/cli.test.ts`).
- Not yet run in a live Obsidian vault; the script for that is written (`docs/manual-test.md`).
- This repository is a bowerbird collection (`format: markdown`); nothing in it is sealed yet (`bower.yaml`).

## Next

- Chris Wells: run the manual test in a throwaway vault (`docs/manual-test.md`).
- Chris Wells: seal the repository's docs; `bowerbird-mcp seal check=true` lists 7 files lacking review (`bower.yaml`).
- Cut the first release, 0.1.0, when Chris Wells says: push `main`, then tag it; the workflow makes a draft release (`manifest.json`, `.github/workflows/release.yml`).
- Chris Wells: decide whether to file the upstream notes (`docs/upstream-notes.md`).

## Known debt

- The badge cannot show `derived`, or who sealed a note and when: the command line has no per-file seal tool (`docs/upstream-notes.md`).
- Each bowerbird call starts a process, about 1.5 to 2 seconds; the badge re-reads the whole collection after each change (`src/seal-index.ts`).
- No glossary yet, though the Plain words rules offer glossary entries (`AGENTS.md`).

## Log

- 2026-11-24: prepared with project-prep; ADR-001 drafted with makeadr and ratified (`docs/decisions/INDEX.md`); plugin v1 planned with bbq (`docs/bbq/2026-11-24-obsidian-plugin.md`).
- 2026-11-24: Chris Wells confirmed he installed `uv` and `bowerbird-mcp`, and created the remote, github.com/tholent/obsidian-bowerbird-plugin, reached over HTTPS with the project's token; `git ls-remote` reached it, and nothing is pushed yet (`docs/bbq/2026-11-24-obsidian-plugin.md`).
- 2026-11-24: plugin v1 built on main, 11 commits from the scaffold to the docs; integration tests run against bowerbird-mcp 2.3.0; repository made a bowerbird collection (`README.md`, `docs/upstream-notes.md`).

## How this file is kept

Live state stays here: what works now, what is next, and the top of the debt list. Every bullet under Now, Next
and Known debt cites at least one file that exists. Keep this file under 300 lines; the project-prep
skill's `scripts/status-check.py` checks both.
