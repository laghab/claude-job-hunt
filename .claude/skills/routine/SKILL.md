---
name: routine
description: The daily job-search run. Use when the user says /routine, "run the routine" or "run the pipeline": inbox, refresh, collect, rank, apply, record, report.
---

# Daily routine

Target under an hour. CLAUDE.md rules apply throughout; site details are in PLAYBOOK.md. Ranking rules: [quality.md](quality.md).

1. **Inbox** (run it while step 3 works). Mail since the last `log.md` line, including Spam. Act on follow-ups (complete your application, screening, assessment) from `answers.md`. Record status changes in `applied.md` and real replies in `outcomes.md`. Trash handled job mail.
2. **Refresh**: if `resume/resume.tex` changed, rebuild it (`resume` skill). Re-upload the resume on sites that rank fresh uploads higher (PLAYBOOK says which).
3. **Collect** on every site (`scripts/*_collect.*`; `linkedin_collect.py --intern` too if `profile.md` has an Internships section), then **rank** ([quality.md](quality.md)). Show the user the A list; B goes ahead unattended.
4. **Apply**: one `browser_run_code_unsafe filename=scripts/run_all.js` for B. Company-site queue (aggregators, "apply on company site") in a separate tab, 1–2 at a time. A-grade: tailored note + resume, shown first.
5. **Outreach**: the `outreach` skill (recruiter posts with an email, referral asks for today's applications, follow-ups).
6. **Record**: `applied.md` (full link, `applied` or `PENDING — <what's needed>`), permanent failures in `skipped.txt`, one line in `log.md`, new site lessons in `PLAYBOOK.md`.
7. **Backup** (private repos only): `git status` must not list `browser-profile/`, `.playwright/` or `.env*`. Then commit and push.
8. **Report**: fit quality and real replies, plus what needs the user (captcha tabs, unanswered questions, A-grade approvals, recruiter replies).
