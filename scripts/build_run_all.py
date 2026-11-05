#!/usr/bin/env python3
"""Build scripts/run_all.js: one browser_run_code call that opens one tab per site and
collects + applies on all of them in parallel, each stopping itself at a shared deadline.

Usage: python3 -I scripts/build_run_all.py [--minutes 40] [--li scratch/li_out.tsv] [--sites naukri,hirist,...] [--dry]
  --li     output of scripts/linkedin_collect.py (tier-1 rows are applied; tier 2 only with --tier2)
  --dry    collect everything, apply nothing (timing / parsing check)
"""
import argparse, importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ALL_SITES = ['naukri', 'hirist', 'wellfound', 'instahyre', 'cutshort', 'linkedin', 'simplify', 'amazon']

ap = argparse.ArgumentParser()
ap.add_argument('--minutes', type=int, default=40)
ap.add_argument('--li', default='')
ap.add_argument('--sites', default=','.join(ALL_SITES))
ap.add_argument('--tier2', action='store_true')
ap.add_argument('--dry', action='store_true')
ap.add_argument('--no-amazon-submit', action='store_true')
a = ap.parse_args()
sites = [s for s in a.sites.split(',') if s]


def js(name):
    """Script body as a JS expression (leading // comment lines dropped)."""
    src = open(os.path.join(HERE, name)).read()
    return re.sub(r'^(\s*//[^\n]*\n)+', '', src).strip().rstrip(';')


_spec = importlib.util.spec_from_file_location('answers', os.path.join(HERE, 'answers.py'))
_mod = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mod)
ANSWERS = _mod.load()  # '## Form values' block of answers.md

applied = open(os.path.join(ROOT, 'applied.md')).read()
known = sorted(set(re.findall(r'naukri\.com/job-listings-\S*?(\d{12})\b', applied))
               | set(re.findall(r'hirist\.tech/j/\S*?-(\d{6,8})\b', applied))
               | set(re.findall(r'wellfound\.com/jobs/(\d+)', applied))
               | set(re.findall(r'instahyre\.com/job-(\d+)', applied))
               | set(re.findall(r'amazon\.jobs/(?:en(?:-[a-z]{2})?/)?jobs/(\d{6,9})\b', applied))
               | set(re.findall(r'simplify\.jobs/p/([0-9a-f-]{36})', applied)))

skip_path = os.path.join(ROOT, 'skipped.txt')  # ids that failed for permanent reasons (degree, 4+ yrs, off-profile, closed)
skipped = set(l.split()[0] for l in open(skip_path) if l.strip() and not l.startswith('#')) if os.path.exists(skip_path) else set()
known = sorted(set(known) | skipped)

li_ids = []
if a.li and os.path.exists(a.li):
    for line in open(a.li):
        f = line.rstrip('\n').split('\t')
        if len(f) >= 2 and f[1].isdigit() and (f[0] == '1' or (a.tier2 and f[0] == '2')) and f[1] not in applied and f[1] not in skipped:
            li_ids.append(f[1])

