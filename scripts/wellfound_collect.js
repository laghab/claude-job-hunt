// Wellfound collector: role pages from answers.md `search` (wellfound_roles or keywords, global + per country). Age/region/pay/exp are checked by wellfound_apply.js.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  page.setDefaultTimeout(15000);
  const base = S.wellfound_roles || S.keywords.map(slug);
  const roles = base.flatMap(r => ['r/' + r, ...(S.countries || []).map(c => `l/${r}/${slug(c)}`)]);
  const seen = new Map();
  for (const r of roles) {
    try {
      await page.goto(`https://wellfound.com/role/${r}`, {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.waitForTimeout(4000);
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(1200); }
      const rows = await page.$$eval('a[href*="/jobs/"]', as => as.map(a => {
        let c = a; for (let i = 0; i < 5 && c.parentElement && c.innerText.length < 60; i++) c = c.parentElement;
        return {href: a.href.split('?')[0], text: c.innerText.replace(/\s+/g, ' ').slice(0, 200)};
      }).filter(x => /\/jobs\/\d+/.test(x.href)));
      for (const x of rows) if (!seen.has(x.href)) seen.set(x.href, x.text);
    } catch (e) {}
  }
  const bad = new RegExp([SENIOR.source, EXCL.source].join('|'), 'i');
  const want = ROLE;
  const okPlace = new RegExp((S.location_regex || (S.countries || []).join('|') || '.') + '|Everywhere|Worldwide|Anywhere', 'i');
  const foreign = t => /United States|Canada|Europe|\bEU\b|\bUK\b|United Kingdom|India|Australia|Brazil|Germany|Singapore|UAE|Dubai|AMER|EMEA|APAC/i.test(t) && !okPlace.test(t);
  const old = /\b(\d+ )?(months?|years?) ago\b|[2-9] weeks ago/i;
  const out = [...seen.entries()]
    .filter(([h, t]) => want.test(t) && !bad.test(t.split('|')[0]) && !old.test(t) && !foreign(t))
    .map(([h, t]) => h.match(/\/jobs\/(\d+[^/]*)/)[1] + ' || ' + t.slice(0, 150));
  return {total: seen.size, n: out.length, out};
}
