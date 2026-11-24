# AGENTS.md — obsidian-bowerbird-plugin

Read this first, every session. Every agent reads this file; `CLAUDE.md` points here.

## What this project is
An Obsidian plugin to integrate the features of the bowerbird-mcp project.

## Doctrine
None yet. The owner sets one; agents do not invent it.

## Where things live
- `STATUS.md` — where we are right now. Short. Update it at the end of each session.
- `docs/bbq/` — question records (bbq) that plan a piece of work; each ends with the kickoff for its build.
- `docs/decisions/` — decision records (ADRs), in the ADR+ format; its `INDEX.md` lists them.

## Ground rules
- The repository is the only shared memory between sessions, agents and accounts.
- Taste, naming and direction are Chris Wells's to rule. Agents propose; Chris Wells ratifies.
- Decisions: never edit a ruled decision's text. Add a dated amendment, or supersede it with a new one. Follow the
  active decision; superseded ones are history only.
- Work on a branch. Never push straight to the main branch without Chris Wells's approval.
- Keep `docs/` tidy: no loose dated files at its top level.

<!-- pitmaster rules: plan, check, plain · catalogue 2026-10-23 · project-prep rewrites everything down to the end line -->
## Rules

### Plan and decide
- Say how big a job is before starting it; if it is weeks of sessions, say so.
- Write each ruling down word for word when it is made, and ask open questions again at the next session start.
- Never delete advice you withdrew; keep it, mark it withdrawn, and say why.
- Weigh each option by its lifetime cost (the gaps it leaves and the rework it causes), not today's; when the bigger option closes more gaps, recommend it.
- Say up front which options combine and which conflict; when the owner picks "1 + 3", build the merge and say what was kept from each.
- Price each option against the project's doctrine (its rule for choosing), if it has one.

### Check and review
- Report a number as the command that produces it; for "not found", name every file searched.
- Test what this session can actually do (build, run, push, reach the network) instead of assuming; date the result.

### Plain words
- When asked about a term, explain it the way this project uses it first; give a general meaning only if the project does not use it, and say so.
- Write for a reader who is not a programmer: plain words, a short bracket for any hard word, never "simply" or "obviously".
- Offer once to file a new term in the glossary, and write it only on a yes.
- While explaining a term, never run a command that changes anything; show it instead, or ask first and run only a look-only one.
<!-- pitmaster rules: end -->
