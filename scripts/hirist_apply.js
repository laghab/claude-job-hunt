// Hirist apply with free-text screening answers from answers.md. SLUGS injected by mk_hi.sh.
async (page, ARGS = {}) => { // ARGS: {ids, deadline, a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const RX = s => new RegExp('^(' + s + ')$', 'i');
  const SLUGS = ARGS.ids || /*SLUGS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  page.setDefaultTimeout(10000);
  const HAVE = RX(A.skills);
  function ans(q, loc) {
    const s = q.toLowerCase();
    const ncr = new RegExp(A.home_area, 'i').test(loc), remote = /remote|work from home/i.test(loc);
    if (/previous|last drawn/.test(s) && /ctc|salary/.test(s)) return {stop:'previous CTC'};
    if (/current (ctc|salary|compensation|package)|present ctc|what is your ctc/.test(s)) return {val: A.text.current_ctc};
    if (/expected (ctc|salary|compensation)|(salary|ctc|compensation) expectation/.test(s)) return {val: (ncr ? A.expected_lpa.home : remote ? A.expected_lpa.remote : A.expected_lpa.other) + ' LPA'};
    if (/degree|graduat|bachelor|b\.?tech|cgpa|percentage|qualification/.test(s)) return {stop:'degree'};
    if (/notice/.test(s)) return {val: A.text.notice};
    if (/relocat/.test(s)) return {val: A.text.relocate};
    if (/where are you (located|based)|current(ly)? (location|located|based)|which city/.test(s)) return {val: A.city + (remote ? '.' : ', willing to relocate.')};
    if (/linux/.test(s) && /years|how (long|much)/.test(s) && !/,|and/.test(s.replace(/linux/,''))) return {val: A.text.linux_years};
    if (/(how many )?years.*experience|total experience|experience do you have\??$/.test(s) && !/ in | with /.test(s.replace(/experience do you have/,''))) return {val: A.text.total_exp};
    const m = s.match(/(?:years|experience).*?(?:in|with|on)\s+(.+?)\??$/);
    if (m) { const k = m[1].split(/,|\/|\band\b|&/).map(x=>x.trim()).filter(Boolean); return {val: k.every(x => HAVE.test(x)) ? A.text.skill_yes : A.text.skill_no}; }
    if (/(which|what kind of|what) cloud( platform)?/.test(s)) return {val: A.text.cloud};
    if (/immediately|join (within|in)/.test(s)) return {val: A.text.join};
    if (/why .*(suitable|fit|hire)|why should we/.test(s)) return {val: A.text.why_hire};
    if (/linkedin/.test(s) && /link|url|profile/.test(s)) return {val: A.linkedin};
    if (/github/.test(s) && /link|url|profile/.test(s)) return {val: A.github};
    if (/portfolio|website/.test(s) && /link|url/.test(s)) return {val: A.website};
    return {stop:'unknown'};
  }
  const res = [];
  for (const slug of SLUGS) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    try {
      await page.goto('https://www.hirist.tech/j/' + slug, {waitUntil:'domcontentloaded', timeout:40000}).catch(()=>{});
      await page.waitForTimeout(3500);
      const head = (await page.locator('body').innerText()).slice(0, 1500);
      if (/Applied|Already applied/i.test((await page.$$eval('button', bs => bs.map(b=>b.innerText).join(' '))))) { res.push(slug+' => already'); continue; }
      const loc = (head.match(/\d+ - \d+ (?:Yrs|yrs)[^\n]*\n?([^\n]*)/) || ['',''])[1] + ' ' + head;
      const apply = page.getByRole('button', {name: /^Apply$/});
      if (!(await apply.count())) { res.push(slug+' => skip: no Apply'); continue; }
      await apply.first().click(); await page.waitForTimeout(4000);
      if (/job\/applied/.test(page.url())) { res.push(slug+' => APPLIED (no questions)'); continue; }
      const boxes = page.locator('textarea');
      const n = await boxes.count();
      const qs = await page.$$eval('textarea', ts => ts.map(t => t.closest('div')?.parentElement?.innerText.split('\n').find(l => l.trim().length > 5 && !/characters left/.test(l)) || ''));
      const vals = []; let stop = '';
      for (const q of qs) { const a = ans(q, loc); if (a.stop) { stop = `STOP(${a.stop}): ${q}`; break; } vals.push(a.val); }
      if (stop || !n) { res.push(slug + ' => ' + (stop || 'no questions/unknown form: ' + page.url())); continue; }
      for (let i = 0; i < n; i++) await boxes.nth(i).fill(vals[i]);
      const other = await page.$$eval('input:not([type=hidden]):not([type=checkbox]), select', es => es.filter(e => e.offsetParent && !e.value).length);
      if (other) { res.push(slug + ' => STOP(non-text fields present)'); continue; }
      await page.getByRole('button', {name: /^(Next|Submit|Apply)$/}).first().click(); await page.waitForTimeout(4000);
      res.push(slug + ' => ' + (/job\/applied/.test(page.url()) ? 'APPLIED' : 'NOT CONFIRMED ' + page.url()) + ' || ' + qs.map((q,i)=>q.slice(0,50)+' -> '+vals[i].slice(0,40)).join(' ; '));
    } catch (e) { res.push(slug + ' => ERROR ' + String(e.message).split('\n')[0].slice(0,120)); }
  }
  return res;
}
