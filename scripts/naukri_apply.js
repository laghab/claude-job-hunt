// Naukri apply with chatbot answers from answers.md. Usage via browser_run_code_unsafe (filename).
// Edit SLUGS before each run.
async (page, ARGS = {}) => { // ARGS: {ids, deadline, a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const RX = s => new RegExp('^(' + s + ')$', 'i');
  const SLUGS = ARGS.ids || /*SLUGS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  const STRICT = /*STRICT*/true; // tier 1: fresh/not-reposted/<100 only; mk script with TIER2=1 sets false
  const HAVE = RX(A.skills);
  function answer(q, opts) {
    const s = q.toLowerCase();
    if (/previous|last drawn/.test(s) && /ctc|salary/.test(s)) return {stop: 'previous CTC'};
    if (/current (ctc|salary|package)|present ctc|in hand/.test(s)) return {text: A.current_ctc_number};
    if (/graduat|degree|b\.?\s?tech|bachelor|b\.?e\b|\bbca\b|\bbsc\b|percentage|cgpa|% in/.test(s)) return {stop: 'degree'};
    if (/expected (ctc|salary)/.test(s)) return {stop: 'expected CTC'};
    if (/(ever )?(been )?(employed|worked) (with|for|at)/.test(s)) return {text: 'No'};
    if (/notice period|how soon|join/.test(s)) {
      const o = opts.find(o => /immediate/i.test(o)) || opts.find(o => /15 days or less|0-15|less than 15/i.test(o));
      return o ? {opt: o} : {text: 'Immediate'};
    }
    if (/preferred (job )?location|which location|location preference/.test(s)) {
      const o = opts.find(o => /remote|work from home/i.test(o)) || opts.find(o => new RegExp(A.home_area, 'i').test(o));
      return o ? {opt: o} : {stop: 'location'};
    }
    if (/relocat/.test(s)) return opts.length ? {opt: opts.find(o => /^yes/i.test(o))} : {text: 'Yes'};
    if (/current location|where are you (currently )?(located|based)|which city/.test(s)) return {text: A.city};
    if (/legally authori[sz]ed|authori[sz]ed to work|work authori[sz]ation|eligible to work/.test(s)) return opts.length ? {opt: opts.find(o => /^yes/i.test(o))} : {text: 'Yes'};
    if (/if (no|not)[^.]*,? (enter|type|write) na/.test(s)) return {text: 'NA'};
    if (/sponsor/.test(s)) return opts.length ? {opt: opts.find(o => /^no/i.test(o))} : {text: 'No'};
    if (/pin ?code|postal code|zip/.test(s)) return {text: A.postcode};
    if (/date of birth|dob/.test(s)) return {text: A.dob};
    let m = s.match(/(?:how many )?years? of (?:work )?experience (?:do you have )?(?:in|with|on)\s+(.+?)\??$/) || s.match(/experience (?:in|with)\s+(.+?) \(in years\)/);
    if (m) {
      const skills = m[1].replace(/[?.]/g,'').split(/,|\/|\band\b|&/).map(x => x.trim()).filter(Boolean);
      if (skills.length && skills.every(k => RX(A.linux_only).test(k))) return {text: String(A.years.linux)};
      return {text: skills.every(k => HAVE.test(k)) ? String(A.years.skill) : '0'};
    }
    if (/total (years of )?experience|years of experience/.test(s)) return {text: String(A.years.total)};
    m = s.match(/(?:do you have|have you worked on|have you (?:got )?experience|are you (?:comfortable|familiar) with|hands.on) (?:experience )?(?:in|with|on)?\s*(.+?)\??$/);
    if (m && opts.length) {
      const skills = m[1].replace(/[?.]/g,'').replace(/experience/,'').split(/,|\/|\band\b|&/).map(x => x.trim()).filter(Boolean);
      const yes = skills.every(k => HAVE.test(k) || YESNO.test(k));
      return {opt: opts.find(o => (yes ? /^yes/i : /^no/i).test(o))};
    }
    return {stop: 'unknown'};
  }
  const YESNO = RX(A.learning);
  const res = [];
  for (const s of SLUGS) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    const log = [];
    await page.goto('https://www.naukri.com/job-listings-' + s, {waitUntil:'domcontentloaded', timeout:45000}).catch(()=>{});
    await page.waitForSelector('button', {timeout:15000}).catch(()=>{});
    await page.waitForTimeout(1500);
    if (await page.locator('text=/Already Applied/i').count()) { res.push(s+' => already'); continue; }
    // tier 1 = <48h, <100 applicants, not reposted; the rest wait for a TIER2 run
    const body = await page.locator('body').innerText().catch(()=>'');
    const nApp = body.match(/Applicants:\s*(\d+)(\+?)/i);
    if (STRICT && nApp && (+nApp[1] >= 100 || nApp[2])) { res.push(s+' => defer: '+nApp[0]); continue; }
    const age = body.match(/Posted:\s*([^\n]+)/i);
    if (STRICT && age && /week|month|\b([2-9]|\d\d)\+?\s*days?/i.test(age[1])) { res.push(s+' => defer: posted '+age[1].trim()); continue; }
    if (STRICT && (/Reposted/i.test(body.slice(0, 3000)))) { res.push(s+' => defer: reposted'); continue; }
    const apply = page.getByRole('button', {name: 'Apply', exact: true});
    if (!(await apply.count())) { res.push(s+' => skip: external'); continue; }
    try { await apply.first().click(); } catch (e) { res.push(s+' => ERROR click: '+String(e.message).split('\n')[0].slice(0,80)); continue; }
    await page.waitForTimeout(4500);
    let outcome = '';
    for (let step = 0; step < 12; step++) {
      if (/saveApply|myapply/.test(page.url()) || await page.locator('text=/successfully applied/i').count()) { outcome = 'APPLIED'; break; }
      const bot = page.locator('[class*=chatbot_Drawer]').first();
      if (!(await bot.count())) { outcome = 'unknown state ' + page.url(); break; }
      const q = (await bot.locator('li.botItem').last().innerText().catch(()=>'')).trim();
      const opts = await bot.locator('label.ssrc__label, .ssrc__radio-btn-container label, .chatbot_Chip, .chipsContainer .chip, [class*=singleselect] label, [class*=multiselect] label').allInnerTexts().catch(()=>[]);
      const a = answer(q, opts.map(o=>o.trim()));
      if (a.text && opts.some(o => o.trim().toLowerCase() === a.text.toLowerCase())) { a.opt = opts.find(o => o.trim().toLowerCase() === a.text.toLowerCase()).trim(); delete a.text; }
      if (a.stop || (!a.text && !a.opt)) { outcome = `STOP(${a.stop||'no option'}): ${q} [${opts.join('/')}]`; break; }
      log.push(q + ' -> ' + (a.text || a.opt));
      if (a.opt) {
        await bot.locator('label.ssrc__label, label, .chatbot_Chip, .chip').filter({hasText: new RegExp('^\\s*' + a.opt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*$')}).first().click();
      } else {
        const box = bot.locator('[contenteditable=true]').first();
        if (!(await box.isVisible())) { outcome = 'STOP(no input for text answer): ' + q + ' [' + opts.join('/') + ']'; break; }
        await box.click({timeout: 5000}); await box.fill(a.text);
      }
      await page.waitForTimeout(500);
      await bot.locator('.sendMsg').first().click().catch(()=>{});
      await page.waitForTimeout(3500);
      const err = await bot.locator('[class*=error], .errorMsg').allInnerTexts().catch(()=>[]);
      if (err.join('').trim()) { outcome = 'VALIDATION: ' + err.join(' ') + ' on ' + q; break; }
    }
    res.push(s + ' => ' + outcome + (log.length ? ' || ' + log.join(' ; ') : ''));
  }
  return res;
}
