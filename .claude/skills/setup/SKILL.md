---
name: setup
description: First-time setup of the job-search workspace. Use when the user runs /setup or the workspace has no profile.md yet. Browser MCP, interview, logins, site profiles.
disable-model-invocation: true
---

# Setup

Stop and ask whenever a step needs a login, a phone OTP, or a fact you don't have.

## 1. Browser
1. Find a Chromium browser (`which brave brave-browser google-chrome chromium`; macOS: `/Applications/<Browser>.app/Contents/MacOS/<Browser>`). Ask if none is found.
2. Add the MCP with its own profile so job logins stay out of the user's normal browser:
   ```sh
   claude mcp add playwright --scope local -- npx -y @playwright/mcp@latest \
     --executable-path "<BROWSER>" --user-data-dir "$PWD/browser-profile" --output-dir "$PWD/.playwright"
   ```
3. Ask the user to restart Claude Code and check `claude mcp list` shows it connected. Pin the version once things work.
4. Optional mail MCP (Gmail, Zoho, Outlook): note the IDs of Inbox, Spam and Trash.
5. Write `CLAUDE.local.md`: browser path, mail MCP and folder IDs, anything else specific to this machine.

## 2. Workspace
Copy each file in `templates/` to the repo root if it doesn't exist yet. Confirm `git status` doesn't list them (they're gitignored).

## 3. Interview
Assume nothing about the user's field, country or level until you have read their resume.
1. Run the `resume` skill on whatever resume they give (PDF, DOCX or text): it becomes `resume/resume.tex`, gets built and checked, and any clear improvements go to the user for approval.
2. Read the built resume: contact, jobs with real dates and what was done, projects, skills, education.
3. Fill `profile.md` and `answers.md` from it, including the `search` block (keywords and role regex from the roles the resume really supports, countries and authorized places from where they live and can work). Ask everything else in one batch: target roles and roles to avoid, locations and remote scope, pay floor per location, expected salary to state, current-salary policy, notice period, relocation, years to claim per skill, degree situation, the highest experience minimum to accept, dealbreakers.
4. Show both files, the `search` block in plain words ("I'll search for: …, in: …, skipping: …"), and apply the user's corrections.

## 4. Logins
1. Ask which sites to use. Suggest the big boards for their country and remote boards if they want remote.
2. Open one tab per site and say: "Log in or sign up in each tab, tell me when done."
3. Check each one is really logged in (snapshot: profile menu visible). Record it in `sites.md`.

## 5. Profiles
For each site, fill the profile from the resume and `answers.md` only: resume upload, headline, summary, every job, projects, skills, education as it really is, links, job preferences. Turn off marketing mail; keep recruiter messages and status updates. Note what's left in `sites.md`.

## 6. Scripts
Run `/add-site` for each site the user wants automated, starting with the one that has the most fitting listings.
