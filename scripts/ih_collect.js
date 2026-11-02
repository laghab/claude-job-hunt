// Instahyre: search API over many skills, return unapplied relevant ids.
async (page) => {
  await page.goto('https://www.instahyre.com/candidate/opportunities/', {waitUntil: 'domcontentloaded'}).catch(() => {});
  const seen = new Map();
  for (const sk of ['DevOps','Linux','AWS','GCP','Kubernetes','Docker','Jenkins','Site Reliability Engineering','Cloud Computing','System Administration','IT Support','Incident Management','ITIL','Monitoring','Grafana','Prometheus','Ansible','Terraform','CI/CD','Git','Windows Server','Bash','Python Scripting','Cloud Support','NOC','Troubleshooting','Customer Support','Application Support']) {
    for (const yrs of [0, 1]) {
      const r = await page.request.get(`https://www.instahyre.com/api/v1/job_search?company_size=0&job_type=0&skills=${encodeURIComponent(sk)}&status=0&years=${yrs}&limit=35&offset=0`);
      if (r.status() === 429) { await page.waitForTimeout(10000); continue; }
      if (r.status() !== 200) continue;
      for (const o of (await r.json()).objects || []) if (!seen.has(o.id)) seen.set(o.id, `${o.title} @ ${o.employer?.company_name} | ${o.locations || ''}`);
      await page.waitForTimeout(1500);
    }
  }
  const want = /devops|cloud|sre|site reliability|linux|unix|system|infra|noc|support|network|platform|techops|production support|kubernetes|aws|azure|gcp|\bit (support|operations|admin|infra)/i;
  const bad = /revenue|reddit|ethos|associate|growth|seo|social media|senior|sr\.|\bsr\b|lead|manager|architect|principal|head|director|staff|sales|recruit|developer|sde|java|\.net|frontend|full stack|data |qa|test|customer care|executive|consultant|analyst|ai |ml |chat support|voice|bpo|accountant|marketing|telecall|customer (support|service)|operations customer|content|business development|site engineer|production engineer|interior|travel|first responder|optoelectronic|hardware/i;
  return [...seen.entries()].filter(([, t]) => want.test(t.split('@')[0]) && !bad.test(t.split('@')[0])).map(([id, t]) => `${id} ${t}`);
}
