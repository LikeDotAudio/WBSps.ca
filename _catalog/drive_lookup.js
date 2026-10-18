/**
 * drive_lookup.js — find a file's copy on the archive's Google Drive, lazily: only the 1-in-256 slice of the map that
 * holds this path is fetched (_catalog/drive/xx.json, made by make_drive_links.py), and only when it is needed.
 *
 *   driveLookup(path) → Promise<[id, resourceKey, public?] | null>      path: a 2026 path, or ../WBSps.env/<archive path>
 *   wbsOff(img)       an <img> that did not load (the scan is not on the website): show its Drive copy instead, else a card
 *   wbsTurn(img)      an <img data-rot="90|180|270"> that loaded: redrawn upright (counter-clockwise) so it fits its box
 */
(() => {
  const here = document.currentScript ? document.currentScript.src : '';
  const base = here ? here.replace(/drive_lookup\.js(\?.*)?$/, '') : '_catalog/';   // …/_catalog/
  const shards = {};
  const shardOf = key => {   // FNV-1a over UTF-8, low byte, as in make_drive_links.py
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(key)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return (h & 0xff).toString(16).padStart(2, '0');
  };
  window.driveLookup = path => {
    const s = shardOf(path);
    shards[s] = shards[s] || fetch(base + 'drive/' + s + '.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    return shards[s].then(m => m[path] || null);
  };
  window.driveThumb = (d, size) =>
    `https://drive.google.com/thumbnail?sz=w${size || 640}&id=${d[0]}${d[1] ? '&resourcekey=' + encodeURIComponent(d[1]) : ''}`;
  window.wbsTurn = img => {
    const deg = +img.dataset.rot;
    if (!deg || img.dataset.turned || !img.naturalWidth) return;
    img.dataset.turned = '1';
    const side = deg === 90 || deg === 270, w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.min(1, 1600 / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = (side ? h : w) * k; cv.height = (side ? w : h) * k;
    const g = cv.getContext('2d');
    g.translate(cv.width / 2, cv.height / 2);
    g.rotate(-deg * Math.PI / 180);
    g.drawImage(img, -w * k / 2, -h * k / 2, w * k, h * k);
    cv.className = img.className;
    cv.title = `shown turned ${deg}\u00b0 (rotation audit)`;
    cv.setAttribute('role', 'img');
    cv.dataset.f = img.dataset.f || '';
    img.replaceWith(cv);
  };
  window.wbsOff = img => {
    const path = img.dataset.f;
    const card = () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'offline', textContent: 'scan kept in the archive' }));
    if (!path || img.dataset.tried) return card();
    img.dataset.tried = '1';
    window.driveLookup(path).then(d => {
      if (!d) return card();
      img.onerror = card;
      img.src = window.driveThumb(d, img.dataset.size || 640);
      if (!d[2]) img.title = 'From the archive’s Google Drive: sign in with access to see it';
    });
  };
})();
