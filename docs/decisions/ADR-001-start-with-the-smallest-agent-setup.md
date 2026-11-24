---
status: accepted
status-note: ratified by Chris Wells on 2026-11-24
ratified-by: Chris Wells
ratified-on: "2026-11-24"
owner: Chris Wells
kind: process
built: landed
proof: AGENTS.md
supersedes: nothing
amends: nothing
---
# ADR-001 — Start the project with pitmaster's smallest agent setup and grow it only when needed

## Decision

The project is set up for agents with pitmaster's project-prep skill, using its smallest set: `AGENTS.md` (the
rules every agent reads), `CLAUDE.md` (one line, `@AGENTS.md`, loading them into Claude Code) and `STATUS.md`
(where things stand, every claim citing a file). Three rule groups are on in `AGENTS.md`: Plan and decide, Check
and review, and Plain words (catalogue 2026-10-23). The other pieces (log, debt, archive, glossary, proposals,
`pitmaster.md` config) and rule groups (run, records, craft) are left out until the project needs them. Decision
records live in `docs/decisions/` in the ADR+ format.

## Context

The repository was empty when it was set up: no commits and no files. The project is an Obsidian plugin to
integrate the features of the bowerbird-mcp project (`AGENTS.md`). The owner's reason: start small and grow later;
add pieces only once they are needed.

## Consequences

- Agents get one place for the rules (`AGENTS.md`) and one for the current state (`STATUS.md`); session history
  lives only in the Log section of `STATUS.md` until the log piece is added.
- The Plain words group asks agents to offer glossary entries, but there is no `docs/glossary.md` yet; adding the
  glossary piece is the first likely growth.
- Adding a piece or switching a rule group later is done with project-prep, which never overwrites a file.

## History

- 2026-11-24: drafted by makeadr (light route) from the owner's answers, after project-prep set the project up.
- 2026-11-24: ratified by Chris Wells. Earlier values: `status: proposed`; `status-note: drafted 2026-11-24 from the user's words; awaiting ratification`.
