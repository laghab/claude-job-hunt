// Amazon Jobs collector: public search.json through the logged-in page's request context.
// Filters to search.amazon_countries, posted within MAXDAYS, and jobs whose basic qualifications ask
// for at most A.max_min_years years. Returns {total, out} with lines:
//   "id || title | location | posted | minYrs | url"
async (page, ARGS = {}) => { // ARGS: {a (answers), maxDays}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const MAXDAYS = ARGS.maxDays || 7;
  // Amazon basic qualifications are hard knockouts: any "N+ years" above the real total gets auto-rejected.
  const MAXMIN = A.years?.total ?? 0.5;
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  const PLACE = new RegExp(S.location_regex || (S.countries || []).join('|') || '$^', 'i');
  const KWS = S.amazon_keywords || S.keywords;
  const COUNTRIES = S.amazon_countries || []; // amazon.jobs ISO3 codes, e.g. IND
  if (!COUNTRIES.length) return {total: 0, n: 0, out: [], note: 'search.amazon_countries is empty'};
  const seen = new Map();
  const seenRole = new Set();

  const strip = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const minYears = text => {
    const nums = [...strip(text).matchAll(/(\d+)\s*(?:\+|plus)?\s*(?:-|–|to)?\s*\d*\s*\+?\s*years?/gi)].map(m => +m[1]);
    return nums.length ? Math.max(...nums) : 0;
  };
  const skipTitle = t => {
    if (/\b(senior|sr\.?|principal|staff|manager|director|head|lead)\b/i.test(t)) return true;
    const relevant = ROLE.test(t) || /\b(intern|apprentice)\b/i.test(t);
    const offHard = EXCL.test(t) || /\b(facilities|logistics|instock|warehouse|transportation|supply chain|construction)\b/i.test(t);
    return !relevant || offHard;
  };

  for (const country of COUNTRIES) {
    for (const kw of KWS) {
      try {
        const url = `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(kw)}&result_limit=100&sort=recent&country=${country}`;
        const r = await page.request.get(url, {timeout: 30000});
        if (!r.ok()) continue;
        const d = await r.json();
        for (const j of d.jobs || []) {
          if (j.country_code !== country) continue;
          const id = String(j.id_icims || '').trim();
          if (!/^\d{6,9}$/.test(id) || seen.has(id)) continue;
          const title = String(j.title || '').trim();
          if (!title || skipTitle(title)) continue;
          const posted = Date.parse(j.posted_date);
          if (!Number.isFinite(posted)) continue;
          const days = Math.floor((Date.now() - posted) / 86400000);
          if (days < 0 || days > MAXDAYS) continue;
          const min = minYears(j.basic_qualifications);
          if (min > MAXMIN) continue;
          const loc = String(j.location || '').replace(/^[A-Z]{2},\s*/, '');
          const roleKey = `${title.toLowerCase()}|${loc.toLowerCase()}`;
          if (seenRole.has(roleKey)) continue;
          seenRole.add(roleKey);
          const path = String(j.job_path || `/en/jobs/${id}`).replace(/^\/en-[a-z]{2}\//, '/en/');
          const link = 'https://www.amazon.jobs' + path;
          seen.set(id, `${id} || ${title} | ${loc} | ${j.posted_date} | min ${min}y | ${link} | ${country}`);
        }
      } catch (e) { /* one bad query should not kill the rest */ }
    }
  }
  return {total: seen.size, out: [...seen.values()]};
}
