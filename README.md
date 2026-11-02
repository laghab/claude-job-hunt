# claude-job-hunt

A Claude Code workspace that runs your job search. Claude drives a real browser through the Playwright MCP, builds your profiles on every job site from your resume, and each day collects fresh listings, ranks them, and applies to the ones that fit.

You stay in charge of logins, captchas and anything sent to a person. Claude only uses facts from your resume and your answer bank.

## How it works

| Skill | When | What |
|---|---|---|
| `/setup` | once | Browser MCP, interview about what you want, logins, profiles on every site |
| `/add-site` | per site | Learn a site by hand once, then write its collect + apply scripts |
| `/routine` | daily | Inbox → collect → rank → apply → record → report |

Rules live in [`CLAUDE.md`](CLAUDE.md), one place each. Skills are in [`.claude/skills/`](.claude/skills) and load only when used.

## Scripts

Working collectors and apply scripts for LinkedIn (Easy Apply), Naukri, Hirist, Instahyre, Wellfound, Cutshort, plus collect-only Simplify and WeWorkRemotely. No personal values in code: everything comes from the `## Form values` JSON block in your `answers.md`, injected at build time.

```sh
python3 -I scripts/linkedin_collect.py > li.tsv          # no browser
python3 -I scripts/build_run_all.py --li li.tsv --dry    # collect only; drop --dry to apply
# then in Claude Code: browser_run_code_unsafe filename=scripts/run_all.js
node tests/answers_test.js                               # what each script would answer to sample questions
```

The search keywords and role filters are tuned for junior DevOps / cloud / support roles in India and the UAE. Change the keyword lists and `want`/`bad` regexes at the top of each collector for other roles; `/add-site` covers new sites.

## Quick start

Needs: [Claude Code](https://claude.com/claude-code), Node 18+, Python 3, a Chromium browser (Brave, Chrome, Chromium).

```sh
gh repo create my-job-hunt --private --template laghab/claude-job-hunt --clone
cd my-job-hunt
cp ~/path/to/resume.pdf resume/resume.pdf
claude
> /setup
```

Then every day: `claude` → `/routine`.

## Your data

Everything personal (`profile.md`, `answers.md`, `applied.md`, the browser profile, your resume) is in `.gitignore`, so a public fork stays clean. To back it up, use a **private** copy and remove those lines from `.gitignore`.

## Ground rules

- Facts come only from your resume and `answers.md`. No invented experience.
- You type every password and phone OTP. Claude never stores credentials.
- Nothing goes to a recruiter without your approval of the exact text.
- Human pacing: one tab per site, pauses between applies. Getting flagged costs more than a slow day.

Automating applications can break a site's terms of service. Read them and use this at your own risk.

## Credits

The rank / tailor / outcome loop is adapted from [ai-job-search-dev/ai-job-search](https://github.com/ai-job-search-dev/ai-job-search). Built from a personal pipeline that ran daily across Naukri, LinkedIn, Hirist, Instahyre, Wellfound and Cutshort.

MIT licensed.
