---
name: add-site
description: Teach the pipeline a new job site, by applying once by hand and then writing its collect and apply scripts. Use for /add-site or when the user wants a site automated.
---

# Add a site

## 1. Learn it by hand
Through the Playwright MCP, search and apply to 1–2 fitting listings. Write a `PLAYBOOK.md` section for the site:
- search URL and filters (recent, experience level, location, remote)
- listing card selectors and how posting age / applicants / years show up
- the Apply flow: buttons, every question type seen, overlays
- the success signal (URL change, "Applied" label, counter)
- whether it's an aggregator. If Apply leaves the site for a company ATS, the site is collect-only and its output goes to the company-site queue.

## 2. Write the scripts
- `scripts/<site>_collect.js` (browser) or `.py` (when a public JSON/RSS/guest endpoint exists, so no browser is needed). Output one line per listing: id, title, company, location, age, link.
- `scripts/<site>_apply.js`: `async (page, {ids, deadline}) => [...]`.

Conventions:
- Take answers from `ARGS.a` (the `## Form values` block of `answers.md`, injected by `build_run_all.py` and `mk_*.sh`). Never hard-code personal values; add a key instead.
- `page.setDefaultTimeout(8000)`, try/catch per job, stop at `deadline`.
- Filter on role and minimum years, not just keywords.
- One line per job: `APPLIED`, `skip: <reason>`, `defer: <reason>` (not fresh), `pending: <what's needed>`.
- Verify success by a hard signal; anything unconfirmed is `pending`, never `APPLIED`.
- Covered buttons: `locator.evaluate(b => b.click())`. Infinite scroll in a background tab: `scrollIntoViewIfNeeded()` on the last card (mouse wheel doesn't fire).
- Never `.last()` on text inputs.

## 3. Wire it in
Add a block to `scripts/build_run_all.py` (it generates `scripts/run_all.js`): one tab per site, all with `Promise.all`, shared deadline under 50 min (the MCP drops calls at ~55 min). Ids already in `applied.md` / `skipped.txt` are filtered before applying.

## 4. Test
Collect only first and check the output by eye. Then apply to 2–3 jobs and confirm each one on the site.
