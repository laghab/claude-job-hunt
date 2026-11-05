# Playbook

Per-site facts that held in late 2026. Sites change their markup: when one breaks, fix the line here.

## Running scripts
- Run with `browser_run_code_unsafe filename=scripts/<file>.js`. Calls over 2 min go to the background. Keep each under ~50 min.
- Stopping the MCP task doesn't stop code in the page: close the tab, then check what went through.
- `globalThis` doesn't survive between run_code calls. Collect and filter in one call, or collect outside the browser.
- Uploads only work from files inside the workspace.
- Unknown form? `browser_run_code_unsafe filename=scripts/form_dump.js` returns every visible field (label, type, options, value) in one call; fill them all with one script. Shadow-DOM forms (SmartRecruiters) need Playwright locators instead (they pierce open shadow roots).
- Stuck guard: same action fails twice, or two actions change nothing → stop and switch method (locator → page JS → site API). Max three methods per sub-task, then park it and move on.
- Covered buttons: when Playwright's click times out, `locator.evaluate(b => b.click())`. Never target inputs with `.last()`.
- Background tabs don't fire infinite scroll on `mouse.wheel`; `scrollIntoViewIfNeeded()` on the last card does.

## LinkedIn
- Collect without the browser: `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<kw>&location=<place>&f_AL=true&f_E=1,2&f_TPR=r172800&start=<N>` (f_AL = Easy Apply, f_TPR = seconds since posting, f_WT=2 = remote). Details: `/jobs-guest/jobs/api/jobPosting/<id>`.
- Freshness on the logged-in job page: top card of `main` ("Reposted", "Over 100 applicants", "N days ago").
- Easy Apply button: match the exact accessible name (`/^Easy Apply( to .*)?$/`). Sidebar job cards are links whose text also contains "Easy Apply". "Responses managed off LinkedIn" means an external Apply.
- Easy Apply is a native `dialog[open]`. Question text is in the input's `aria-label`; radio label = `radio.parentElement.parentElement.innerText`; click radios with `el.click()` in page JS.
- Free-text boxes for notice or salary are often number-validated: enter numbers. Year fields: whole numbers.
- Errors show as "Invalid input" / "This field is required". Leave via Dismiss → "Discard".
- Phone country code is an unlabelled native select: detect it by "India (+91)" (or your code) in its options.
- "Location (city)" type-ahead: `pressSequentially`, click the `[role=option]` that starts with the city, read the input back before Next.
- Read questions literally. "Have you worked on X?" is answered only from `experience_yes` / `experience_no` in answers.md; anything else stops for the user. "Are you based in X?" is the true answer; relocation is a separate question.

## Naukri (India)
- Search `/<kw>-jobs?experience=<yrs>&jobAge=<days>` (`wfhType=2` remote). Cards `.srp-jobtuple-wrapper`.
- Apply: `getByRole('button', {name:'Apply', exact:true})`; success URL contains `saveApply`/`myapply`. "Apply on company site" → company-site queue.
- Question drawer `[class*=chatbot_Drawer]`: question = last `li.botItem`, options `label.ssrc__label`, text `[contenteditable=true]`, send `.sendMsg`.
- Resume upload: `input.upload-input[type=file]` on /mnjuser/profile. Fresh uploads help ranking.
- Skills get normalised into odd combos ("Perl / Shell Scripting"): check the chips after adding.

## Hirist / Instahyre / Cutshort / Wellfound (India, startups)
- Hirist: search `/k/<kw>-jobs`; some applies open /job/<id>/screening with textareas. Success URL /job/applied.
- Instahyre: search API `GET /api/v1/job_search?skills=<Skill>&years=<N>&limit=35&offset=<N>` via `page.request` (429s if hammered). Apply = "Apply now" → "Application sent!".
- Cutshort: cards hide years, so open each listing. Success = "Employer actions on your N applications" goes up by 1. No withdraw, so filter carefully.
- Wellfound: click Apply/Send with `element.click()`. Verify on /jobs/applications; "Scheduled · Undo" there means it sends when the timer ends.

## Aggregators (collect-only)
- Simplify: `/jobs?q=<kw>&experience_level=Entry+Level%2FNew+Grad&experience_level=Junior&sort=updated`. Read the page's own `multi_search` responses (`start_date`, `physical_countries`, `remote_locations`). Apply → `/jobs/click/<id>` → company ATS.
- WeWorkRemotely: category RSS feeds. Himalayas: `himalayas.app/jobs/api/search?q=<kw>&country=<C>`.

## Amazon Jobs
- Collect: `GET /en/search.json?base_query=<kw>&result_limit=100&sort=recent&country=<ISO3>` via `page.request` (`amazon_collect.js`). Basic qualifications are hard knockouts: skip any job whose basic quals ask for more years than you have.
- Apply: `/applicant/jobs/<id_icims>/apply` (`amazon_apply.js`), needs an amazon.jobs account. The wizard pre-fills from the profile; job-specific questions are `#application-questions .question[data-questionid]`. Unknown required question → returns `needs: <question>`, never a default Yes. `--no-amazon-submit` stops at Review.
- Success URL `/applicant/jobs/<id>/summary?result=success`. Job ids are numeric `id_icims`, not the UUID in search JSON.

## Company ATS forms
- Lever / Greenhouse / Ashby / Workable / SmartRecruiters: no account needed, fill from `answers.md`.
- Lever "Current location" is a type-ahead: type with `pressSequentially` and wait for the hidden `selectedLocation` to fill. After a failed submit, check the resume upload is still there.
- hCaptcha iframes are always in the DOM. Only a visible puzzle counts.
- SmartRecruiters (oneclick-ui): fields live in shadow DOM and ids repeat on the wrapper, so target `input#<id>` / `textarea#<id>`. The City type-ahead option text is `display: contents`: click its parent's bounding box, then read the input back. Screening is on a second page (degree and CTC questions often live there).
- Degree questions ("type of degree you graduated from", required) are knockouts if you have none: stop, don't guess.
- Workday, Taleo, iCIMS, Oracle: per-company accounts. Skip, or leave them for the user.

## Outreach helpers
- `scripts/li_posts_collect.js`: LinkedIn posts from the last 24 h where a recruiter asks for CVs by email (inject answers with `scripts/answers.py`). Keep rows marked 1 that also pass `profile.md`.
- `scripts/find_emails.sh domain...`: addresses published on a company's own pages (same domain only). Use only published addresses; guessed patterns bounce and hurt your sender reputation.
