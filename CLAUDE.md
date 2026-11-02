# Job search workspace

Claude runs the user's job search here. First run: `/setup`. Daily: `/routine`. New site: `/add-site`.
Machine-specific facts (browser path, mail folder IDs) live in `CLAUDE.local.md` (gitignored, loaded automatically), written by `/setup`.

## Files
- `profile.md`: what the user wants. The filter for every listing.
- `answers.md`: the only answers allowed in forms.
- `PLAYBOOK.md`: per-site selectors, scripts and gotchas. One section per site; edit lines instead of appending.
- `sites.md`: account and profile state per site.
- `applied.md` (every application), `skipped.txt` (permanent rejects), `outcomes.md` (real replies), `log.md` (one line per run).
- `resume/`: browser uploads only work from inside this folder.

## Rules
### Facts and answers
- Facts come only from the resume and `answers.md`. Never invent experience, skills, a degree or numbers.
- Question not in `answers.md` → don't guess. Collect, ask in one batch, add the answer to `answers.md`.
- Dropdowns: click only an exact-match option, then read the field back. No Enter or first-option fallbacks.
- Free text: formal but human. Plain words, specific facts, no em dashes or AI phrasing.

### What to apply to
- Only listings that pass `profile.md`. Check `applied.md` and `skipped.txt` first; never apply twice.
- Fresh first: posted < 48 h, not reposted, < 100 applicants. Older ones only when the user asks.
- One tab per site, a few seconds between applies, longer on LinkedIn.
- Company ATS forms are fine. Skip ones that need an account with a password, a degree knockout the user fails, or a street address.
- Captcha: fill the form, leave the tab open, record `PENDING — captcha`, continue in a new tab. Never close it.
- Never trust a "submitted" toast. Confirm on the job page or by email.

### Accounts and people
- The user does logins, sign-ups and passwords. Never store them. Email OTPs may be read from the mail MCP; phone OTPs: ask.
- No messages to recruiters without approval of the exact text. No mass connection requests or bulk DMs.

### Browser
- Read pages with accessibility snapshots; screenshots only when stuck.
- Manual typing (sign-ups, profile edits): letter by letter with random delays, ~70 wpm.
- User says stop / pause → close the script tabs at once. Stopping the MCP call doesn't stop code in the page.

### Reporting and docs
- Report fit quality and real replies, not "applied to N".
- A correction the user gives twice becomes a rule here. Site lessons go in `PLAYBOOK.md`. No dated history; git has it.
