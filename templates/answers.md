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

## Form values
Read by the scripts (`scripts/answers.py`). Keep in sync with the prose above. Regex fields are case-insensitive alternations.
```json
{
  "name": "", "email": "", "phone": "", "phone_country": "India (+91)",
  "city": "City, State", "country": "", "postcode": "", "dob": "DD/MM/YYYY", "gender": "",
  "linkedin": "", "github": "", "website": "",
  "max_min_years": 1,
  "home_area": "regex of your home metro, e.g. delhi|noida|gurgaon|ncr",
  "pay_floor_lpa": {"remote": 0, "home": 0, "other": 0},
  "expected_lpa": {"home": 0, "remote": 0, "other": 0},
  "expected_abroad_usd_month": 0,
  "current_ctc_number": "0",
  "skills": "skills you have used for real, e.g. linux|jenkins|gcp|bash",
  "learning": "skills you can say yes to but have no years in, e.g. docker|kubernetes",
  "linux_only": "linux|unix",
  "years": {"skill": 0.5, "skill_int": 1, "total": 0.5, "total_int": 1, "linux": 1},
  "text": {
    "current_ctc": "", "notice": "", "relocate": "", "linux_years": "", "total_exp": "",
    "skill_yes": "", "skill_no": "", "cloud": "", "join": "", "why_hire": ""
  }
}
```
