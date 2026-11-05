// Naukri collector: browser_run_code_unsafe filename. Keywords and role filter come from answers.md `search`.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  page.setDefaultTimeout(12000);
  const QUERIES = S.keywords.map(k => slug(k) + '-jobs').concat(S.remote ? S.keywords.map(k => slug(k) + '-jobs?wfhType=2') : []);
  const seen = new Map();
  for (const q of QUERIES) {
    const url = `https://www.naukri.com/${q}${q.includes('?') ? '&' : '?'}experience=1&jobAge=2`;
    for (let tryN = 0; tryN < 2; tryN++) {
      try {
        await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
        await page.waitForSelector('.srp-jobtuple-wrapper', {timeout: 10000});
        await page.waitForTimeout(800);
        const rows = await page.$$eval('.srp-jobtuple-wrapper', ts => ts.map(t => { const g = s => t.querySelector(s)?.innerText?.trim() || ''; return {title: g('a.title'), comp: g('.comp-name'), exp: g('.expwdth'), sal: g('.sal-wrap'), loc: g('.locWdth'), url: t.querySelector('a.title')?.href?.split('?')[0]}; }));
        for (const r of rows) if (r.url && !seen.has(r.url)) seen.set(r.url, r);
        break;
      } catch (e) {}
    }
  }
  const want = ROLE;
  const bad = new RegExp([SENIOR.source, EXCL.source, 'intern|trainee'].join('|'), 'i');
  const ncr = new RegExp(A.home_area, 'i');
  const out = [];
  for (const r of seen.values()) {
    const id = r.url.match(/(\d{12})$/)?.[1];
    if (!id) continue;
    if (!want.test(r.title) || bad.test(r.title) || /walk-in/i.test(r.url)) continue;
    const m = r.exp.match(/(\d+)\s*-\s*(\d+)/); if (!m || +m[1] > A.max_min_years) continue;
    const s = r.sal.match(/([\d.]+)\s*-\s*([\d.]+)\s*Lacs/i); const maxSal = s ? +s[2] : null;
    const floor = /remote/i.test(r.loc) ? A.pay_floor_lpa.remote : ncr.test(r.loc) ? A.pay_floor_lpa.home : A.pay_floor_lpa.other;
    if (maxSal !== null && maxSal < floor) continue;
    out.push(r.url.replace('https://www.naukri.com/job-listings-', '') + ' || ' + [r.title, r.comp, r.exp, r.sal || '-', r.loc].join(' | '));
  }
  return {total: seen.size, n: out.length, out};
}
