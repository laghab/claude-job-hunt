// Hirist collector: browser_run_code_unsafe filename. Edit KW / SKIP before a run.
async (page, ARGS = {}) => { // ARGS: {a (answers)}
  const A = ARGS.a || /*ANSWERS*/{}; // form values from answers.md
  page.setDefaultTimeout(12000);
  const KW = ['devops','devops-engineer','cloud-engineer','sre','site-reliability','linux','linux-administrator','aws','gcp','azure','kubernetes','docker','jenkins','terraform','ci-cd','cloud-support','technical-support','production-support','platform-engineer','infrastructure','system-administrator','build-release','noc','devops-in-delhi-ncr','cloud-in-delhi-ncr'];
  const seen = new Map();
  for (const k of KW) {
    try {
      await page.goto(`https://www.hirist.tech/k/${k}-jobs`, {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.waitForSelector('a[href*="/j/"]', {timeout: 10000});
      await page.waitForTimeout(1500);
      const rows = await page.$$eval('a[href*="/j/"]', as => as.map(a => {
        let c = a; for (let i = 0; i < 6 && c.parentElement && !/yrs/i.test(c.innerText); i++) c = c.parentElement;
        return {url: a.href.split('?')[0], text: c.innerText.replace(/\s+/g, ' ').slice(0, 400)};
      }));
      for (const r of rows) if (!seen.has(r.url)) seen.set(r.url, r);
    } catch (e) {}
  }
  const bad = /senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|java|\.net|developer|frontend|full stack|data engineer|data scien|\bqa\b|sdet|tester|sales|salesforce|\bsap\b|oracle|mainframe/i;
  const out = [];
  for (const r of seen.values()) {
    const id = r.url.match(/-(\d{6,8})$/)?.[1];
    if (!id || bad.test(r.url)) continue;
    if (!/devops|cloud|sre|site-reliability|linux|unix|system|infra|noc|support|platform|operations|sysadmin|network|jenkins|kubernetes|aws|azure|gcp|build|release/i.test(r.url) || /embedded|firmware|data-scien|ai-engineer|machine-learning|quality-assurance|security-test|developer|software-engineer/i.test(r.url)) continue; // role filter on slug
    const m = r.text.match(/(\d+)\s*-\s*(\d+)\s*yrs/i);
    if (!m || +m[1] > A.max_min_years) continue;
    out.push(r.url.replace('https://www.hirist.tech/j/', '') + ' || ' + r.text);
  }
  return {total: seen.size, n: out.length, out};
}
