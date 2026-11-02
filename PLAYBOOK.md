# Playbook

Per-site facts that held in late 2026. Sites change their markup: when one breaks, fix the line here.

## Running scripts
- Run with `browser_run_code_unsafe filename=scripts/<file>.js`. Calls over 2 min go to the background. Keep each under ~50 min.
- Stopping the MCP task doesn't stop code in the page: close the tab, then check what went through.
- `globalThis` doesn't survive between run_code calls. Collect and filter in one call, or collect outside the browser.
- Uploads only work from files inside the workspace.

## LinkedIn
- Collect without the browser: `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<kw>&location=<place>&f_AL=true&f_E=1,2&f_TPR=r172800&start=<N>` (f_AL = Easy Apply, f_TPR = seconds since posting, f_WT=2 = remote). Details: `/jobs-guest/jobs/api/jobPosting/<id>`.
- Freshness on the logged-in job page: top card of `main` ("Reposted", "Over 100 applicants", "N days ago").
- Easy Apply is a native `dialog[open]`. Question text is in the input's `aria-label`; radio label = `radio.parentElement.parentElement.innerText`; click radios with `el.click()` in page JS.
- Free-text boxes for notice or salary are often number-validated: enter numbers. Year fields: whole numbers.
- Errors show as "Invalid input" / "This field is required". Leave via Dismiss → "Discard".
- Hard cases: "Location (city)" type-ahead and custom phone country-code pickers.

## Naukri (India)
- Search `/<kw>-jobs?experience=<yrs>&jobAge=<days>` (`wfhType=2` remote). Cards `.srp-jobtuple-wrapper`.
- Apply: `getByRole('button', {name:'Apply', exact:true})`; success URL contains `saveApply`/`myapply`. "Apply on company site" → company-site queue.
- Question drawer `[class*=chatbot_Drawer]`: question = last `li.botItem`, options `label.ssrc__label`, text `[contenteditable=true]`, send `.sendMsg`.
- Resume upload: `input.upload-input[type=file]` on /mnjuser/profile. Fresh uploads help ranking.

## Hirist / Instahyre / Cutshort / Wellfound (India, startups)
- Hirist: search `/k/<kw>-jobs`; some applies open /job/<id>/screening with textareas. Success URL /job/applied.
- Instahyre: search API `GET /api/v1/job_search?skills=<Skill>&years=<N>&limit=35&offset=<N>` via `page.request` (429s if hammered). Apply = "Apply now" → "Application sent!".
- Cutshort: cards hide years, so open each listing. Success = "Employer actions on your N applications" goes up by 1. No withdraw, so filter carefully.
- Wellfound: click Apply/Send with `element.click()`. Verify on /jobs/applications.

## Aggregators (collect-only)
- Simplify: `/jobs?q=<kw>&experience_level=Entry+Level%2FNew+Grad&experience_level=Junior&sort=updated`. Read the page's own `multi_search` responses (`start_date`, `physical_countries`, `remote_locations`). Apply → `/jobs/click/<id>` → company ATS.
- WeWorkRemotely: category RSS feeds. Himalayas: `himalayas.app/jobs/api/search?q=<kw>&country=<C>`.

## Company ATS forms
- Lever / Greenhouse / Ashby / Workable / SmartRecruiters: no account needed, fill from `answers.md`.
- Lever "Current location" is a type-ahead: type with `pressSequentially` and wait for the hidden `selectedLocation` to fill. After a failed submit, check the resume upload is still there.
- hCaptcha iframes are always in the DOM. Only a visible puzzle counts.
- Workday, Taleo, iCIMS, Oracle: per-company accounts. Skip, or leave them for the user.
