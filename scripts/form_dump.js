// Compact form reader: one call returns every visible field instead of a full
// accessibility snapshot. Use it on one-off ATS forms, then fill them all with one
// script. Walks open shadow roots (web-component forms like SmartRecruiters) and lists visible
// type-ahead options. Returns {url, title, step, fields: [{i, tag, type, label, value, req, opts}], options, buttons, errors}.
async (page, ARGS = {}) => { // ARGS: {root: css selector to limit the scan, default 'body'}
  return await page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel) || document.body;
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const txt = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const deep = (r, sel, out = []) => { for (const el of r.querySelectorAll('*')) { if (el.matches(sel)) out.push(el); if (el.shadowRoot) deep(el.shadowRoot, sel, out); } return out; };
    const labelOf = el => {
      const scope = el.getRootNode();
      if (el.id) { const l = (scope.querySelector ? scope.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null) || document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return txt(l.textContent); }
      const host = scope.host; if (host && host.getAttribute('label')) return txt(host.getAttribute('label'));
      if (el.getAttribute('aria-label')) return txt(el.getAttribute('aria-label'));
      const by = el.getAttribute('aria-labelledby'); if (by) return txt(by.split(' ').map(i => document.getElementById(i)?.innerText || '').join(' '));
      const wrap = el.closest('label'); if (wrap) return txt(wrap.innerText);
      let p = el.parentElement; // nearest ancestor holding only this one field
      while (p && p !== root) { if (p.querySelectorAll('input,select,textarea').length > 1) break; const t = txt(p.innerText.replace(el.innerText || '', '')); if (t) return t; p = p.parentElement; }
      return txt(el.placeholder || el.name);
    };
    const fields = []; const radioSeen = new Set();
    deep(root, 'input,select,textarea,[contenteditable=true],[role=combobox]').forEach((el, i) => {
      const type = (el.type || el.getAttribute('role') || el.tagName).toLowerCase();
      if (['hidden', 'submit', 'button'].includes(type)) return;
      if (type !== 'file' && !vis(el)) return;
      const f = {i, tag: el.tagName.toLowerCase(), type, id: el.id || undefined, name: el.name || undefined, label: labelOf(el), req: el.required || el.getAttribute('aria-required') === 'true' || undefined};
      if (type === 'radio' || type === 'checkbox') {
        const key = el.name || el.id; if (type === 'radio' && radioSeen.has(key)) return; radioSeen.add(key);
        const group = type === 'radio' && el.name ? [...el.getRootNode().querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)] : [el];
        const fs = el.closest('fieldset'); if (fs && fs.querySelector('legend')) f.label = txt(fs.querySelector('legend').innerText);
        else if (group.length > 1) { let p = el.parentElement; while (p && p !== root && !group.every(g => p.contains(g))) p = p.parentElement; f.label = txt((p?.innerText || '').split('\n')[0]); }
        f.opts = group.map(g => labelOf(g)); f.value = group.filter(g => g.checked).map(g => labelOf(g)).join('|');
      } else if (el.tagName === 'SELECT') {
        f.opts = [...el.options].map(o => txt(o.text)).filter(Boolean).slice(0, 60); f.value = txt(el.options[el.selectedIndex]?.text);
      } else f.value = txt(el.value ?? el.innerText);
      fields.push(f);
    });
    const options = [...new Set(deep(document, '[role=option]').filter(o => { const r = (o.offsetParent || o).getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(o => txt(o.textContent)).filter(Boolean))].slice(0, 30);
    const buttons = deep(root, 'button,[role=button],input[type=submit]').filter(vis).map(b => txt(b.innerText || b.value || b.getAttribute('aria-label'))).filter(Boolean);
    const errors = deep(root, '[role=alert],.error,[class*=error-message],[class*=errorMsg],[class*=error-text],[class*=field-error]').filter(vis).map(e => txt(e.innerText || e.getAttribute('aria-label'))).filter(Boolean).slice(0, 15);
    const step = txt(document.querySelector('h1,h2')?.innerText);
    return {url: location.href, title: document.title, step, fields, options, buttons: [...new Set(buttons)].slice(0, 25), errors: [...new Set(errors)]};
  }, ARGS.root || 'body');
}
