---
name: resume
description: Turn any resume the user gives (PDF, DOCX, text, or a pasted CV) into resume/resume.tex built from the workspace template, compile it, verify it, then suggest only clear improvements for the user to approve. Use for /resume, "here's my resume", "update my resume", or when setup finds a resume that isn't LaTeX yet.
---

# Resume → LaTeX

The `.tex` file is the source of truth from now on. Every PDF the job sites get is built from it.

## 1. Read the input
- PDF: `pdftotext -layout <file> -`. DOCX: `pandoc <file> -t plain` (install pandoc if missing). Pasted text: use it as is.
- Scanned PDF with no text layer: say so and ask for a text version. Don't OCR-guess names, dates or numbers.
- Pull out: contact, target title, summary, skills, every job (title, company, real dates, bullets), projects (with links), education, certifications.

## 2. Convert (facts unchanged)
- Copy `templates/resume.tex` to `resume/resume.tex` and fill it with the content exactly as given: same jobs, dates, numbers, wording. Conversion is not editing.
- Escape LaTeX specials (`& % $ # _ { } ~ ^ \`). Keep links as `\href`.
- Phone goes only inside the `\withphone` branch, so a public copy can be built without it.
- Build both copies:
  `cd resume && pdflatex -interaction=nonstopmode resume.tex` (public) and
  `pdflatex -interaction=nonstopmode -jobname=resume_phone "\def\withphone{}\input{resume.tex}"` (job sites).

## 3. Verify (every build)
- `pdfinfo` → 1 page (2 only if the user has 5+ years of experience and wants it).
- `pdftotext` → name, email, (phone in the job-site copy) and every section heading come out as text, in reading order. That's what ATS parsers see.
- No `Overfull \hbox` warnings that push text off the page, and no `??` from broken refs.
- Compare against the input: every job, date and number from the original is still there. List anything that dropped out.

## 4. Suggest improvements (ask, don't apply)
Show a short numbered list of only the clear wins, each with the before → after line. Typical ones:
- Missing sections a recruiter expects (education, links, contact) when the facts already exist in the input or `answers.md`.
- Summary that doesn't name the target role or the main tools.
- Bullets that start with "Responsible for" or describe duties instead of what was done.
- Skills mixed with tools still being learned (split them into a "Learning" line).
- Keywords the user really has but only mentions deep in a bullet (surface them in Skills).
- Inconsistent dates, tense or formatting; typos; over one page.
Never suggest invented metrics, skills, titles or degrees. If a bullet would be stronger with a number, ask the user for the real number.

Apply only what the user approves, rebuild, verify again, and show the final page as text (or one screenshot if they want to see the layout).

## 5. Hand off
- Copy the job-site build to the filename the uploads use (the one `answers.md` / `PLAYBOOK.md` name) and re-upload it on sites that keep a profile resume.
- Record the change in `log.md` (one line). Delete LaTeX aux files (`*.aux *.log *.out`).
