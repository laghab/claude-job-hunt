// Hirist collector: browser_run_code_unsafe filename. Keywords and role filter come from answers.md `search`.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  page.setDefaultTimeout(12000);
  const KW = S.keywords.map(slug);
  const seen = new Map();
  for (const k of KW) {
    try {
      await page.goto(`https://www.hirist.tech/k/${k}-jobs`, {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.waitForSelector('a[href*="/j/"]', {timeout: 10000});
      await page.waitForTimeout(1500);
      const rows = await page.$$eval('a[href*="/j/"]', as => as.map(a => {
        let c = a; for (let i = 0; i < 6 && c.parentElement && !/yrs/i.test(c.innerText); i++) c = c.parentElement;
        return {url: a.href.split('?')[0], text: c.innerText.replace(/\s+/g, ' ').slice(0, 400)};
      }));
      for (const r of rows) if (!seen.has(r.url)) seen.set(r.url, r);
    } catch (e) {}
  }
  const bad = new RegExp([SENIOR.source, EXCL.source].join('|'), 'i');
  const out = [];
  for (const r of seen.values()) {
    const id = r.url.match(/-(\d{6,8})$/)?.[1];
    if (!id || bad.test(r.url)) continue;
    if (!ROLE.test(r.url.replace(/[-/]/g, ' '))) continue; // role filter on the slug
    const m = r.text.match(/(\d+)\s*-\s*(\d+)\s*yrs/i);
    if (!m || +m[1] > A.max_min_years) continue;
    out.push(r.url.replace('https://www.hirist.tech/j/', '') + ' || ' + r.text);
  }
  return {total: seen.size, n: out.length, out};
}
