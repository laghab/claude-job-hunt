# LinkedIn guest-API collector (no browser): Easy Apply, last 48h, junior DevOps/cloud/support roles,
# India / UAE / remote-anywhere only, listing minimum <= 1 yr. Prints tier\tid\ttitle\tcompany\tloc\tapplicants\tposted.
# Tier 1 = <100 applicants, not reposted, < 2 days old. Parallel requests keep it to a few minutes.
import re, os, sys, time, json, urllib.request, urllib.parse, html, importlib.util
from concurrent.futures import ThreadPoolExecutor

_spec = importlib.util.spec_from_file_location('answers', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'answers.py'))
_ans = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_ans)
MAX_MIN = _ans.load()['max_min_years']  # answers.md form values
applied = open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'applied.md')).read()
KW = ['devops', 'devops engineer', 'junior devops', 'cloud engineer', 'site reliability engineer', 'sre',
      'platform engineer', 'linux administrator', 'system administrator', 'technical support engineer',
      'cloud support engineer', 'noc engineer', 'production support engineer', 'application support engineer',
      'build release engineer', 'jenkins', 'gcp', 'it support engineer', 'infrastructure engineer']
LOCS = [('India', '&f_WT=2'), ('India', ''), ('United%20Arab%20Emirates', ''), ('Worldwide', '&f_WT=2')]
OKLOC = re.compile(r'India|United Arab Emirates|Dubai|Abu Dhabi|Sharjah|^\s*(Worldwide|Remote|Anywhere)\s*$', re.I)  # India, UAE, remote-anywhere only
want = re.compile(r'devops|dev ops|cloud|sre|site reliability|linux|unix|system ?admin|systems? engineer|infrastructure|noc|support engineer|support analyst|technical support|it support|production support|application support|build|release|jenkins|kubernetes|platform engineer|operations engineer|ci/?cd', re.I)
bad = re.compile(r'senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b|sales|recruit|java|\.net|frontend|full ?stack|data engineer|data scien|\bqa\b|tester|test engineer|sap\b|oracle|salesforce|mainframe|embedded|intern|ii\b|iii\b|\b[3-9]\+? ?years', re.I)
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
    u = ('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=%s&location=%s&f_AL=true&f_E=1,2,3&f_TPR=r172800%s&start=%d'
         % (urllib.parse.quote(kw), loc, wt, start))
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
    if jid in applied or not want.search(t) or bad.search(t) or not OKLOC.search(l):
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
