---
name: outreach
description: Daily outreach alongside applying: emails to recruiters who posted jobs, referral asks, cold email to companies, LinkedIn connects, follow-ups. Use for "do outreach", "send emails/DMs", or as part of the routine.
---

# Outreach

Board applications alone get few replies; a targeted message to a person gets several times more. Log every send in `outreach.md` and check it first so nobody gets a second first message.

## Channels, in priority order
1. **Recruiter posts with an email** (solicited, best odds): `scripts/li_posts_collect.js` (inject answers: `python3 -I scripts/answers.py < scripts/li_posts_collect.js > scripts/run_posts.js`, then run_code `scripts/run_posts.js`). Keep rows marked 1 that also pass `profile.md`. Reply with the resume attached, subject = the role as written in the post.
2. **Referral asks**: for each job applied to today at a company with more than ~50 staff, find 1–2 engineers there on LinkedIn and send a short connection note naming the job ID.
3. **Hiring manager / founder email**: startups from job boards and company team pages. Only addresses the person or company published.
4. **Company careers / HR addresses**: `scripts/find_emails.sh domain...` pulls addresses from the company's own pages. Prefer careers@ / hr@ / jobs@; info@ only for small firms; never sales@.
5. **LinkedIn connects** to recruiters who post roles you fit (no note on free accounts), then a short message after they accept.
6. **Follow-ups**: day 4 and day 9, as replies in the same thread. Stop after the second or after any reply.

## Limits (protect your sending address: it is also where job sites send OTPs)
- At most ~40 first-touch emails a day, spaced 1–3 min apart, one recipient per mail.
- Drop any address that bounces. More than 1 bounce in 20 in a day → stop cold email for the day and tell the user. Spam complaint or provider warning → stop everything.
- LinkedIn: ≤ 20 connection requests a day, ≤ 100 a week. Withdraw requests pending over 3 weeks.
- Never guess address patterns (firstname@company): bounces damage the domain.

## Writing
- 60–120 words, plain text, one link at most (the user's site), no tracking or shorteners.
- The first line is specific to the recipient: something real from their post, product or stack. If there is nothing specific, say plainly where the address came from.
- Facts only from the resume and `answers.md`. Never state current salary. Mirror 2–3 exact terms from the post where they are true for the user.
- No "I hope this finds you well", "passionate", "excited to", "leverage", em dashes, or a closing line that repeats the ask.
- Keep templates in `outreach.md`; rewrite the first line every time.

## Approval
- Default: show the user the exact text before anything is sent. If the user gives standing approval for templates, record the date in `outreach.md` and follow it.
- Replies from people: draft the answer from `answers.md` and show the user. Never agree to interview times, pay, or anything `answers.md` doesn't cover without asking.

## Record
- `outreach.md` log line per send: `date | path | who/company | channel | status, follow-up due`.
- A real reply → `outcomes.md`, mark the log line, include it in the report.
