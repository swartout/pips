// ==UserScript==
// @name         NYT Pips Archive
// @namespace    https://github.com/swartout/pips
// @version      4.1
// @description  Play any previous day's NYT Pips puzzle by selecting a date
// @match        https://www.nytimes.com/games/pips*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'pips-archive-date';
  const LAUNCH_DATE = '2025-08-18';
  const PICKER_ID = 'pips-archive-picker';

  function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // --- Intercept fetch to rewrite the Pips API date ---

  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const date = localStorage.getItem(STORAGE_KEY);
    if (date && /\/svc\/pips\/v1\/\d{4}-\d{2}-\d{2}\.json/.test(url)) {
      const newUrl = url.replace(/\/svc\/pips\/v1\/\d{4}-\d{2}-\d{2}\.json/, `/svc/pips/v1/${date}.json`);
      return originalFetch.call(this, typeof input === 'string' ? newUrl : new Request(newUrl, input), init);
    }
    return originalFetch.call(this, input, init);
  };

  // --- Date picker UI (inserted into splash screen only) ---

  function tryInsertPicker() {
    if (document.getElementById(PICKER_ID)) return;
    const gameRoot = document.getElementById('pz-game-root');
    if (!gameRoot) return;

    // Only show on splash screen (has a "Play" button)
    const playBtn = [...gameRoot.querySelectorAll('button')].find(b => b.textContent.trim() === 'Play');
    if (!playBtn) return;

    // Find difficulty row (Easy/Medium/Hard) to insert before
    const diffRow = [...gameRoot.querySelectorAll('*')].find(el =>
      el.children.length >= 3 &&
      ['Easy', 'Medium', 'Hard'].every(t => [...el.children].some(c => c.textContent.trim() === t))
    );

    const current = localStorage.getItem(STORAGE_KEY) || getToday();

    const picker = document.createElement('div');
    picker.id = PICKER_ID;
    picker.style.cssText = 'text-align:center;padding:10px 0 2px;font:500 14px "nyt-franklin",-apple-system,BlinkMacSystemFont,sans-serif;color:#333';

    const label = document.createElement('label');
    label.style.cssText = 'position:relative;cursor:pointer;padding:4px 10px;border-bottom:1.5px dashed rgba(0,0,0,0.3)';
    label.textContent = formatDate(current);

    const input = document.createElement('input');
    input.type = 'date';
    input.min = LAUNCH_DATE;
    input.max = getToday();
    input.value = current;
    input.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;-webkit-appearance:none';
    input.addEventListener('change', () => {
      if (!input.value) return;
      const val = input.value;
      if (val === getToday()) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, val);
      location.reload();
    });

    label.appendChild(input);
    picker.appendChild(label);
    (diffRow || playBtn).parentNode.insertBefore(picker, diffRow || playBtn);
  }

  // --- Observe DOM ---

  function init() {
    const root = document.getElementById('pz-game-root');
    if (!root) {
      new MutationObserver(function (_, obs) {
        if (document.getElementById('pz-game-root')) { obs.disconnect(); init(); }
      }).observe(document.documentElement, { childList: true, subtree: true });
      return;
    }
    const wrapper = document.getElementById('js-hook-game-wrapper');
    const observe = wrapper || root.parentElement;
    tryInsertPicker();
    const ed = document.getElementById('portal-editorial-content');
    if (ed) ed.style.display = 'none';
    new MutationObserver(() => {
      tryInsertPicker();
      const ed = document.getElementById('portal-editorial-content');
      if (ed) ed.style.display = 'none';
    }).observe(observe, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
