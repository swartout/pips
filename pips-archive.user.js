// ==UserScript==
// @name         NYT Pips Archive
// @namespace    https://github.com/swartout/pips
// @version      5.4
// @description  Play any previous day's NYT Pips puzzle
// @match        https://www.nytimes.com/games/pips*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'pips-archive-date';
  const MIN = '2025-08-18';

  function today() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }

  // Rewrite puzzle API requests to the selected date
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const date = localStorage.getItem(KEY);
    if (date && /\/svc\/pips\/v1\/\d{4}-\d{2}-\d{2}\.json/.test(url)) {
      const newUrl = url.replace(/\d{4}-\d{2}-\d{2}/, date);
      return _fetch.call(this, typeof input === 'string' ? newUrl : new Request(newUrl, input), init);
    }
    return _fetch.call(this, input, init);
  };

  // Insert date picker on the splash screen, hide editorial info
  function update() {
    const root = document.getElementById('pz-game-root');
    if (!root) return;

    // Hide date/authorship block
    const info = root.querySelector('p[class*="_momentInfo_"]');
    if (info) info.style.display = 'none';

    // Only add picker on splash screen
    if (document.getElementById('pips-archive')) return;
    const play = [...root.querySelectorAll('button')].find(b => b.textContent.trim() === 'Play');
    if (!play) return;

    const current = localStorage.getItem(KEY) || today();

    const div = document.createElement('div');
    div.id = 'pips-archive';
    div.style.cssText = 'text-align:center;padding:10px 0 2px;font:500 14px "nyt-franklin",system-ui,sans-serif;color:#333';

    const label = document.createElement('label');
    label.style.cssText = 'position:relative;cursor:pointer;padding:4px 10px;border-bottom:1.5px dashed rgba(0,0,0,.3)';
    label.textContent = new Date(current + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const input = document.createElement('input');
    Object.assign(input, { type: 'date', min: MIN, max: today(), value: current });
    input.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer';
    input.addEventListener('change', () => {
      if (!input.value || input.value === current) return;
      input.value === today() ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, input.value);
      location.reload();
    });

    label.appendChild(input);
    div.appendChild(label);

    // Insert before difficulty tabs or Play button
    const tabs = [...root.querySelectorAll('*')].find(el =>
      el.children.length >= 3 && ['Easy','Medium','Hard'].every(t => [...el.children].some(c => c.textContent.trim() === t))
    );
    (tabs || play).parentNode.insertBefore(div, tabs || play);
  }

  // Wait for game root to exist, then observe only it
  new MutationObserver(function (_, obs) {
    const root = document.getElementById('pz-game-root');
    if (!root) return;
    obs.disconnect();
    update();
    new MutationObserver(update).observe(root, { childList: true, subtree: true });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
