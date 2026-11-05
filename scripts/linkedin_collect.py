# LinkedIn guest-API collector (no browser): Easy Apply, last 48h. Roles, keywords and places come from the
# `search` block in answers.md (--intern: internships). Prints tier\tid\ttitle\tcompany\tloc\tapplicants\tposted.
# Tier 1 = <100 applicants, not reposted, < 2 days old. Parallel requests keep it to a few minutes.
import re, os, sys, time, json, urllib.request, urllib.parse, html, importlib.util
from concurrent.futures import ThreadPoolExecutor

_spec = importlib.util.spec_from_file_location('answers', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'answers.py'))
_ans = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_ans)
MAX_MIN = _ans.load()['max_min_years']  # answers.md form values
applied = open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'applied.md')).read()
A = _ans.load()
S = A.get('search') or {}
INTERN = '--intern' in sys.argv  # internships / trainee roles (search.intern_keywords)
KW = S.get('intern_keywords' if INTERN else 'keywords') or []
if not KW or not S.get('role_regex'):
    sys.exit('answers.md search block is empty: fill search.keywords / role_regex (the setup skill does this from the resume)')
EXP = '1' if INTERN else '1,2,3'  # LinkedIn experience levels: 1 internship, 2 entry, 3 associate
SENIOR = r'senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b|\bii\b|\biii\b|\b[3-9]\+? ?years'
want = re.compile(r'intern|trainee|apprentice|fresher|graduate' if INTERN else S['role_regex'], re.I)
TECH = re.compile(S.get('intern_field_regex') or S['role_regex'], re.I)  # internships: field must match
bad = re.compile('|'.join(x for x in [SENIOR] + ([S.get('intern_exclude_regex')] if INTERN else [S.get('exclude_regex'), 'intern']) if x), re.I)
# location search params: each country (on-site + remote) plus remote-anywhere if allowed
LOCS = [(urllib.parse.quote(c), wt) for c in S.get('countries', []) for wt in ('&f_WT=2', '')]
if S.get('remote_anywhere'): LOCS.append(('Worldwide', '&f_WT=2'))
OKLOC = re.compile(S.get('location_regex') or '|'.join(map(re.escape, S.get('countries', []))) + (r'|^\s*(Worldwide|Remote|Anywhere)\s*$' if S.get('remote_anywhere') else ''), re.I)
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}

def get(url):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode('utf8', 'ignore')
        except Exception as e:
            time.sleep(3 + 4 * i)
    return ''

seen = {}
def search(args):
    kw, loc, wt, start = args
    u = ('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=%s&location=%s&f_AL=true&f_E=%s&f_TPR=r172800%s&start=%d'
         % (urllib.parse.quote(kw), loc, EXP, wt, start))
    h = get(u)
    return re.findall(r'data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title">\s*([^<]+?)\s*<[\s\S]*?base-search-card__subtitle">[\s\S]*?>\s*([^<]+?)\s*<[\s\S]*?job-search-card__location">\s*([^<]+?)\s*<', h)
tasks = [(kw, loc, wt, start) for kw in KW for loc, wt in LOCS for start in (0, 25)]
with ThreadPoolExecutor(6) as ex:
    for cards in ex.map(search, tasks):
        for jid, t, c, l in cards:
            seen.setdefault(jid, (html.unescape(t), html.unescape(c), l))

YR = re.compile(r'(\d+)\s*\+?\s*(?:(?:-|–|—|to)\s*\d+\s*\+?\s*)?(?:years?|yrs?)\b', re.I)
def min_years(page):
    """Lowest lower-bound of every 'N years of experience' style phrase in the posting text (0 if none). >1 means the listing needs 2+ yrs."""
    m = re.search(r'show-more-less-html__markup[^>]*>([\s\S]*?)</div>', page)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', m.group(1) if m else ''))
    t = re.sub(r'\s+', ' ', t)
    lows = []
    for x in YR.finditer(t):
        ctx = t[max(0, x.start() - 60):x.end() + 60]
        if re.search(r'experience|exp\b|expertise|hands-?on|relevant|work', ctx, re.I):
            lows.append(int(x.group(1)))
    for x in re.finditer(r'experience(?: level| required)?\s*[:\-–]\s*(\d+)', t, re.I):  # 'Experience: 6+' with no 'years'
        lows.append(int(x.group(1)))
    return min(lows) if lows else 0

def detail(item):
    jid, (t, c, l) = item
    if jid in applied or not want.search(t) or bad.search(t) or not OKLOC.search(l) or (INTERN and not TECH.search(t)):
        return None
    d = get('https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/' + jid)
    app = re.search(r'num-applicants__caption[^>]*>\s*([^<]+?)\s*<', d)
    app = app.group(1) if app else '?'
    posted = re.search(r'posted-time-ago__text[^>]*>\s*([^<]+?)\s*<', d)
    posted = posted.group(1) if posted else '?'
    if min_years(d) > MAX_MIN:
        return None
    n = re.search(r'(\d+)', app)
    over = 'Over' in app or (n and int(n.group(1)) >= 100)
    tier = 2 if (over or 'Reposted' in d[:20000] or re.search(r'\b([2-9]|\d\d) days?|week|month', posted)) else 1
    return (tier, jid, t, c, l, app, posted)
with ThreadPoolExecutor(6) as ex:
    out = [r for r in ex.map(detail, seen.items()) if r]

out.sort()
for r in out:
    print('\t'.join(map(str, r)))
print('total seen', len(seen), 'kept', len(out), 'tier1', sum(1 for r in out if r[0] == 1), file=sys.stderr)
