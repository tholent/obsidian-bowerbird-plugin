# Notes for upstream

Gaps in bowerbird-mcp found while building this plugin, to become issues or pull requests at
<https://github.com/dfoulks1/bowerbird-mcp> (bbq Q15). Each says how it was found. None is filed yet: filing is
an outward act, for Chris Wells to approve.

Read at upstream commit `7c1204f7246b` and run against bowerbird-mcp 2.3.0, on 2026-11-24.

## 1. No command gives one file's seal state

`page_state(file)` gives a file's seal state (`sealed`, `broken-seal`, `unsealed`, `derived`), who sealed it and
when. Only `serve`'s `GET /_api/status` exposes it; no tool or command does. A plugin that runs the command
line has to read `list` for the whole collection and map its `tier` and `stale` to a state, which cannot say
`derived`, or who sealed it and when.

Ask: a read tool, say `state <file>`, returning `page_state(file)`.

Found by: reading `bowerbird_mcp.py` (`page_state`, and the `REG` of tools) and `docs-src/tools.md`.

## 2. `create`'s preview says `"mcp": "written"`

`bowerbird-mcp create path=<new folder> holds=obsidian about='My notes.' apply=false output=json` answers
`"mcp": "written"` and `"agent": {"state": "would write"}`, and writes nothing: the folder was still empty
afterwards. The `mcp` word should say "would write" in a preview.

Found by: running it in an empty folder, then `ls -A`.

## 3. Which line a passage's `line` names

A passage's `line` is the line of its section's heading plus any blank lines after it, so it names the heading
or a blank line, not the first line of the passage's text. In a note with `## Roll back` on line 5 and the text
on line 6, the hit says line 5; with a blank line between them, line 6 (the blank). That is a good place to
open a note, but the docs do not say which line it means.

Found by: `passages` on two small notes, and reading `chunks()` in `bowerbird_mcp.py`.

## 4. A quorum not yet met reads as unverified in `list` (not tested)

With the seal extensions and a quorum, `trust_tier` gives `unverified` to a version that people have sealed but
too few of them. `list` then cannot tell it from an unsealed one. A `quorum_short` field in `list` would let a
badge say "sealed, needs more reviewers".

Found by: reading `trust_tier` and `signed` in `bowerbird_mcp.py`. Not run.

## 5. The Obsidian plugin's plan names an HTTP API; this plugin uses the command line

Upstream's `prompts/obsidian-plugin.md` plans a read-only JSON API in `serve` (`/_api/passages`, `/_api/links`,
`/_api/check`) for the plugin. This plugin runs the command line instead (bbq Q5), so it needs no server and no
upstream change. When the plugin is offered upstream for `obsidian-plugin/`, say so, and that its transport is one
module, so an HTTP transport can replace it for mobile.
