// Naukri collector: browser_run_code_unsafe filename. Edit QUERIES / SKIP before a run.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  page.setDefaultTimeout(12000);
  const QUERIES = ['devops-jobs','devops-engineer-jobs-2','devops-engineer-jobs-3','cloud-engineer-jobs','cloud-engineer-jobs-2','aws-engineer-jobs','azure-cloud-engineer-jobs','gcp-cloud-engineer-jobs','jenkins-jobs','kubernetes-jobs','linux-system-administrator-jobs','linux-jobs-in-delhi-ncr','unix-administrator-jobs','production-support-engineer-jobs-in-delhi-ncr','application-support-engineer-jobs-in-delhi-ncr','l1-support-engineer-jobs','l2-support-engineer-jobs','cloud-operations-engineer-jobs','infrastructure-engineer-jobs','devops-jobs?wfhType=2'];
  const seen = new Map();
  for (const q of QUERIES) {
    const url = `https://www.naukri.com/${q}${q.includes('?') ? '&' : '?'}experience=1&jobAge=2`;
    for (let tryN = 0; tryN < 2; tryN++) {
      try {
        await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
        await page.waitForSelector('.srp-jobtuple-wrapper', {timeout: 10000});
        await page.waitForTimeout(800);
        const rows = await page.$$eval('.srp-jobtuple-wrapper', ts => ts.map(t => { const g = s => t.querySelector(s)?.innerText?.trim() || ''; return {title: g('a.title'), comp: g('.comp-name'), exp: g('.expwdth'), sal: g('.sal-wrap'), loc: g('.locWdth'), url: t.querySelector('a.title')?.href?.split('?')[0]}; }));
        for (const r of rows) if (r.url && !seen.has(r.url)) seen.set(r.url, r);
        break;
      } catch (e) {}
    }
  }
  const want = /devops|dev ops|cloud|sre|site reliability|linux|unix|system admin|system engineer|systems engineer|infrastructure|noc|technical support|tech support|support engineer|support analyst|it support|production support|application support|build|release|jenkins|kubernetes|platform engineer|operations engineer|server/i;
  const bad = /intern|trainee|senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|sales|recruit|\bhr\b|java|\.net|developer|frontend|full stack|data engineer|data scien|\bqa\b|tester|test engineer|bpo|voice|customer care|telecaller|\bsap\b|oracle|salesforce|mainframe|embedded|civil|mechanical|electrical|plc|scada|mail/i;
  const ncr = new RegExp(A.home_area, 'i');
  const out = [];
  for (const r of seen.values()) {
    const id = r.url.match(/(\d{12})$/)?.[1];
    if (!id) continue;
    if (!want.test(r.title) || bad.test(r.title) || /walk-in/i.test(r.url)) continue;
    const m = r.exp.match(/(\d+)\s*-\s*(\d+)/); if (!m || +m[1] > A.max_min_years) continue;
    const s = r.sal.match(/([\d.]+)\s*-\s*([\d.]+)\s*Lacs/i); const maxSal = s ? +s[2] : null;
    const floor = /remote/i.test(r.loc) ? A.pay_floor_lpa.remote : ncr.test(r.loc) ? A.pay_floor_lpa.home : A.pay_floor_lpa.other;
    if (maxSal !== null && maxSal < floor) continue;
    out.push(r.url.replace('https://www.naukri.com/job-listings-', '') + ' || ' + [r.title, r.comp, r.exp, r.sal || '-', r.loc].join(' | '));
  }
  return {total: seen.size, n: out.length, out};
}
