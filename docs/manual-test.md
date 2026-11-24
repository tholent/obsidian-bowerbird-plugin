# Manual test: the plugin in a live vault

The first run of the plugin in Obsidian itself. Unit tests and integration tests cover the plugin's code and
bowerbird-mcp's answers; nothing has yet checked what Obsidian shows. Use a throwaway vault, never your real
notes: setup writes files into the vault.

Write down for each step: pass, or what happened instead. Note the Obsidian version
(**Settings → About**) and `bowerbird-mcp --version`.

## Before you start

1. Build the plugin: `npm install && npm run build` in this repository.
2. Make a new vault in Obsidian, say `bb-test`, and close nothing else.
3. Copy `main.js`, `manifest.json` and `styles.css` into `bb-test/.obsidian/plugins/bowerbird/`.
4. In the vault, make these notes:
   - `a.md`: `See [[b]] and [[Missing]].`
   - `sub/b.md`: a heading `# B`, then `The second note.`
   - `deploy.md`: `# Deploy`, a blank line, `## Roll back`, then `To roll back a deploy, run the previous release again.`
5. **Settings → Community plugins**: turn on **Bowerbird**.

## 1. No bower.yaml yet

1. Open `a.md`. **Expect:** the status bar shows **No bower.yaml**.
2. Click it. **Expect:** a menu with **Set up this vault** and **Refresh**.
3. Choose **Set up this vault**. Leave **About** as it is; choose **Preview**. **Expect:** a list of the files
   bowerbird would write (`bower.yaml`, `.env`, `env.example`, `BOWERBIRD.md`, `.mcp.json`), and nothing written
   yet: `ls -A bb-test` shows only your notes and `.obsidian`.
4. Choose **Write these files**. **Expect:** a notice that names them; `bb-test/bower.yaml` holds
   `format: obsidian`.
5. **Expect:** within a few seconds, the badge says **Unsealed** in orange.

## 2. The seal badge and the hand-off

1. Click the badge. **Expect:** **Open in serve to seal**, **Copy terminal command**, **Refresh**.
2. Choose **Copy terminal command**. **Expect:** a notice showing
   `cd <vault> && <bowerbird-mcp> seal a.md --attest`; paste it into a terminal to check the clipboard (do not run
   it yet).
3. Make sure serve is not running (`bowerbird-mcp serve status`). Choose **Open in serve to seal**. **Expect:** a
   question, **Start serve?** Choose **Start serve**. **Expect:** your browser opens `a.md`'s page at
   `http://127.0.0.1:26937/a.md`.
4. In the browser, seal the note: the gear, **Seal…**, tick, type your id, confirm.
5. Come back to Obsidian (click into its window). **Expect:** within a few seconds the badge says **Sealed** in
   green.
6. Type a word into `a.md`. **Expect:** after a few seconds the badge says **Broken seal** in red.
7. Run the copied command in a terminal, from step 2. **Expect:** bowerbird records your seal; back in Obsidian,
   **Sealed** again.
8. Run **Bowerbird: Stop serve** from the command palette. **Expect:** a notice that serve stopped;
   `bowerbird-mcp serve status` says it is not running.

## 3. Search

1. Click the bird in the left ribbon. **Expect:** **Bowerbird search** opens in the right sidebar, with the cursor
   in its box.
2. Type `roll back a deploy` and press Enter. **Expect:** a hit for **Deploy · Deploy > Roll back**, with
   `deploy.md:<line>`, **unverified**, and the passage text.
3. Click the hit's title. **Expect:** `deploy.md` opens with the cursor on the **Roll back** heading, or the line
   just after it. Write down which line it lands on.
4. Search `zqxjvw`. **Expect:** **Gap: nothing in the collection answers this.**
5. Add a note `html.md` holding `<b>bold</b> rollback`, then search `rollback`. **Expect:** the hit text shows
   `<b>bold</b>` as typed, not in bold.

## 4. Note panel

1. Open `a.md`, then run **Bowerbird: Open the note panel**. **Expect:** the panel shows `a`, its seal in a box,
   **Lint (1)** with a dead link for `[[Missing]]`, **Links out (2)** with `[[b]] → sub/b.md` and `[[Missing]]`
   marked **broken**, **Links in (0)**, **Facts (0)**.
2. Click `[[b]]`. **Expect:** `sub/b.md` opens; the panel now shows **Links in (1)**: `a.md`.
3. Open `deploy.md`. **Expect:** the panel follows the active note.

## 5. Files lacking review, and lint

1. Run **Bowerbird: Files lacking review**. **Expect:** a list of the notes with **No review**, each with
   bowerbird's fix; `a.md` is not in it if you sealed it in part 2.
2. Click a file in the list. **Expect:** the list closes and the file opens.
3. Run **Bowerbird: Lint the whole vault**. **Expect:** the dead link in `a.md`, as a warning, with its fix.

## 6. New note from template

1. Open `sub/b.md`, run **Bowerbird: New note from template**. **Expect:** **Folder** says `sub`.
2. File name `runbook`, title `Runbook`, template **Markdown**; **Create**. **Expect:** `sub/runbook.md` opens,
   with a title.
3. Run it again with the same name. **Expect:** a notice that it already exists, and nothing written.

## 7. Trouble, said once

1. **Settings → Bowerbird → Command**: type `/nowhere/bowerbird-mcp`. Open a note. **Expect:** one notice saying
   how to install bowerbird-mcp, and the badge says **Bowerbird: trouble**. Switch notes a few times. **Expect:**
   no more notices.
2. Clear the setting, run **Bowerbird: Check setup again**. **Expect:** **Bowerbird: ready.**

## 8. Left out on purpose

Check that nothing in the plugin edits a note through bowerbird, draws a graph, or offers to seal by itself.

## Clean up

`bowerbird-mcp serve stop`, then delete the `bb-test` vault.
