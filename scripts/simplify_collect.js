// Simplify (simplify.jobs) collector. Simplify is an aggregator: "Apply" goes to the company's own ATS
// (Lever/Greenhouse/Ashby/Workday…), so this only COLLECTS for the company-site queue (PLAYBOOK).
// Reads the site's own search responses (multi_search) while the logged-in page scrolls, filters on
// structured fields, then opens each survivor's posting (min-years check) and its /jobs/click/<id>
// redirect (final ATS URL). Returns {total, out, skip} with out lines:
//   "tier\tid\tcompany\ttitle\tlocation\tposted_days\tats\tats_url"
async (page, ARGS = {}) => {
  page.setDefaultTimeout(15000);
  const DEADLINE = ARGS.deadline || Infinity;
  const KNOWN = ARGS.known || new Set();          // ids already applied/skipped
  const MAXDAYS = ARGS.maxDays || 7;             // tier 1 = posted ≤ 2 days, tier 2 = ≤ MAXDAYS
  const MAXMIN = (ARGS.a || {}).max_min_years ?? 1;
  const A = ARGS.a || {};
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  const PLACE = new RegExp(S.location_regex || (S.countries || []).join('|') || '$^', 'i');
  const kws = ARGS.kws || S.keywords;
  const hits = new Map(); let batch = [];
  page.on('response', async r => {
    if (!r.url().includes('multi_search')) return;
    try { const j = await r.json(); for (const s of j.results || []) for (const h of s.hits || []) { hits.set(h.document.id, h.document); batch.push(h.document.updated_date || 0); } } catch (e) {}
  });
  const cutoff = Date.now() / 1000 - MAXDAYS * 86400;
  for (const kw of kws) {
    if (Date.now() > DEADLINE) break;
    try {
      // sort=updated = newest first, so scrolling stops once results get older than MAXDAYS
      await page.goto('https://simplify.jobs/jobs?q=' + encodeURIComponent(kw) + '&experience_level=Entry+Level%2FNew+Grad&experience_level=Junior&sort=updated', {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.getByText(/^Found [\d,]+ jobs?$/).first().waitFor({timeout: 15000}).catch(() => {});
      await page.waitForTimeout(1500);
      for (let i = 0; i < 25; i++) {
        const n = hits.size; batch = [];
        // infinite scroll: mouse.wheel doesn't trigger it in a background tab, scrollIntoView does
        await page.locator('button[data-job-target]').last().scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(1300);
        if (hits.size === n || (batch.length && Math.min(...batch) < cutoff)) break;
      }
      await page.waitForTimeout(1000 + Math.random() * 1500);
    } catch (e) {}
  }
  const now = Date.now() / 1000;
  const OK = PLACE;
  const REMOTE_ANY = /Anywhere|Worldwide|Global/i;
  const want = ROLE;
  const bad = new RegExp([SENIOR.source, EXCL.source].join('|'), 'i');
  const skip = [], cand = [];
  for (const d of hits.values()) {
    const loc = [...(d.locations || []), ...(d.remote_locations || [])].join('; ');
    const days = Math.round((now - (d.start_date || d.updated_date || 0)) / 86400);
    if (KNOWN.has(d.id)) continue;
    if (!want.test(d.title) || bad.test(d.title)) continue;
    const geoOk = (d.physical_countries || []).some(c => OK.test(c)) || (d.remote_locations || []).some(l => OK.test(l) || REMOTE_ANY.test(l)) || OK.test(loc);
    if (!geoOk) continue;
    if (d.type && !/Full-Time|Contract/i.test(d.type)) { skip.push(`${d.id} ${d.type}: ${d.title} @ ${d.company_name}`); continue; }
    if (days > MAXDAYS) continue;
    cand.push({d, loc, days});
  }
  cand.sort((a, b) => a.days - b.days);
  const out = [];
  for (const {d, loc, days} of cand) {
    if (Date.now() > DEADLINE) break;
    try {
      // min years from the posting's requirement lines
      await page.goto(`https://simplify.jobs/p/${d.id}`, {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.getByText('About the job').first().waitFor({timeout: 12000}).catch(() => {});
      await page.waitForTimeout(1200);
      const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const yrs = [...t.matchAll(/(?:at least|minimum(?: of)?|min\.?)?\s*(\d{1,2})\s*(?:\+|\s*(?:-|–|to)\s*\d{1,2})?\s*(?:\+\s*)?(?:years?|yrs?)(?:'|’)?\s*(?:of\s+)?(?:\w+\s+){0,4}?experience/gi)].map(m => +m[1]).filter(n => n <= 10); // bigger numbers are company history ("15 years of experience" in About)
      const min = yrs.length ? Math.min(...yrs) : null;
      if (min !== null && min > MAXMIN) { skip.push(`${d.id} ${min}+ yrs: ${d.title} @ ${d.company_name}`); continue; }
      if (/(bachelor|degree|b\.?tech|b\.?e\.)[^.]{0,40}(required|mandatory|must)/i.test(t)) { skip.push(`${d.id} degree required: ${d.title} @ ${d.company_name}`); continue; }
      // final ATS URL
      const p = await page.context().newPage();
      let ats = '';
      try { await p.goto(`https://simplify.jobs/jobs/click/${d.id}`, {waitUntil: 'domcontentloaded', timeout: 30000}); await p.waitForTimeout(2500); ats = p.url(); }
      catch (e) { ats = p.url(); } finally { await p.close().catch(() => {}); }
      const host = (ats.match(/https?:\/\/([^/]+)/) || [])[1] || '';
      const kind = /lever\.co/.test(host) ? 'lever' : /greenhouse/.test(host) ? 'greenhouse' : /ashbyhq/.test(host) ? 'ashby'
        : /myworkdayjobs|workday/.test(host) ? 'workday' : /taleo|icims|successfactors|oraclecloud|brassring|jobvite/.test(host) ? 'account'
        : /smartrecruiters/.test(host) ? 'smartrecruiters' : /linkedin\.com/.test(host) ? 'linkedin' : /naukri\.com/.test(host) ? 'naukri' : host || '?';
      if (kind === 'workday' || kind === 'account') { skip.push(`${d.id} needs ATS account (${host}): ${d.title} @ ${d.company_name}`); continue; }
      out.push([days <= 2 ? 1 : 2, d.id, d.company_name, d.title, loc.slice(0, 80), days, kind, ats.split('?')[0]].join('\t'));
      await page.waitForTimeout(1500 + Math.random() * 1500);
    } catch (e) { skip.push(`${d.id} ERROR ${String(e.message).split('\n')[0].slice(0, 80)}`); }
  }
  return {total: hits.size, candidates: cand.length, out, skip};
}
