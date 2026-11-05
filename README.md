# claude-job-hunt

A Claude Code workspace that runs your job search. Claude drives a real browser through the Playwright MCP, builds your profiles on every job site from your resume, and each day collects fresh listings, ranks them, and applies to the ones that fit.

You stay in charge of logins, captchas and anything sent to a person. Claude only uses facts from your resume and your answer bank.

## How it works

| Skill | When | What |
|---|---|---|
| `/setup` | once | Browser MCP, interview about what you want, logins, profiles on every site |
| `/add-site` | per site | Learn a site by hand once, then write its collect + apply scripts |
| `/resume` | once, then on changes | Any resume (PDF, DOCX, text) → LaTeX source, built and checked, with suggested fixes you approve |
| `/routine` | daily | Inbox → collect → rank → apply → outreach → record → report |
| `/outreach` | daily | Recruiter-post emails, referral asks, cold email to published addresses, follow-ups |

Rules live in [`CLAUDE.md`](CLAUDE.md), one place each. Skills are in [`.claude/skills/`](.claude/skills) and load only when used.

## Scripts

Working collectors and apply scripts for LinkedIn (Easy Apply), Naukri, Hirist, Instahyre, Wellfound, Cutshort and Amazon Jobs, plus collect-only Simplify and WeWorkRemotely. Helpers: `form_dump.js` (read any form in one call), `li_posts_collect.js` (recruiter posts with an email), `find_emails.sh` (addresses a company publishes). No personal values in code: roles, keywords, places and every answer come from the `## Form values` JSON block in your `answers.md`, injected at build time. Nothing is assumed about your field or country: until `/setup` has read your resume and filled the `search` block, the collectors refuse to run.

```sh
python3 -I scripts/linkedin_collect.py > li.tsv          # no browser
python3 -I scripts/linkedin_collect.py --intern > li_intern.tsv   # internships / trainee roles, any tech field
python3 -I scripts/build_run_all.py --li li.tsv --dry    # collect only; drop --dry to apply
# then in Claude Code: browser_run_code_unsafe filename=scripts/run_all.js
node tests/answers_test.js                               # what each script would answer to sample questions
```

Reading pages: text first, pixels last. `scripts/page_text.js` returns a page as compact text (dialogs, open dropdown options, buttons, errors; it walks shadow DOM) and `form_dump.js` lists every field with its label and options. Screenshots are only for captchas and visual checks. A stuck guard in `CLAUDE.md` stops retry loops: two failures or two no-change actions → switch method, at most three methods, then park it and move on.

`/add-site` covers new sites.

## Quick start

Needs: [Claude Code](https://claude.com/claude-code), Node 18+, Python 3, a Chromium browser (Brave, Chrome, Chromium).

```sh
gh repo create my-job-hunt --private --template laghab/claude-job-hunt --clone
cd my-job-hunt
cp ~/path/to/your-resume.pdf resume/   # PDF, DOCX or text; /setup turns it into LaTeX
claude
> /setup
```

Then every day: `claude` → `/routine`.

## Your data

Everything personal (`profile.md`, `answers.md`, `applied.md`, `outreach.md`, the browser profile, your resume) is in `.gitignore`, so a public fork stays clean. To back it up, use a **private** copy and remove those lines from `.gitignore`.

## Ground rules

- Facts come only from your resume and `answers.md`. No invented experience.
- You type every password and phone OTP. Claude never stores credentials.
- Nothing goes to a recruiter without your approval of the exact text, unless you give standing approval in `outreach.md`.
- Human pacing: one tab per site, pauses between applies. Getting flagged costs more than a slow day.

Automating applications can break a site's terms of service. Read them and use this at your own risk.

## Credits

The rank / tailor / outcome loop is adapted from [ai-job-search-dev/ai-job-search](https://github.com/ai-job-search-dev/ai-job-search). Built from a personal pipeline that ran daily across Naukri, LinkedIn, Hirist, Instahyre, Wellfound and Cutshort.

MIT licensed.