blocks = {
    'naukri': f"""tab('naukri', async p => {{
      const c = await ({js('naukri_collect.js')})(p, {{a: A}});
      const ids = c.out.map(l => l.split(' || ')[0]).filter(s => !KNOWN.has((s.match(/(\\d{{12}})$/) || [])[1]));
      return DRY ? {{found: ids, total: c.total}} : {{found: ids.length, res: await ({js('naukri_apply.js')})(p, {{ids, deadline: DEADLINE, a: A}})}};
    }})""",
    'hirist': f"""tab('hirist', async p => {{
      const c = await ({js('hirist_collect.js')})(p, {{a: A}});
      // fresh only: card text 'Posted N hours/days ago' up to 7 days ('weeks'/'month' dropped)
      const fresh = l => !/Posted (\\d+ )?(weeks?|months?|years?) ago|Posted [89] days|Posted \\d\\d days/i.test(l);
      const ids = c.out.filter(fresh).map(l => l.split(' || ')[0]).filter(s => !KNOWN.has((s.match(/-(\\d{{6,8}})$/) || [])[1]));
      return DRY ? {{found: ids, total: c.total}} : {{found: ids.length, res: await ({js('hirist_apply.js')})(p, {{ids, deadline: DEADLINE, a: A}})}};
    }})""",
    'wellfound': f"""tab('wellfound', async p => {{
      const c = await ({js('wellfound_collect.js')})(p, {{a: A}});
      const ids = c.out.map(l => l.split(' || ')[0]).filter(s => !KNOWN.has((s.match(/^(\\d+)/) || [])[1]));
      return DRY ? {{found: ids, total: c.total}} : {{found: ids.length, res: await ({js('wellfound_apply.js')})(p, {{ids, deadline: DEADLINE, a: A}})}};
    }})""",
    'instahyre': f"""tab('instahyre', async p => {{
      const c = await ({js('ih_collect.js')})(p, {{a: A}});
      const ids = c.map(l => l.split(' ')[0]).filter(s => !KNOWN.has(s));
      return DRY ? {{found: c}} : {{found: ids.length, res: await ({js('instahyre_apply.js')})(p, {{ids, deadline: DEADLINE, a: A}})}};
    }})""",
    'cutshort': f"""tab('cutshort', async p => DRY ? 'dry: cutshort scans and applies in one pass, skipped' : ({js('cutshort_apply.js')})(p, {{max: 30, deadline: DEADLINE, a: A}}))""",
    # Simplify = aggregator: collect only, output goes to the company-site queue (apply happens on the ATS)
    'simplify': f"""tab('simplify', async p => ({js('simplify_collect.js')})(p, {{known: KNOWN, a: A, deadline: DEADLINE, maxDays: {7 if a.tier2 else 2} }}))""",
    'amazon': f"""tab('amazon', async p => {{
      const c = await ({js('amazon_collect.js')})(p, {{a: A, maxDays: {7 if a.tier2 else 2}}});
      const ids = c.out.map(l => l.split(' || ')[0]).filter(s => !KNOWN.has(s));
      const auth = (A.search || {{}}).authorized_iso3 || []; const uae = c.out.filter(l => !auth.includes(l.slice(-3))).map(l => l.split(' || ')[0]); // abroad: needs sponsorship
      return DRY ? {{found: ids, total: c.total}} : {{found: ids.length, res: await ({js('amazon_apply.js')})(p, {{ids, uae, deadline: DEADLINE, a: A, submit: {json.dumps(not a.no_amazon_submit)}, resume: {json.dumps(os.path.join(ROOT, 'resume', ANSWERS.get('resume_file') or 'resume.pdf'))}}})}};
    }})""",
    'linkedin': f"""tab('linkedin', async p => DRY ? {{ids: LI}} : ({js('linkedin_apply.js')})(p, {{ids: LI, deadline: DEADLINE, a: A}}))""",
}

out = f"""// GENERATED by scripts/build_run_all.py — do not edit. Sites: {', '.join(sites)}; {a.minutes} min; dry={a.dry}
async (page) => {{
  const ctx = page.context(); const T0 = Date.now();
  const DEADLINE = T0 + {a.minutes} * 60000; const DRY = {json.dumps(a.dry)};
  const KNOWN = new Set({json.dumps(known)});
  const LI = {json.dumps(li_ids)};
  const A = {json.dumps(ANSWERS, ensure_ascii=False)};
  const tab = async (site, fn) => {{
    const p = await ctx.newPage(); const s = Date.now();
    try {{ const r = await fn(p); return {{site, secs: Math.round((Date.now() - s) / 1000), r}}; }}
    catch (e) {{ return {{site, err: String(e).slice(0, 300)}}; }}
    finally {{ await p.close().catch(() => {{}}); }}
  }};
  const out = await Promise.all([
    {(',' + chr(10) + '    ').join(blocks[s] for s in sites)}
  ]);
  return {{totalSecs: Math.round((Date.now() - T0) / 1000), out}};
}}
"""
dst = os.path.join(HERE, 'run_all.js')
open(dst, 'w').write(out)
print(f'wrote {dst}: sites={sites} minutes={a.minutes} dry={a.dry} known={len(known)} linkedin_ids={len(li_ids)}')
