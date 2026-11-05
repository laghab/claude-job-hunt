// Read a page as compact text, the cheap way to "see" it: headings, open dialogs, visible
// options (type-ahead / listbox), buttons, errors and the main text. Walks open shadow roots,
// so web-component forms (SmartRecruiters, Workday-style) read like plain HTML.
// Use this (or form_dump.js) before any accessibility snapshot; screenshots only for captchas,
// visual layout, or when two text reads return nothing useful.
// Returns {url, title, dialog, options, buttons, errors, headings, text}.
async (page, ARGS = {}) => { // ARGS: {max: chars of body text (default 3000), root: css selector}
  return await page.evaluate(({max, rootSel}) => {
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return (r.width > 0 && r.height > 0 || s.display === 'contents') && s.visibility !== 'hidden' && s.display !== 'none'; };
    // all elements, including inside open shadow roots
    const all = (root, out = []) => { for (const el of root.querySelectorAll('*')) { out.push(el); if (el.shadowRoot) all(el.shadowRoot, out); } return out; };
    // text of a subtree, descending into shadow roots (innerText stops at shadow boundaries)
    const deepText = node => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1 && node.nodeType !== 11) return '';
      if (node.nodeType === 1) {
        const s = getComputedStyle(node); if (s.display === 'none' || s.visibility === 'hidden' || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(node.tagName)) return '';
        if (node.matches('[role=listbox], [role=menu], ul, ol') && s.display !== 'contents') { const r = node.getBoundingClientRect(); if (!r.width || !r.height) return ''; } // closed dropdowns
      }
      // a shadow host renders its shadow tree (slots pull the light children in); walking both doubles the text
      const kids = node.shadowRoot ? [node.shadowRoot] : node.tagName === 'SLOT' ? node.assignedNodes() : node.childNodes;
      let t = ''; for (const c of kids) t += deepText(c);
      return node.nodeType === 1 && /^(DIV|P|LI|TR|H\d|SECTION|ARTICLE|LABEL|BR|OPTION)$/.test(node.tagName) ? '\n' + t + '\n' : t;
    };
    const root = (rootSel && document.querySelector(rootSel)) || document.body;
    const els = all(document);
    const uniq = a => [...new Set(a.map(s => clean(s).slice(0, 300)).filter(Boolean))];
    const dialogEl = els.find(e => (e.matches('dialog[open], [role=dialog], [role=alertdialog]')) && vis(e));
    return {
      url: location.href,
      title: document.title,
      dialog: dialogEl ? clean(deepText(dialogEl)).slice(0, 1500) : '',
      options: uniq(els.filter(e => e.matches('[role=option], [role=listbox] li, datalist option') && vis(e)).map(e => deepText(e))).slice(0, 30),
      buttons: uniq(els.filter(e => e.matches('button, [role=button], input[type=submit], a[role=button]') && vis(e)).map(e => e.innerText || e.value || e.getAttribute('aria-label') || deepText(e))).slice(0, 30),
      // short leaf messages only: frameworks put "invalid" classes on whole form containers
      errors: uniq(els.filter(e => e.matches('[role=alert], .error, [class*=error-message], [class*=errorMsg], [class*=error-text], [class*=field-error]') && vis(e)).map(e => clean(deepText(e))).filter(s => s.length <= 200)).slice(0, 15),
      headings: uniq(els.filter(e => e.matches('h1, h2, h3') && vis(e)).map(e => deepText(e))).slice(0, 15),
      text: deepText(root).split('\n').map(clean).filter(Boolean).filter((l, i, a) => a.indexOf(l) === i).join('\n').slice(0, max),
    };
  }, {max: ARGS.max || 3000, rootSel: ARGS.root || null});
}
