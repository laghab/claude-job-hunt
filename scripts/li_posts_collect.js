// LinkedIn posts (past 24h) where a recruiter asks for CVs by email. Output: TSV lines
// keep<TAB>email<TAB>years<TAB>where<TAB>author<TAB>snippet   (keep = 1 fits, 0 = filtered, reason in years col)
async (page) => {
  const A = (typeof ARGS !== 'undefined' && ARGS.a) || /*ANSWERS*/{};
  const MAXY = A.max_min_years ?? 1;
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  const PLACE = new RegExp(S.location_regex || (S.countries || []).join('|') || '$^', 'i');
  const QS = S.post_queries || S.keywords.flatMap(k => [`hiring ${k} fresher`, `hiring ${k} share resume`, `${k} 0-2 years hiring email`]);
  const GOOD_LOC = new RegExp(PLACE.source + (S.remote_anywhere ? '|\\bRemote\\b' : ''), 'i');
  const BAD_LOC = /\b(USA|United States|US citizens|W2|H1B|Canada|UK only|Europe|Australia|Germany|Singapore|Philippines|Pakistan|Nigeria|Saudi|Qatar|UAE|Dubai|India)\b/i; // any place; GOOD_LOC wins
  const NOT = new RegExp([SENIOR.source, EXCL.source, 'sales|closer|commission|marketing|recruiter'].join('|'), 'i');
  const seen = new Set(); const out = [];
  for (const q of QS) {
    try {
      await page.goto('https://www.linkedin.com/search/results/content/?keywords=' + encodeURIComponent(q) + '&datePosted=%22past-24h%22&sortBy=%22date_posted%22');
      await page.waitForTimeout(5000);
      for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(1200); }
      const txt = await page.locator('main').innerText().catch(() => '');
      for (const b0 of txt.split(/\n(?=Feed post)/)) {
        const b = b0.replace(/\s+/g, ' ');
        const emails = [...new Set((b.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) || []).map(e => e.toLowerCase()))]
          .filter(e => !/linkedin\.com|example\.com/.test(e));
        if (!emails.length) continue;
        const key = emails.join(',');
        if (seen.has(key)) continue; seen.add(key);
        const author = (b.match(/^Feed post (?:\S+ )?(.{0,60}?) •/) || [])[1] || '';
        const ym = b.match(/(\d{1,2})\s*(?:\+|[-–to ]+\s*\d{1,2})?\s*(?:years?|yrs?)/i);
        const fresher = /fresher|freshers|entry[- ]level|0\s*[-–]\s*\d\s*(?:years?|yrs?)|graduates? welcome|intern/i.test(b);
        const miny = fresher ? 0 : ym ? parseInt(ym[1]) : null;
        const where = (b.match(GOOD_LOC) || b.match(BAD_LOC) || ['?'])[0];
        let why = '';
        if (!ROLE.test(b)) why = 'role';
        else if (NOT.test(b.slice(0, 300)) && !ROLE.test(b.slice(0, 300))) why = 'off-role';
        else if (BAD_LOC.test(b) && !GOOD_LOC.test(b)) why = 'location ' + where;
        else if (miny !== null && miny > MAXY) why = miny + '+ yrs';
        out.push([why ? 0 : 1, key, why || (miny === null ? '?' : miny), where, author, b.slice(0, 400)].join('\t'));
      }
    } catch (e) { out.push(['0', '-', 'error ' + q, '', '', String(e).slice(0, 80)].join('\t')); }
  }
  return out.sort().reverse().join('\n');
}
