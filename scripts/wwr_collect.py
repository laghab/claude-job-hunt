#!/usr/bin/env python3
# WeWorkRemotely collector (RSS, no browser). Prints roles matching answers.md search.role_regex open to
# "Anywhere in the World" or your search.location_regex, posted in the last 7 days. WWR applies go to company
# sites, so results feed the company-site queue (PLAYBOOK).
import re, html, os, sys, urllib.request, importlib.util
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

_spec = importlib.util.spec_from_file_location('answers', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'answers.py'))
_ans = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_ans)
S = _ans.load().get('search') or {}
if not S.get('role_regex'):
    sys.exit('answers.md search block is empty: fill search.role_regex first')
# WWR category slugs, e.g. remote-devops-sysadmin-jobs, remote-back-end-programming-jobs, remote-customer-support-jobs
CATS = S.get('wwr_categories') or ['remote-devops-sysadmin-jobs', 'remote-back-end-programming-jobs', 'remote-full-stack-programming-jobs', 'remote-customer-support-jobs']
WANT = re.compile(S['role_regex'], re.I)
BAD = re.compile('|'.join(x for x in [r'senior|sr\.|lead|manager|director|principal|staff|head|architect', S.get('exclude_regex')] if x), re.I)
OKREG = re.compile('|'.join(x for x in ['Anywhere in the World', S.get('location_regex') or '|'.join(S.get('countries', []))] if x), re.I)
cutoff = datetime.now(timezone.utc) - timedelta(days=7)

for c in CATS:
    req = urllib.request.Request(f'https://weworkremotely.com/categories/{c}.rss', headers={'User-Agent': 'Mozilla/5.0'})
    x = urllib.request.urlopen(req, timeout=20).read().decode('utf8', 'ignore')
    for it in re.findall(r'<item>(.*?)</item>', x, re.S):
        g = lambda tag: html.unescape((re.search(f'<{tag}>(.*?)</{tag}>', it, re.S) or [None, ''])[1]).strip()
        title, region, link, date = g('title'), g('region'), g('link'), g('pubDate')
        try:
            if parsedate_to_datetime(date) < cutoff:
                continue
        except Exception:
            pass
        role = title.split(':', 1)[-1]
        if WANT.search(role) and not BAD.search(role) and OKREG.search(region or 'Anywhere'):
            print(f'{date[5:16]}\t{region}\t{title}\t{link}')
print('done', file=sys.stderr)
