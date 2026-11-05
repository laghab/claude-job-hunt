// Wellfound apply (no note). IDS injected by mk_wf.sh. Checks experience, hire region, pay floor; only sends when the form has no required fields.
async (page, ARGS = {}) => { // ARGS: {ids, deadline, max, a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const IDS = ARGS.ids || /*IDS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  page.setDefaultTimeout(12000);
  const res = [];
  for (const id of IDS) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    try {
      await page.goto('https://wellfound.com/jobs/' + id, {waitUntil:'domcontentloaded', timeout:40000}).catch(()=>{});
      await page.waitForTimeout(4000);
      const t = (await page.locator('body').innerText()).replace(/\n+/g,' | ');
      const title = (t.match(/\| ([^|]+) at ([^|]+) \|/) || [])[0] || '';
      if (/Applied|Application sent|You applied/i.test(t.slice(0, 1500)) && !/Apply \|/.test(t.slice(0,1500))) { res.push(id + ' => already? ' + title); continue; }
      const exp = +((t.match(/Experience \| (\d+)\+? years?/i) || [])[1] ?? 0);
      if (exp > A.max_min_years) { res.push(`${id} => skip: ${exp}+ yrs ${title}`); continue; }
      const hires = (t.match(/Hires remotely in \| ([^|]+)/i) || [])[1] || '';
      const loc = (t.match(/Location \| ([^|]+)/i) || [])[1] || '';
      const visa = /Visa sponsorship \| Available/i.test(t);
      const PLACE = new RegExp((A.search || {}).location_regex || ((A.search || {}).countries || []).join('|') || '$^', 'i');
      const okRegion = PLACE.test(hires) || /Everywhere|Worldwide|Anywhere/i.test(hires) || PLACE.test(loc);
      if (!okRegion) { res.push(`${id} => skip: region (hires: ${hires || '-'}, loc: ${loc}) ${title}`); continue; }
      const pay = t.match(/₹([\d.,]+)(L|k)?\s*[–-]\s*₹([\d.,]+)(L|k)?/);
      if (pay) {
        const toL = (v, u) => u === 'L' ? +v.replace(/,/g,'') : u === 'k' ? +v.replace(/,/g,'') * 12 / 100 : +v.replace(/,/g,'') * 12 / 100000;
        const max = toL(pay[3], pay[4]);
        const ncr = new RegExp(A.home_area, 'i').test(loc), remote = /remote/i.test(t.slice(0, 2500));
        const floor = remote ? A.pay_floor_lpa.remote : ncr ? A.pay_floor_lpa.home : A.pay_floor_lpa.other;
        if (max < floor) { res.push(`${id} => skip: pay ₹${max.toFixed(1)}L < ${floor} ${title}`); continue; }
      }
      const apply = page.locator('button:visible').filter({hasText: /^\s*Apply\s*$/}).first();
      if (!(await apply.count())) { res.push(id + ' => no Apply button ' + title); continue; }
      await apply.evaluate(b => b.click());
      await page.waitForTimeout(3000);
      const dlg = page.locator('[role=dialog], .ReactModal__Content').last();
      if (/does not support the locations on your profile/i.test(await dlg.innerText().catch(()=>''))) {
        const remoteJob = /remote/i.test(t.slice(0, 2500)) && (PLACE.test(hires) || /Everywhere|Worldwide|Anywhere/i.test(hires));
        const action = remoteJob ? 'living_in' : 'relocate_to';
        const city = remoteJob ? A.city.split(',')[0] : (loc.split(/[,•·]/)[0] || '').trim();
        await dlg.evaluate((el, a) => el.querySelector(`[id="form-input--qualification.location.action--${a}"]`)?.click(), action);
        const inp = dlg.locator('input[id="react-select-form-input--qualification.location.locationId-input"]');
        await inp.focus(); await page.keyboard.type(city, {delay: 70}); await page.waitForTimeout(2000);
        const opts = await page.$$eval('[id*="react-select"][id*="option"]', os => os.map(o => o.innerText.trim()));
        const idx = opts.findIndex(o => o.toLowerCase().startsWith(city.toLowerCase()) || (city === 'Delhi' && /^New Delhi/.test(o)));
        if (idx < 0) { res.push(`${id} => STOP: location question, no option for ${city} [${opts.slice(0,5).join('/')}] ${title}`); await page.keyboard.press('Escape').catch(()=>{}); continue; }
        await page.locator('[id*="react-select"][id*="option"]').nth(idx).evaluate(o => o.click()); await page.waitForTimeout(600);
      }
      const req = await dlg.locator('textarea[required], input[required]:not([type=hidden]), select[required], [aria-required=true]').count();
      const qs = await dlg.locator('textarea, select, input[type=radio], input[type=text]').count();
      const dtext = (await dlg.innerText().catch(()=>'')).replace(/\n+/g,' | ');
      if (req) { res.push(`${id} => STOP: form has ${qs} fields (${req} required) ${title} :: ${dtext.slice(dtext.indexOf('YOUR APPLICATION'), dtext.indexOf('YOUR APPLICATION') + 250)}`); await dlg.getByRole('button', {name: 'Cancel'}).click().catch(()=>{}); continue; }
      const note = dlg.locator('textarea').first();
      if (await note.count() && (await note.inputValue()).trim()) { res.push(id + ' => STOP: note prefilled'); continue; }
      await dlg.getByRole('button', {name: 'Send application'}).evaluate(b => b.click());
      await page.waitForTimeout(4000);
      const still = await page.locator('[role=dialog], .ReactModal__Content').last().innerText().catch(()=>'');
      if (/Send application/.test(still)) { res.push(`${id} => NOT SENT (form error) ${title} :: ${still.replace(/\n+/g,' | ').slice(0,200)}`); await page.keyboard.press('Escape').catch(()=>{}); continue; }
      res.push(`${id} => SENT ${title} | exp ${exp}+ | ${hires || loc}${pay ? ' | ' + pay[0] : ''}`);
      await page.waitForTimeout(3000);
    } catch (e) { res.push(id + ' => ERROR ' + String(e.message).split('\n')[0].slice(0,100)); await page.keyboard.press('Escape').catch(()=>{}); }
  }
  return res;
}
