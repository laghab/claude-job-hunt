# Job search workspace

Claude runs the user's job search here. First run: `/setup`. Daily: `/routine`. New site: `/add-site`. New or changed resume: `/resume`.
Machine-specific facts (browser path, mail folder IDs) live in `CLAUDE.local.md` (gitignored, loaded automatically), written by `/setup`.

## Files
- `profile.md`: what the user wants. The filter for every listing.
- `answers.md`: the only answers allowed in forms. Its `## Form values` JSON block feeds the scripts.
- `PLAYBOOK.md`: per-site selectors, scripts and gotchas. One section per site; edit lines instead of appending.
- `sites.md`: account and profile state per site.
- `applied.md` (every application), `skipped.txt` (permanent rejects), `outcomes.md` (real replies), `log.md` (one line per run).
- `resume/`: `resume.tex` is the source of truth (built by the `resume` skill); browser uploads only work from inside this folder.

## Rules
### Facts and answers
- Facts come only from the resume and `answers.md`. Never invent experience, skills, a degree or numbers.
- Question not in `answers.md` → don't guess. Collect, ask in one batch, add the answer to `answers.md`.
- Dropdowns: click only an exact-match option, then read the field back. No Enter or first-option fallbacks.
- Free text: formal but human. Plain words, specific facts, no em dashes or AI phrasing.

### What to apply to
- Nothing is assumed about field, country or level: it all comes from the resume, `profile.md` and the `search` block in `answers.md`.
- Only listings that pass `profile.md`. Check `applied.md` and `skipped.txt` first; never apply twice.
- Fresh first: posted < 48 h, not reposted, < 100 applicants. Older ones only when the user asks.
- One tab per site, a few seconds between applies, longer on LinkedIn.
- Company ATS forms are fine. Skip ones that need an account with a password, a degree knockout the user fails, or a street address.
- Captcha: fill the form, leave the tab open, record `PENDING — captcha`, continue in a new tab. Never close it.
- Never trust a "submitted" toast. Confirm on the job page or by email.

### Accounts and people
- The user does logins, sign-ups and passwords. Never store them. Email OTPs may be read from the mail MCP; phone OTPs: ask.
- No messages to recruiters without approval of the exact text. No mass connection requests or bulk DMs.

### Browser: read text, not pixels
- Script first: anything past two or three clicks is one `browser_run_code_unsafe` script, not a click-snapshot loop.
- Read in this order, cheapest first: the site's own JSON API (`page.request` or the responses the page already fetches) → `scripts/page_text.js` (page as text, pierces shadow DOM, lists open dropdown options and errors) → `scripts/form_dump.js` (every field with label, options and value) → accessibility snapshot → screenshot.
- Screenshots only for captchas, visual layout checks, or after two text reads in a row came back empty or useless. Say which of those it is.

### Stuck guard (loops)
- Same action fails twice, or two actions in a row change nothing (URL, field value, page text) → stop. Read the page as text, then switch method: locator → page JS → site API → fresh tab.
- Never repeat a failed command unchanged. Before a retry, say what changed.
- At most three methods per sub-task and ~8 minutes per field, button or captcha. Then park it (`PENDING — <blocker>` in `applied.md`), note it in `log.md`, and move on.
- Credentials, captchas and facts you don't have: stop and ask the user, never loop on them.
- Manual typing (sign-ups, profile edits): letter by letter with random delays, ~70 wpm.
- User says stop / pause → close the script tabs at once. Stopping the MCP call doesn't stop code in the page.

### Reporting and docs
- Report fit quality and real replies, not "applied to N".
- A correction the user gives twice becomes a rule here. Site lessons go in `PLAYBOOK.md`. No dated history; git has it.
