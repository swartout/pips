// ==UserScript==
// @name         NYT Pips Archive
// @namespace    https://github.com/swartout/pips
// @version      1.0
// @description  Play any previous day's NYT Pips puzzle by selecting a date
// @match        https://www.nytimes.com/games/pips*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'pips-archive-date';
  const LAUNCH_DATE = '2025-08-18';

  // --- Intercept fetch to rewrite the Pips API date ---

  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const selectedDate = localStorage.getItem(STORAGE_KEY);

    if (selectedDate && url.match(/\/svc\/pips\/v1\/\d{4}-\d{2}-\d{2}\.json/)) {
      const newUrl = url.replace(/\/svc\/pips\/v1\/\d{4}-\d{2}-\d{2}\.json/, `/svc/pips/v1/${selectedDate}.json`);
      if (typeof input === 'string') {
        return originalFetch.call(this, newUrl, init);
      }
      return originalFetch.call(this, new Request(newUrl, input), init);
    }

    return originalFetch.call(this, input, init);
  };

  // --- Date picker UI ---

  function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function addDatePicker() {
    const saved = localStorage.getItem(STORAGE_KEY);

    const container = document.createElement('div');
    container.id = 'pips-archive-picker';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 99999;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const label = document.createElement('span');
    label.textContent = 'Archive:';
    label.style.fontWeight = '600';

    const input = document.createElement('input');
    input.type = 'date';
    input.min = LAUNCH_DATE;
    input.max = getToday();
    input.value = saved || getToday();
    input.style.cssText = 'font-size: 13px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 4px;';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Today';
    resetBtn.style.cssText = `
      font-size: 12px;
      padding: 3px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
      color: #333;
    `;
    resetBtn.style.display = saved ? 'inline-block' : 'none';

    input.addEventListener('change', () => {
      const val = input.value;
      if (val && val !== getToday()) {
        localStorage.setItem(STORAGE_KEY, val);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      location.reload();
    });

    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(resetBtn);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDatePicker);
  } else {
    addDatePicker();
  }
})();
