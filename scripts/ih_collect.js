// Instahyre: search API over many skills, return unapplied relevant ids.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  await page.goto('https://www.instahyre.com/candidate/opportunities/', {waitUntil: 'domcontentloaded'}).catch(() => {});
  const seen = new Map();
  for (const sk of (S.instahyre_skills || S.keywords)) {
    for (const yrs of [0, 1]) {
      const r = await page.request.get(`https://www.instahyre.com/api/v1/job_search?company_size=0&job_type=0&skills=${encodeURIComponent(sk)}&status=0&years=${yrs}&limit=35&offset=0`);
      if (r.status() === 429) { await page.waitForTimeout(10000); continue; }
      if (r.status() !== 200) continue;
      for (const o of (await r.json()).objects || []) if (!seen.has(o.id)) seen.set(o.id, `${o.title} @ ${o.employer?.company_name} | ${o.locations || ''}`);
      await page.waitForTimeout(1500);
    }
  }
  const want = ROLE;
  const bad = new RegExp([SENIOR.source, EXCL.source].join('|'), 'i');
  return [...seen.entries()].filter(([, t]) => want.test(t.split('@')[0]) && !bad.test(t.split('@')[0])).map(([id, t]) => `${id} ${t}`);
}
