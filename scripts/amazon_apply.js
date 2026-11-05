// Amazon Jobs apply. Starts an application for each numeric job id, answers the
// standard wizard from answers.md, and stops (returns "needs: ...") on a required
// question it does not recognize. Set ARGS.submit=false to stop at Review.
// Result lines: "<id> applied", "<id> ready: review", "<id> needs: ...", "<id> err ..."
async (page, ARGS = {}) => { // ARGS: {ids, deadline, a (answers), submit, resume}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  const AMZ = A.amazon || {};
  const IDS = ARGS.ids || /*IDS*/[];
  const DEADLINE = ARGS.deadline || Infinity;
  const SUBMIT = ARGS.submit !== false;
  const RESUME = ARGS.resume || '';
  const UAE = new Set((ARGS.uae || []).map(String)); // ids of jobs outside search.authorized_iso3: needs sponsorship, not authorized
  let curUAE = false;
  const RX = s => new RegExp('^(' + s + ')$', 'i');
  const HAVE = RX(A.skills || '');
  const YESNO = RX(A.learning || '');
  page.setDefaultTimeout(12000);

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const pageText = async () => clean(await page.locator('#main_content').innerText().catch(() => ''));
  const stepTitle = async () => {
    const h = page.locator('h2.form-title:visible').first();
    if (await h.count()) return clean((await h.innerText()).split('\n')[0]);
    if (await page.locator('.application-review-title:visible').count()) return 'Review application and forms';
    return '';
  };
  const clickContinue = async () => {
    const b = page.getByRole('button', {name: 'Continue', exact: true});
    if (await b.count() && await b.first().isVisible() && await b.first().isEnabled()) {
      await b.first().click();
      return true;
    }
    return false;
  };

  function yearsFor(s) {
    if (/linux|unix/.test(s) && !/devops|cloud|jenkins|ci\/?cd|systems development|software development|programming/.test(s)) return A.years?.linux ?? 3;
    if (/software development|programming|coding/.test(s)) return 0;
    return A.years?.total ?? 0.5;
  }

  function answerFor(text) {
    const s = text.toLowerCase();
    if (/how did you hear/.test(s)) return 'Job Posting';
    if (/if ["“]?job posting["”]? please specify|job posting.*specify/.test(s)) return 'LinkedIn.com';
    if (/how many years of work experience/.test(s)) return '0 - 2 years';
    if (/education level|highest degree/.test(s)) return 'Bachelors';
    if (/school name|name of institution/.test(s) && !/enter your school name/.test(s)) return 'Other';
    if (/area.*study|field of study|speciali[sz]ation/.test(s)) return 'Computer Applications';
    if (/currently a student/.test(s)) return 'YES';
    // Any explicit "N+ years" question is answered from the real total (0.5 yr),
    // even when the wording also says "relevant non-internship experience".
    const ym = s.match(/(\d+)\s*\+?\s*years?/);
    if (ym) return yearsFor(s) >= +ym[1] ? 'YES' : 'NO';
    if (/relevant non-internship|relevant.*professional experience/.test(s)) return 'YES';
    if (/preferred work location/.test(s)) return 'N/A';
    if (/previously applied/.test(s)) return 'YES';
    if (/previously been employed|previously employed|worked for amazon|worked at amazon/.test(s)) return 'NO';
    if (/non-?competition|preclude|restrict/.test(s)) return 'NO';
    if (/sponsor|immigration/.test(s)) return curUAE ? 'YES' : 'NO';
    if (/government entity|armed forces|publicly/.test(s)) return 'NEVER';
    if (/sanctioned|physically located/.test(s)) return 'NO';
    if (/permanent resident/.test(s)) return 'NO';
    if (/relocat/.test(s)) return 'YES';
    if (/authori[sz]ed|legally|work permit|right to work/.test(s)) return curUAE ? 'NO' : 'YES';
    const yes = String(AMZ.student || '').toUpperCase() === 'YES';
    if (/student/.test(s)) return AMZ.student ? String(AMZ.student).toUpperCase() : null;
    if (/degree|bachelor|graduat/.test(s)) return /currently|pursuing|student/.test(s) ? (yes ? 'YES' : 'NO') : (AMZ.degree_completed ? String(AMZ.degree_completed).toUpperCase() : null);
    if (/how many years/.test(s)) return AMZ.work_experience || null;
    if (/experience|do you have|have you/.test(s)) { // yes/no topics only from answers.md (experience_no, then skills / learning / experience_yes)
      const rx = x => x && new RegExp('\\b(' + x + ')\\b', 'i');
      if (rx(A.experience_no)?.test(s)) return 'NO';
      if (/python|programming|coding|software development/.test(s) && !rx(A.experience_yes)?.test(s)) return null; // ask the user
      if ([A.skills, A.learning, A.experience_yes].some(x => rx(x)?.test(s))) return 'YES';
      return null;
    }
    if (/(comfortable|willing|able to|open to).*(shift|night|weekend|on-?call|rotational)/.test(s)) return 'YES'; // answers.md: shifts/weekends yes
    return null;
  }

  function textAnswer(text) {
    const s = text.toLowerCase();
    if (/current employer|past employers/.test(s)) return AMZ.current_employer || null;
    if (/technical domain skills|primary and secondary/.test(s)) return AMZ.skills || null;
    if (/enter your school name|school name|institution/.test(s)) return AMZ.school || null;
    if (/area.*study|field of study|speciali[sz]ation/.test(s)) return AMZ.area || null;
    if (/graduation date|expected graduation/.test(s)) return AMZ.graduation || null;
    if (/job posting.*specify|how did you hear.*specify/.test(s)) return AMZ.heard_detail || 'LinkedIn.com';
    if (/preferred work location/.test(s)) return AMZ.preferred_location || 'N/A';
    if (/current (ctc|salary|compensation)/.test(s)) return A.text?.current_ctc || '';
    if (/expected (ctc|salary|compensation)/.test(s)) return (A.expected_lpa?.other || 7) + ' LPA';
    if (/notice/.test(s)) return A.text?.notice || 'Immediate joiner, no notice period.';
    if (/why|cover letter|message/.test(s)) return A.text?.why_hire || '';
    return null;
  }

  async function fillQuestions() {
    const qs = page.locator('#application-questions .question[data-questionid]');
    const n = await qs.count();
    for (let i = 0; i < n; i++) {
      const q = qs.nth(i);
      const label = q.locator('.question-label label').first();
      const text = clean(await label.innerText().catch(async () => (await q.innerText()).split('\n')[0]));
      if (!text) continue;
      const required = /required/i.test(await q.innerText().catch(() => ''));

      const radios = q.locator('input[type=radio]');
      if (await radios.count()) {
        const want = answerFor(text);
        if (want == null) { if (required) return 'needs: ' + text.slice(0, 130); continue; }
        const target = q.locator(`input[type=radio][value="${want}"]`);
        if (await target.count()) {
          if (!(await target.first().isChecked())) await target.first().check({force: true}).catch(() => {});
          continue;
        }
        const labels = q.locator('label');
        let clicked = false;
        for (let j = 0; j < await labels.count(); j++) {
          const lt = clean(await labels.nth(j).innerText());
          if (lt.toLowerCase().includes(String(want).toLowerCase())) { await labels.nth(j).click().catch(() => {}); clicked = true; break; }
        }
        if (!clicked && required) return 'needs: ' + text.slice(0, 130);
        continue;
      }

      const sel = q.locator('select').first();
      if (await sel.count()) {
        const want = answerFor(text);
        const cur = await sel.inputValue().catch(() => '');
        if (want == null) { if (required && !cur) return 'needs: ' + text.slice(0, 130); continue; }
        const opts = await sel.locator('option').evaluateAll(os => os.map(o => ({v: o.value, t: String(o.text).replace(/\s+/g, ' ').trim()})));
        const w = String(want).toLowerCase();
        const hit = opts.find(o => o.t.toLowerCase() === w) || opts.find(o => o.v === String(want)); // exact match only
        if (hit && cur !== hit.v) await sel.selectOption({value: hit.v}).catch(async () => { await sel.selectOption(hit.v, {force: true}).catch(() => {}); });
        else if (!cur && required) return 'needs: ' + text.slice(0, 130);
        continue;
      }

      const free = q.locator('textarea, input[type=text], input[type=number]').first();
      if (await free.count()) {
        if (clean(await free.inputValue().catch(() => ''))) continue;
        const want = textAnswer(text);
        if (want == null) { if (required) return 'needs: ' + text.slice(0, 130); continue; }
        await free.fill(String(want)).catch(() => {});
        continue;
      }

      const cbs = q.locator('input[type=checkbox]');
      if (await cbs.count()) {
        const want = answerFor(text);
        if (want === 'YES') {
          for (let j = 0; j < await cbs.count(); j++) if (!(await cbs.nth(j).isChecked())) await cbs.nth(j).check({force: true}).catch(() => {});
        } else if (required) return 'needs: ' + text.slice(0, 130);
      }
    }
    return null;
  }

  async function applyOne(id) {
    await page.goto(`https://www.amazon.jobs/applicant/jobs/${id}/apply`, {waitUntil: 'domcontentloaded', timeout: 60000});
    await page.waitForTimeout(2500);
    let txt = await pageText();
    if (/Application submitted|Thank you for your application/i.test(txt) && !/Get SMS updates|My progress/i.test(txt)) return 'already';

    const eng = page.getByText('Apply in English', {exact: true});
    if (await eng.count()) {
      await eng.first().click().catch(() => {});
      await page.waitForTimeout(4000);
    }

    let last = '';
    let stuck = 0;
    for (let step = 0; step < 18; step++) {
      if (Date.now() > DEADLINE) return 'deadline';
      const title = await stepTitle();
      txt = await pageText();
      if (/Application submitted|Thank you for your application/i.test(txt)) return 'applied';
      if (title === last) stuck++; else stuck = 0;
      last = title;
      if (stuck >= 2) return 'needs: stuck at ' + (title || 'unknown');

      if (/Review application and forms/i.test(title) || (/Review application and forms/i.test(txt) && /Submit application/i.test(txt))) {
        if (!SUBMIT) return 'ready: review';
        const submit = page.getByRole('button', {name: 'Submit application', exact: true});
        if (!(await submit.count()) || !(await submit.first().isEnabled().catch(() => false))) return 'needs: submit button';
        await submit.first().click();
        await page.waitForTimeout(6500);
        const after = await pageText();
        if (/Application submitted|Thank you for your application/i.test(after)) return 'applied';
        const errs = await page.locator('.alert, .error, .erLbl, [class*=error]').allInnerTexts().catch(() => []);
        return 'needs: submit failed ' + clean(errs.join(' ')).slice(0, 120);
      }

      if (/Get SMS updates/i.test(title)) {
        const skip = page.locator('#save-and-continue-form-button');
        if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(4500); continue; }
        return 'needs: sms step';
      }

      if (/Job-specific questions|General questions|Work Eligibility|Contact information|Education/i.test(title)) {
        const res = await fillQuestions();
        if (res) return res;
        if (await clickContinue()) { await page.waitForTimeout(5000); continue; }
        return 'needs: no continue on ' + title;
      }

      if (/Resume/i.test(title)) {
        if (RESUME && !/\.pdf/i.test(txt)) {
          const fi = page.locator('input[type=file]').first();
          if (await fi.count()) { await fi.setInputFiles(RESUME).catch(() => {}); await page.waitForTimeout(5000); }
        }
        if (await clickContinue()) { await page.waitForTimeout(4500); continue; }
        return 'needs: resume step';
      }

      if (/Acknowledgement/i.test(title)) {
        const cbs = page.locator('input[type=checkbox]:visible');
        for (let j = 0; j < await cbs.count(); j++) if (!(await cbs.nth(j).isChecked())) await cbs.nth(j).check({force: true}).catch(() => {});
        if (await clickContinue()) { await page.waitForTimeout(4500); continue; }
        return 'needs: acknowledgement step';
      }

      if (/Voluntary Equal Employment|Military Status/i.test(title)) {
        const sels = page.locator('select:visible');
        for (let j = 0; j < await sels.count(); j++) {
          const opts = await sels.nth(j).locator('option').evaluateAll(os => os.map(o => o.text));
          const pick = opts.find(t => /don.t wish|prefer not|decline|not to (say|answer)|choose not/i.test(t));
          if (pick) await sels.nth(j).selectOption({label: pick}).catch(() => {});
        }
        const labels = page.locator('label:visible');
        for (let j = 0; j < await labels.count(); j++) {
          const lt = clean(await labels.nth(j).innerText());
          if (/don.t wish|prefer not|decline|not to (say|answer)|choose not/i.test(lt)) { await labels.nth(j).click().catch(() => {}); break; }
        }
        if (await clickContinue()) { await page.waitForTimeout(4500); continue; }
        return 'needs: ' + title;
      }

      if (/Work history/i.test(title)) return 'needs: work history step';

      if (await clickContinue()) { await page.waitForTimeout(4500); continue; }
      return 'needs: stuck at ' + (title || 'unknown');
    }
    return 'needs: too many steps';
  }

  const out = [];
  for (const id of IDS) {
    if (Date.now() > DEADLINE) { out.push(`${id} deadline`); break; }
    curUAE = UAE.has(String(id));
    try { out.push(`${id} ${await applyOne(String(id))}`); }
    catch (e) { out.push(`${id} err ${String(e).slice(0, 140)}`); }
    await page.waitForTimeout(1800);
  }
  return out;
}
