// Cutshort apply (empty message). Scans listing pages, applies to the first MAX jobs with min exp <= 1 not already applied.
async (page, ARGS = {}) => { // ARGS: {ids, deadline, max, a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const MAX = ARGS.max || /*MAX*/1;
  const DEADLINE = ARGS.deadline || Infinity;
  const S = A.search || {}; // roles, keywords and places from answers.md (filled by the setup skill from the resume)
  if (!(S.keywords || []).length || !S.role_regex) throw new Error('answers.md search block is empty: fill search.keywords / role_regex first');
  const slug = k => k.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ROLE = new RegExp(S.role_regex, 'i'), EXCL = new RegExp(S.exclude_regex || '$^', 'i');
  const SENIOR = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|\bvp\b/i;
  const PLACE = new RegExp(S.location_regex || (S.countries || []).join('|') || '$^', 'i');
  const SKIP = new RegExp(S.skip_companies || '$^', 'i'); // company slugs to ignore (agencies, spam)
  page.setDefaultTimeout(12000);
  const res = []; let sent = 0;
  const links = new Set();
  for (const u of S.keywords.map(k => `https://cutshort.io/jobs/${slug(k)}-jobs`)) {
    await page.goto(u, {waitUntil: 'domcontentloaded', timeout: 40000}).catch(() => {}); await page.waitForTimeout(5000);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 3000); await page.waitForTimeout(1200); }
    for (const l of await page.$$eval('a[href*="/job/"]', as => as.map(a => a.href.split('?')[0]))) if (!SKIP.test(l)) links.add(l);
  }
  const count = async () => { await page.goto('https://cutshort.io/profile/candidate-conversations', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => {}); await page.waitForTimeout(5000); return +(((await page.locator('body').innerText()).match(/your (\d+) applications/) || [])[1] ?? -1); };
  let before = await count();
  for (const l of [...links].slice(0, 40)) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    if (sent >= MAX) break;
    try {
      await page.goto(l, {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => {}); await page.waitForTimeout(3000);
      const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const m = t.match(/(\d+)\s*-\s*(\d+)\s*years/i);
      if (!m || +m[1] > A.max_min_years) continue;
      const slug = l.replace('https://cutshort.io/job/', '');
      if (!ROLE.test(slug.replace(/-/g, ' ')) || SENIOR.test(slug) || EXCL.test(slug)) continue;
      if (/senior|lead|architect|principal|manager|sales|presales|marketing|developer|dot-net|java|frontend|full-stack|data-|qa|test/i.test(slug)) continue;
      if (/Applied on|You have applied|Application sent/i.test(t.slice(0, 2000))) continue;
      const btn = page.locator('button[label="Apply to this job"]');
      if (!(await btn.count())) { res.push(l + ' => no apply button'); continue; }
      await btn.first().evaluate(b => b.click()); await page.waitForTimeout(2500);
      const now = page.getByRole('button', {name: /^Apply now$/i});
      if (await now.count()) { await now.first().evaluate(b => b.click()); await page.waitForTimeout(2500); }
      const dlg = page.locator('[role=dialog], [class*=modal]').last();
      const dtext = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const box = dlg.locator('textarea');
      if (await box.count() && (await box.first().inputValue()).trim()) { res.push(l + ' => STOP: message prefilled'); continue; }
      const send = dlg.getByRole('button', {name: /^(Send|Send application|Apply)$/i});
      if (!(await send.count())) { res.push(l + ' => STOP: no Send button :: ' + dtext.slice(0, 200)); continue; }
      await send.first().evaluate(b => b.click()); await page.waitForTimeout(3500);
      const now2 = await count();
      const ok = before >= 0 && now2 === before + 1;
      res.push(slug + ' => ' + (ok ? 'SENT' : `UNCONFIRMED (count ${before} -> ${now2}), stopping`) + ' | ' + m[0]);
      if (!ok) break;
      sent++; before = now2;
    } catch (e) { res.push(l + ' => ERROR ' + String(e.message).split('\n')[0].slice(0, 100)); }
  }
  return res;
}
