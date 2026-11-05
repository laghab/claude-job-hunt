# Answer bank

The only answers used in forms. Unknown question → ask, then add it here.

## Contact
- Name / email / phone:
- Links (portfolio, LinkedIn, GitHub):
- City and postcode (never a street address):

## Work
- Current role:
- Previous roles with real dates:
- Total experience:
- Years per skill (whole numbers where forms require it):

## Pay, notice, location
- Current salary policy (e.g. don't disclose; fallback when a form forces a number):
- Expected salary per location:
- Notice / relocate / work authorization / sponsorship:

## Education
-

## Approved free text
- Profile summary:
- Cover letter / why hire you:
- Why are you looking:

## Search settings
The `search` block below drives every collector; it starts empty and the collectors refuse to run until it's filled. `/setup` fills it from the resume and the interview:
- `keywords`: search terms for the roles you really fit (from the resume). `intern_keywords`: optional, for `linkedin_collect.py --intern`.
- `role_regex` titles to keep, `exclude_regex` titles to drop (seniority is always dropped), `intern_field_regex` / `intern_exclude_regex` fields allowed / dropped for internships.
- `countries`, `remote_anywhere`, `location_regex`: where jobs may be. `authorized_regex` / `authorized_iso3`: where you can work without sponsorship.
- Site extras (optional): `amazon_countries` (ISO3), `amazon_keywords`, `wellfound_roles` (role slugs), `instahyre_skills`, `post_queries`, `skip_companies` (regex), `wwr_categories`.

## Form values
Read by the scripts (`scripts/answers.py`). Keep in sync with the prose above. Regex fields are case-insensitive alternations.
```json
{
  "name": "", "email": "", "phone": "", "phone_country": "exact option text, e.g. India (+91)",
  "city": "City, State", "country": "", "postcode": "", "dob": "DD/MM/YYYY", "gender": "",
  "resume_file": "resume.pdf",
  "linkedin": "", "github": "", "website": "",
  "max_min_years": 1,
  "home_area": "regex of your home metro",
  "pay_floor_lpa": {"remote": 0, "home": 0, "other": 0},
  "expected_lpa": {"home": 0, "remote": 0, "other": 0},
  "expected_abroad_usd_month": 0,
  "current_ctc_number": "0",
  "skills": "skills you have used for real, e.g. linux|jenkins|gcp|bash",
  "learning": "skills you can say yes to but have no years in, e.g. docker|kubernetes",
  "linux_only": "linux|unix",
  "nationality": "e.g. indian (answers 'Are you an Indian national?')",
  "experience_yes": "topics to answer Yes on 'Have you worked on X?', e.g. ci/?cd|pipelines?|jenkins|linux",
  "experience_no": "topics to answer No on, e.g. gpus?|cuda|sap",
  "offer_floor_monthly": {"aed": 0, "usd": 0},
  "search": {
    "keywords": [], "intern_keywords": [],
    "role_regex": "", "exclude_regex": "", "intern_field_regex": "", "intern_exclude_regex": "",
    "countries": [], "remote_anywhere": false, "remote": false,
    "location_regex": "", "authorized_regex": "", "authorized_iso3": [],
    "amazon_countries": [], "amazon_keywords": [], "wellfound_roles": [], "instahyre_skills": [],
    "post_queries": [], "skip_companies": "", "wwr_categories": []
  },
  "years": {"skill": 0.5, "skill_int": 1, "total": 0.5, "total_int": 1, "linux": 1},
  "text": {
    "current_ctc": "", "notice": "", "relocate": "", "linux_years": "", "total_exp": "",
    "skill_yes": "", "skill_no": "", "cloud": "", "join": "", "why_hire": ""
  },
  "amazon": {
    "current_employer": "", "skills": "", "education": "", "school": "", "area": "", "student": "Yes|No", "degree_completed": "Yes|No",
    "graduation": "YYYY-MM-DD", "relevant_experience": "Yes|No", "heard": "Job Posting", "heard_detail": "LinkedIn.com",
    "work_experience": "0 - 2 years", "citizenship": "", "government": "NEVER", "previously_applied": "NO",
    "previously_employed": "NO", "non_compete": "NO", "sponsorship": "NO", "sanctioned": "NO", "permanent_resident": "NO", "relocate": "YES"
  }
}
```
