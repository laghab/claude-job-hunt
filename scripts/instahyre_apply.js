// Instahyre one-click apply. IDS injected by mk_ih.sh. Skips jobs whose minimum experience > A.max_min_years.
async (page, ARGS = {}) => { // ARGS: {ids, deadline, max, a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const IDS = ARGS.ids || /*IDS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  page.setDefaultTimeout(12000);
  const res = [];
  for (const id of IDS) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    try {
      await page.goto(`https://www.instahyre.com/job-${id}/`, {waitUntil:'domcontentloaded', timeout:40000}).catch(()=>{});
      await page.waitForTimeout(3500);
      const t = (await page.locator('body').innerText()).replace(/\n+/g,' | ');
      if (/429|Too Many Requests/i.test(t.slice(0,300))) { res.push(id + ' => RATE LIMITED, stopping'); break; }
      const head = (t.match(/\| ([^|]+) \| at ([^|]+) \| ([^|]+) \| (\d+)\s*-\s*(\d+) Years/) || []);
      const min = head[4] ? +head[4] : null;
      if (/Application sent|Applied/i.test(t.match(/\d+\s*-\s*\d+ Years[^]{0,80}/)?.[0] || '')) { res.push(id + ' => already'); continue; }
      if (min !== null && min > A.max_min_years) { res.push(`${id} => skip: ${min}+ yrs (${head[1]} @ ${head[2]})`); continue; }
      const btn = page.locator('text=Apply now').first();
      if (!(await btn.count())) { res.push(id + ' => no Apply button: ' + page.url()); continue; }
      await btn.evaluate(b => b.click());
      await page.waitForTimeout(3500);
      const after = (await page.locator('body').innerText()).replace(/\n+/g,' | ');
      const fields = await page.$$eval('.modal input:not([type=hidden]), .modal textarea, .modal select', es => es.filter(e => e.offsetParent).length);
      res.push(`${id} => ${/Application sent/i.test(after) ? 'APPLIED' : fields ? 'FORM SHOWN (not handled)' : 'NOT CONFIRMED'} | ${head[1] || '?'} @ ${head[2] || '?'} | ${head[3] || ''} | ${min ?? '?'}-${head[5] ?? '?'} yrs`);
      await page.waitForTimeout(5000);
    } catch (e) { res.push(id + ' => ERROR ' + String(e.message).split('\n')[0].slice(0,100)); }
  }
  return res;
}
