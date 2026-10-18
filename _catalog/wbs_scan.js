/**
 * wbs_scan.js — the photocopier's scanner bar, passing down the paper as the reader scrolls down to it.
 *
 * Binder pages (.page, the index): each sheet is scanned once, when it first comes into view.
 * One long sheet (.sheet, the wiki and status pages): each time the reader has scrolled down most of a screen, the bar
 * sweeps the part of the sheet that has just come into view.
 * Off when the reader asks for reduced motion.
 *
 * Also on every page: the LIKE.AUDIO link, always in the bottom right corner, and in the top right a coffee cup
 * (paypal.me/APKaudio) that gives a little shake when the reader stops moving the pointer.
 * And the letterhead (the index's): the Ward-Beck mark, "WBSps.ca Archive", where the records come from, at the top of
 * every sheet of paper that does not already carry it.
 */
(() => {
  const badge = Object.assign(document.createElement('a'), { href: 'https://like.audio', target: '_blank', rel: 'noopener', textContent: 'LIKE.AUDIO',
    title: 'like.audio', className: 'wbs-like' });
  badge.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:30;font:700 11px/1 "Courier Prime","Courier New",monospace;letter-spacing:.12em;' +
    'color:#e8e4d8;background:#1f1e1cdd;border:1px solid #4a4843;border-radius:3px;padding:5px 8px;text-decoration:none';
  const cup = Object.assign(document.createElement('a'), { href: 'https://paypal.me/APKaudio', target: '_blank', rel: 'noopener',
    title: 'Buy the archivist a coffee (PayPal: APKaudio)', className: 'wbs-coffee', ariaLabel: 'Buy a coffee: PayPal APKaudio' });
  cup.innerHTML = '<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><g fill="none" stroke="#1f1e1c" stroke-width="2.2" stroke-linecap="round">' +
    '<path d="M9 16h19v9a8 8 0 0 1-8 8h-3a8 8 0 0 1-8-8z" fill="#fbfaf4"/><path d="M28 18h3a4 4 0 0 1 0 8h-3"/><path d="M6 35h25"/>' +
    '<path class="st" d="M14 12c-2-2 2-3 0-6M19 12c-2-2 2-3 0-6M24 12c-2-2 2-3 0-6" stroke-width="1.6"/></g></svg>';
  cup.style.cssText = 'position:fixed;right:10px;top:10px;z-index:30;display:block;line-height:0;background:#fbfaf4ee;border:1px solid #cfcabc;' +
    'border-radius:50%;padding:4px;box-shadow:0 2px 8px #0004';
  const css = document.createElement('style');
  css.textContent = '@keyframes wbs-shake{0%,100%{transform:rotate(0)}15%{transform:rotate(-14deg)}30%{transform:rotate(12deg)}45%{transform:rotate(-9deg)}' +
    '60%{transform:rotate(6deg)}75%{transform:rotate(-3deg)}}.wbs-coffee.shake{animation:wbs-shake .8s ease-in-out}.wbs-coffee:hover{transform:scale(1.08)}' +
    '@media print{.wbs-coffee,.wbs-like{display:none}}';
  let idle = null, moved = false;
  const shake = () => { cup.classList.remove('shake'); void cup.offsetWidth; cup.classList.add('shake'); idle = setTimeout(shake, 7000); };
  addEventListener('pointermove', () => {   // still for a moment after moving: the cup asks, then again now and then
    moved = true; clearTimeout(idle);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) idle = setTimeout(shake, 2500);
  }, { passive: true });
  const me = [...document.scripts].find(x => /_catalog\/wbs_scan\.js/.test(x.src));
  const root = me ? me.src.replace(/_catalog\/wbs_scan\.js.*$/, '') : '';
  const letterhead = () => {
    const paper = document.querySelector('article.sheet, article.page');
    if (!paper || paper.querySelector('.letterhead') || document.querySelector('.letterhead')) return;
    const what = (document.title || '').split(' · ')[0].trim();
    const h = document.createElement('a');   // the letterhead takes you back to the archive's index
    h.className = 'letterhead wbs-lh';
    h.href = root + 'index.html';
    h.title = 'Back to the archive index';
    h.innerHTML = `<img src="${root}WBS_Logo.svg" alt="Ward-Beck Systems"><p>WBSps.ca Archive${what && !/^WBSps/i.test(what) ? ' · ' + what.replace(/[<&]/g, '') : ''}` +
      '<br><small>The records of Ward-Beck Systems Limited, Scarborough, Ontario</small></p>';
    paper.prepend(h);
  };
  css.textContent += '.wbs-lh{display:flex;gap:14px;align-items:center;margin:0 0 1.4em;font:14px/1.35 "Courier Prime","Courier New",monospace;color:#1f1e1c;text-decoration:none}' +
    '.wbs-lh:hover{background:transparent}.wbs-lh:hover p{text-decoration:underline}' +
    '.wbs-lh img{width:70px;flex:none;opacity:.85}.wbs-lh p{margin:0}.wbs-lh small{color:#6d6a63}';
  (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => {
    document.head.appendChild(css);
    document.body.append(badge, cup);
    letterhead();
  });
})();
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.head.insertAdjacentHTML('beforeend', `<style>
.wbs-scan { position:absolute; left:0; right:0; height:120px; pointer-events:none; z-index:4;
  background:linear-gradient(to bottom, transparent, rgba(150,210,255,.18) 75%, rgba(225,245,255,.6) 94%, transparent) }
</style>`);
  const sweep = (host, from, to, ms) => {   // a bar from y=from to y=to inside host (px, host coordinates)
    const bar = document.createElement('div');
    bar.className = 'wbs-scan';
    host.appendChild(bar);
    bar.animate([{ top: from - 120 + 'px' }, { top: to + 'px' }], { duration: ms, easing: 'ease-in' }).finished.then(() => bar.remove());
  };
  const pages = [...document.querySelectorAll('.page')];
  if (pages.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || e.target.dataset.scanned) return;
      e.target.dataset.scanned = '1';
      io.unobserve(e.target);
      if (e.target.querySelector('.scan')) return e.target.classList.add('scanned');   // the index's own toner and bar
      if (getComputedStyle(e.target).position === 'static') e.target.style.position = 'relative';
      sweep(e.target, 0, e.target.offsetHeight, 1600);
    }), { threshold: .2 });
    pages.forEach(p => io.observe(p));
    return;
  }
  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  let done = 0;   // how far down the sheet has been scanned (px, sheet coordinates)
  const check = () => {
    const top = sheet.getBoundingClientRect().top, seen = Math.min(sheet.offsetHeight, innerHeight - top);
    if (seen - done < innerHeight * .6) return;
    const from = Math.max(0, done - 40);
    done = seen;
    sweep(sheet, from, seen, Math.min(1600, 500 + (seen - from) * .9));
  };
  sweep(sheet, 0, Math.min(sheet.offsetHeight, innerHeight - sheet.getBoundingClientRect().top), 1400);
  done = innerHeight - sheet.getBoundingClientRect().top;
  addEventListener('scroll', () => requestAnimationFrame(check), { passive: true });
})();
