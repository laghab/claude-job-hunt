// Wellfound collector: role pages (global + India), returns "id-slug || card text" for junior ops/support roles. Age/region/pay/exp are checked by wellfound_apply.js.
async (page) => {
  page.setDefaultTimeout(15000);
  const roles = ['r/devops-engineer', 'r/site-reliability-engineer', 'r/cloud-engineer', 'r/systems-administrator', 'r/technical-support', 'r/platform-engineer', 'r/infrastructure-engineer',
    'l/devops-engineer/india', 'l/cloud-engineer/india', 'l/site-reliability-engineer/india', 'l/systems-administrator/india', 'l/technical-support/india'];
  const seen = new Map();
  for (const r of roles) {
    try {
      await page.goto(`https://wellfound.com/role/${r}`, {waitUntil: 'domcontentloaded', timeout: 40000});
      await page.waitForTimeout(4000);
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(1200); }
      const rows = await page.$$eval('a[href*="/jobs/"]', as => as.map(a => {
        let c = a; for (let i = 0; i < 5 && c.parentElement && c.innerText.length < 60; i++) c = c.parentElement;
        return {href: a.href.split('?')[0], text: c.innerText.replace(/\s+/g, ' ').slice(0, 200)};
      }).filter(x => /\/jobs\/\d+/.test(x.href)));
      for (const x of rows) if (!seen.has(x.href)) seen.set(x.href, x.text);
    } catch (e) {}
  }
  const bad = /senior|sr\.|\bsr\b|lead|manager|principal|staff|head|director|architect|sales|marketing|recruit|designer|frontend|full.?stack|data scien|machine learning|\bqa\b|mainframe|android/i;
  const want = /devops|sre|site reliability|cloud|infra|platform|system|linux|it support|support engineer|technical support|helpdesk|operations/i;
  const foreign = t => /United States|Canada|Europe|\bEU\b|\bUK\b|United Kingdom|London|Texas|San Francisco|San Mateo|New York|Boston|Austin|Chicago|Washington|Australia|Sydney|Brazil|Argentina|Mexico|Egypt|Colombia|Ireland|Spain|Switzerland|Irvine|Houston|Toronto|AMER|EMEA/i.test(t) && !/India|Everywhere|Worldwide|Anywhere|APAC|Asia/i.test(t);
  const old = /\b(\d+ )?(months?|years?) ago\b|[2-9] weeks ago/i;
  const out = [...seen.entries()]
    .filter(([h, t]) => want.test(t) && !bad.test(t.split('|')[0]) && !old.test(t) && !foreign(t))
    .map(([h, t]) => h.match(/\/jobs\/(\d+[^/]*)/)[1] + ' || ' + t.slice(0, 150));
  return {total: seen.size, n: out.length, out};
}
