// LinkedIn Easy Apply with answers from answers.md. IDS injected by mk_li.sh.
async (page, ARGS = {}) => { // ARGS: {ids, deadline (ms epoch), a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const RX = s => new RegExp('^(' + s + ')$', 'i');
  const IDS = ARGS.ids || /*IDS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  const STRICT = /*STRICT*/true; // tier 1: fresh/not-reposted/<100 only; mk script with TIER2=1 sets false
  const NCR = new RegExp(A.home_area, 'i');
  const HAVE = RX(A.skills);
  const YESNO = RX(A.learning);
  const skillsOf = t => t.replace(/\(.*?\)/g,' ').replace(/[?.*]/g,' ').replace(/\s+/g,' ').split(/,|\/|\band\b|&|\bor\b/).map(x => x.trim()).filter(Boolean);
  function ans(label, kind, opts, ctx) {
    const s = label.toLowerCase();
    if (/previous|last drawn/.test(s) && /ctc|salary|compensation|package/.test(s)) return {stop:'previous CTC'};
    if (/current (annual )?(ctc|salary|compensation|package)|present ctc/.test(s)) return {val: A.current_ctc_number};
    if (/degree|bachelor|graduat|b\.?\s?tech|b\.?e\b|\bbca\b|\bbsc\b|cgpa|percentage|master/.test(s)) return {stop:'degree'};
    if (/authori[sz]ed|legally|work permit|citizen|eligible to work/.test(s)) return {val: ctx.abroad ? 'No' : 'Yes'};
    if (/sponsor/.test(s)) return {val: ctx.abroad ? 'Yes' : 'No'};
    if (/expecte?d? (annual )?(ctc|salary|compensation|package)|expect ctc|salary expectation|desired salary|expectation.*(compensation|salary|ctc)|expected pay|(salary|ctc|compensation|package).{0,20}(are you )?expect/.test(s)) {
      if (ctx.abroad) return /usd|\$|month/.test(s) ? {val: String(A.expected_abroad_usd_month)} : {stop:'expected salary format'};
      const l = NCR.test(ctx.loc) ? A.expected_lpa.home : A.expected_lpa.other;
      if (/lakh|lpa|lacs/.test(s)) return {val: String(l)};
      if (/inr|per annum|annual|₹|rupee/.test(s) || kind === 'number') return {val: String(l*100000)};
      return {val: String(l*100000)};
    }
    if (/start immediately|join immediately|immediate joiner|available to (start|join)|how soon (can )?you (can )?(start|join)|can you join|join (max\.? )?within/.test(s)) return opts.length ? {val: opts.find(o=>/^yes|immediate/i.test(o)) || 'Yes'} : {val: '0'};
    if (/notice/.test(s)) { const o = opts.find(o=>/immediate|0 days|15 days or less|less than 15/i.test(o)); return o ? {val:o} : {val:'0'}; }
    if (/have you (done|worked|had)|before\?|previous(ly)?|in the past/.test(s) && !/years/.test(s)) return {stop:'past-experience question'};
    if (/remote|work from home|wfh/.test(s) && /comfortable|willing|open to|ok with|okay with|able to|prefer/.test(s)) return {val: opts.find(o=>/^yes/i.test(o)) || 'Yes'}; // remote is his top preference
    if (/relocat|commut|travel|on-?site|onsite|work from office|hybrid|shift|night/.test(s) && /willing|comfortable|open to|ok with|okay with|able to|can you|are you|ready to|relocat/.test(s)) return {val:'Yes'};
    if (/(city|location|where.*(live|based|located))/.test(s) && kind==='text') return {val: A.city + ', ' + A.country};
    if (/country code/.test(s) && kind === 'select') return {val: opts.find(o => o === A.phone_country) || A.phone_country};
    if (/phone|mobile/.test(s) && !/year/.test(s)) return {val: A.phone};
    if (/^\s*e-?mail/.test(s)) return {val: A.email};
    if (/linkedin/.test(s) && !/year/.test(s) && kind === 'text' && /url|profile|link|website|portfolio|handle/.test(s)) return {val: A.linkedin};
    if (/github/.test(s) && !/year/.test(s) && kind === 'text' && /url|profile|link|website|portfolio|handle/.test(s)) return {val: A.github};
    if (/website|portfolio/.test(s) && !/year/.test(s) && kind === 'text' && /url|profile|link|website|portfolio|handle/.test(s)) return {val: A.website};
    if (/middle name/.test(s)) return {val: ''};
    if (/gender/.test(s)) return {val: opts.find(o => o.toLowerCase() === A.gender.toLowerCase()) || A.gender};
    if (/english/.test(s)) return {val: opts.find(o=>/native|bilingual|fluent|professional/i.test(o)) || 'Yes'};
    if (/race|ethnicity|sexual orientation|religion|caste/.test(s)) { const o = opts.find(o=>/prefer not|decline|don.t wish|do not wish|not to (say|specify|disclose)/i.test(o)); return o ? {val:o} : {stop:'diversity'}; }
    if (/do you have \d+\s*[–-]?\s*\d*\+? ?years/.test(s) && opts.some(o=>/^no$/i.test(o))) return {val:'No'}; // never claim multi-year experience he doesn't have
    if (/disab|veteran/.test(s)) return {val: opts.find(o=>/^no\b|not a|don.t have|do not/i.test(o)) || {stop:'diversity'}};
    if (/software (development|engineering)|programming|coding/.test(s) && /years/.test(s)) return {val: '0'};
    let m = s.match(/(?:how many )?years (?:of )?(?:hands-on |professional |relevant )?(?:work )?experience (?:(?:do )?you (?:currently )?have )?(?:with|in|on|using)\s+(.+?)(?:\?|$)/);
    if (m) {
      const k = skillsOf(m[1]);
      if (k.length && k.every(x => RX(A.linux_only).test(x))) return {val: String(A.years.linux)};
      return {val: k.every(x => HAVE.test(x)) ? String(A.years.skill_int) : '0'};
    }
    if (/how many years of [a-z ]*experience (do you )?(currently )?have\??(\s*\([^)]*\))?$/.test(s) && !/ (with|in|on|using) /.test(s)) return {val: String(A.years.total_int)};
    m = s.match(/years of exp(?:erience)? (?:do you have )?as (?:an? )?(.+?)\??(?:\s*\([^)]*\))?$/);
    if (m) { const k = skillsOf(m[1]); return {val: k.every(x => HAVE.test(x)) ? String(A.years.skill_int) : '0'}; } // 'as Azure DevOps Engineer' -> Azure not on resume -> 0
    if (/total.*experience|years of (relevant |professional )?experience/.test(s)) return /\bin (the )?(usa|us|uk|australia|europe|market|domain|industry|role)|market|domain|ites/.test(s) ? {stop:'qualified experience'} : {val: String(A.years.total_int)};
    m = s.match(/(?:do you have|have you|are you (?:familiar|comfortable|proficient)|experience (?:with|in))\s*(?:hands-on |any |prior |professional )?(?:experience )?(?:with|in|on|using|worked (?:on|with))?\s*(.+?)(?:\?|$)/);
    if (m && opts.length) { const k = skillsOf(m[1].replace(/\b(for|in|using) (automation|production|scripting)\b/g,'')); const has = x => HAVE.test(x) || YESNO.test(x); const anyOf = /\/|\bor\b/.test(m[1]); const yes = k.length && (anyOf ? k.some(has) : k.every(has)); return {val: yes ? 'Yes' : 'No'}; }
    return {stop:'unknown'};
  }
  page.setDefaultTimeout(8000);
  const res = [];
  for (const id of IDS) {
    if (Date.now() > DEADLINE) { res.push('DEADLINE reached, stopped'); break; }
    const log = [];
    try {
    await page.goto(`https://www.linkedin.com/jobs/view/${id}/`, {waitUntil:'domcontentloaded', timeout:45000}).catch(()=>{});
    await page.waitForTimeout(4000);
    const stale = page.locator('dialog[open], [role=dialog]').filter({hasText: /Apply to /}).first();
    if (await stale.count()) { await stale.getByRole('button', {name: 'Dismiss'}).click().catch(()=>{}); await page.waitForTimeout(800); await page.getByRole('button', {name: /Discard/}).first().click().catch(()=>{}); await page.waitForTimeout(800); }
    const main = (await page.locator('main').innerText().catch(()=>'')).slice(0, 400);
    const loc = (main.split('\n').find(l => /·/.test(l)) || '');
    const ctx = {loc, abroad: !/India|Mumbai|Delhi|Bengaluru|Bangalore|Hyderabad|Pune|Chennai|Kolkata|Gurugram|Gurgaon|Noida|Ahmedabad|Kochi|Jaipur|Chandigarh|Indore|Coimbatore|Mohali|Trivandrum|Thiruvananthapuram|Nagpur|Bhubaneswar|Lucknow/i.test(loc)};
    if (/Applied \d|Application submitted/i.test(main)) { res.push(id+' => already'); continue; }
    const full = await page.locator('main').innerText().catch(()=>'');
    // tier 1 = fresh (<48h), non-reposted, <100 applicants; the rest wait for a TIER2 run
    const top = full.slice(0, 1200);
    if (STRICT && (/Reposted/i.test(top))) { res.push(id+' => defer: reposted'); continue; }
    const nApp = top.match(/(\d[\d,]*)\s+(?:applicants|people clicked apply)/i);
    if (STRICT && (/Over 100 (?:applicants|people clicked apply)/i.test(top) || (nApp && +nApp[1].replace(/,/g,'') >= 100))) { res.push(id+' => defer: 100+ applicants'); continue; }
    const age = top.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i);
    if (STRICT && age && (/week|month/i.test(age[2]) || (/day/i.test(age[2]) && +age[1] >= 2))) { res.push(id+' => defer: posted '+age[0]); continue; }
    const req = full.match(/Requirements added by the job poster[\s\S]{0,400}/);
    const yrs = req ? [...req[0].matchAll(/(\d+)\+? years/g)].map(m => +m[1]) : [];
    if (yrs.some(y => y > A.max_min_years))
    { res.push(id+' => skip: poster requires '+Math.max(...yrs)+'+ yrs'); continue; }
    const btn = page.locator('button:has-text("Easy Apply"), a:has-text("Easy Apply")').first();
    if (!(await btn.count())) { res.push(id+' => skip: no Easy Apply'); continue; }
    await btn.click(); await page.waitForTimeout(3000);
    const dlg = page.locator('dialog[open], [role=dialog]').filter({hasText: /Apply to /}).first();
    let outcome = '';
    for (let step = 0; step < 10 && !outcome; step++) {
      // describe every unanswered field (old + new LinkedIn markup)
      const fields = await dlg.evaluate(el => {
        const labelOf = i => (i.id && el.querySelector(`label[for="${CSS.escape(i.id)}"]`)?.innerText.trim()) || i.getAttribute('aria-label') || (i.getAttribute('aria-labelledby') && document.getElementById(i.getAttribute('aria-labelledby'))?.innerText) || i.closest('fieldset')?.querySelector('legend')?.innerText || (() => { for (let p = i.parentElement, n = 0; p && p !== el && n < 4; p = p.parentElement, n++) { if (p.querySelectorAll('input,select,textarea').length !== 1) continue; const t = p.innerText.split('\n').map(x => x.trim()).filter(Boolean)[0]; if (t) return t.replace(/\*$/, ''); } return ''; })();
        const vis = i => i.offsetParent !== null || i.type === 'radio';
        const out = [];
        for (const i of el.querySelectorAll('input[type=text], input[type=number], input[type=tel], input:not([type]), textarea')) {
          if (!vis(i) || i.value.trim()) continue;
          out.push({kind: i.type === 'number' ? 'number' : 'text', id: i.id, label: labelOf(i)});
        }
        for (const s of el.querySelectorAll('select')) {
          const cur = s.options[s.selectedIndex]?.text || '';
          if (cur && !/select an option/i.test(cur)) continue;
          out.push({kind: 'select', id: s.id, label: labelOf(s), opts: [...s.options].map(o => o.text.trim()).filter(t => t && !/select an option/i.test(t))});
        }
        const groups = {};
        for (const r of el.querySelectorAll('input[type=radio]')) (groups[r.name] ||= []).push(r);
        for (const [name, rs] of Object.entries(groups)) {
          if (rs.some(r => r.checked)) continue;
          const optText = r => (el.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.innerText.trim()) || r.parentElement.parentElement.innerText.trim();
          out.push({kind: 'radio', ids: rs.map(r => r.id), label: rs[0].getAttribute('aria-label') || labelOf(rs[0]), opts: rs.map(optText)});
        }
        return out;
      });
      for (const f of fields) {
        if (!f.label.trim()) continue;
        const a = ans(f.label, f.kind, f.opts || [], ctx);
        if (a.stop) { outcome = `STOP(${a.stop}): ${f.label} [${(f.opts||[]).join('/')}]`; break; }
        if (f.kind === 'text' || f.kind === 'number') {
          await dlg.locator(`[id="${f.id}"]`).fill(a.val);
          if (/city|location/i.test(f.label)) { await page.waitForTimeout(600); const o = page.getByRole('option').first(); if (await o.count() && (await o.innerText()).toLowerCase().includes(A.city.split(',')[0].toLowerCase())) await o.click(); }
        } else {
          let pick = f.opts.find(o => o.toLowerCase() === String(a.val).toLowerCase());
          if (!pick && /^\d+$/.test(String(a.val))) pick = f.opts.find(o => new RegExp('^' + a.val + ' years?$', 'i').test(o.trim()));
          if (!pick) { outcome = `STOP(no exact option '${a.val}'): ${f.label} [${f.opts.join('/')}]`; break; }
          if (f.kind === 'select') {
            const s = dlg.locator(`[id="${f.id}"]`);
            await s.selectOption({label: pick});
            if ((await s.evaluate(x => x.options[x.selectedIndex]?.text.trim())) !== pick) { outcome = 'STOP(readback failed): ' + f.label; break; }
          } else {
            const ok = await dlg.evaluate((el, [ids, idx]) => { const rs = ids.map(i => el.querySelector(`[id="${CSS.escape(i)}"]`)); const name = rs[idx]?.name; rs[idx]?.click(); const now = [...el.querySelectorAll(`input[type=radio][name="${CSS.escape(name||'')}"]`)]; return now[idx]?.checked || rs[idx]?.checked; }, [f.ids, f.opts.indexOf(pick)]);
            if (!ok) { outcome = 'STOP(radio not set): ' + f.label; break; }
          }
        }
        log.push(f.label.trim().slice(0,70) + ' -> ' + a.val);
      }
      if (outcome) break;
      const follow = dlg.locator('input[type=checkbox][id*=follow]');
      if (await follow.count() && await follow.first().isChecked()) await dlg.locator('label[for*=follow]').first().click().catch(()=>{});
      const submit = dlg.getByRole('button', {name: /Submit application/});
      const next = dlg.getByRole('button', {name: /^(Next|Review|Continue to next step|Review your application)$/});
      if (await submit.count()) {
        await submit.first().click(); await page.waitForTimeout(3500);
        await page.getByRole('button', {name: /Dismiss|Done/}).first().click().catch(()=>{});
        await page.goto(`https://www.linkedin.com/jobs/view/${id}/`, {waitUntil:'domcontentloaded'}).catch(()=>{}); await page.waitForTimeout(3500);
        outcome = /Application submitted|Applied \d/.test(await page.locator('main').innerText().catch(()=>'')) ? 'APPLIED' : 'NOT CONFIRMED';
        break;
      }
      if (await next.count()) { await next.first().click(); await page.waitForTimeout(2200); }
      const dtxt = await dlg.innerText().catch(()=>'');
      if (/Invalid input|This field is required|Please make a selection|Enter a (valid|whole)/i.test(dtxt)) outcome = 'VALIDATION: ' + dtxt.replace(/\n+/g,' | ').slice(0,400);
    }
    if (!outcome) outcome = 'ran out of steps: ' + (await dlg.innerText().catch(()=>'')).replace(/\n+/g,' | ').slice(0,300);
    if (outcome !== 'APPLIED' && outcome !== 'NOT CONFIRMED') {
      await page.locator('dialog[open], [role=dialog]').filter({hasText: /Apply to /}).first().getByRole('button', {name: 'Dismiss'}).click().catch(()=>{});
      await page.waitForTimeout(1000);
      await page.getByRole('button', {name: /Discard/}).first().click().catch(()=>{});
    }
    res.push(id + ' => ' + outcome + (log.length ? ' || ' + log.join(' ; ') : ''));
    } catch (e) {
      res.push(id + ' => ERROR ' + String(e.message).split('\n')[0].slice(0,120) + (log.length ? ' || ' + log.join(' ; ') : ''));
      await page.keyboard.press('Escape').catch(()=>{});
      await page.waitForTimeout(800);
      await page.getByRole('button', {name: /Discard/}).first().click({timeout: 3000}).catch(()=>{});
    }
    await page.waitForTimeout(2500);
  }
  return res;
}
