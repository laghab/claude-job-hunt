#!/usr/bin/env python3
# WeWorkRemotely collector (RSS, no browser). Prints junior ops/support roles open to
# "Anywhere in the World" / India / Asia, posted in the last 7 days. WWR applies go to company
# sites, so results feed the company-site queue (PLAYBOOK).
import re, html, sys, urllib.request
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

CATS = ['remote-devops-sysadmin-jobs', 'remote-customer-support-jobs', 'remote-back-end-programming-jobs']
WANT = re.compile(r'devops|sre|site reliability|cloud|infra|platform|system|linux|it support|support (engineer|specialist)|technical support|helpdesk|noc|operations engineer|case resolution', re.I)
BAD = re.compile(r'senior|sr\.|lead|manager|director|principal|staff|head|architect|sales|account (manager|executive)|recruit|marketing|designer|\.net|java\b|intern\b|french|german|arabic|spanish', re.I)
OKREG = re.compile(r'Anywhere in the World|India|Asia|APAC', re.I)
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
