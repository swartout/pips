// ==UserScript==
// @name         NYT Pips Archive
// @namespace    https://github.com/swartout/pips
// @version      2.0
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

  // --- Helpers ---

  function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function setDate(dateStr) {
    const today = getToday();
    if (dateStr && dateStr !== today) {
      localStorage.setItem(STORAGE_KEY, dateStr);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    location.reload();
  }

  // --- Inject styles once ---

  function injectStyles() {
    if (document.getElementById('pips-archive-styles')) return;
    const style = document.createElement('style');
    style.id = 'pips-archive-styles';
    style.textContent = `
      #${PICKER_ID} {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 0 2px;
        font-family: "nyt-franklin", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        color: #333;
        user-select: none;
        -webkit-user-select: none;
      }
      #${PICKER_ID} .archive-arrow {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #333;
        padding: 4px 8px;
        line-height: 1;
        border-radius: 4px;
        -webkit-tap-highlight-color: transparent;
      }
      #${PICKER_ID} .archive-arrow:disabled {
        opacity: 0.25;
        cursor: default;
      }
      #${PICKER_ID} .archive-arrow:active:not(:disabled) {
        background: rgba(0,0,0,0.06);
      }
      #${PICKER_ID} .archive-date-label {
        position: relative;
        cursor: pointer;
        font-weight: 500;
        letter-spacing: 0.01em;
        padding: 4px 10px;
        border-radius: 6px;
        -webkit-tap-highlight-color: transparent;
      }
      #${PICKER_ID} .archive-date-label:active {
        background: rgba(0,0,0,0.06);
      }
      #${PICKER_ID} .archive-date-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        -webkit-appearance: none;
      }
      #${PICKER_ID} .archive-today-btn {
        background: none;
        border: none;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        color: #333;
        text-decoration: underline;
        cursor: pointer;
        padding: 4px 6px;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Build the picker element ---

  function buildPicker() {
    const today = getToday();
    const current = localStorage.getItem(STORAGE_KEY) || today;
    const isArchive = current !== today;

    const container = document.createElement('div');
    container.id = PICKER_ID;

    // Previous day arrow
    const prevBtn = document.createElement('button');
    prevBtn.className = 'archive-arrow';
    prevBtn.textContent = '\u2039';
    prevBtn.setAttribute('aria-label', 'Previous day');
    prevBtn.disabled = current <= LAUNCH_DATE;
    prevBtn.addEventListener('click', () => setDate(shiftDate(current, -1)));

    // Date label with hidden native date input
    const dateLabel = document.createElement('span');
    dateLabel.className = 'archive-date-label';
    dateLabel.textContent = formatDate(current);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'archive-date-input';
    dateInput.min = LAUNCH_DATE;
    dateInput.max = today;
    dateInput.value = current;
    dateInput.addEventListener('change', () => {
      if (dateInput.value) setDate(dateInput.value);
    });
    dateLabel.appendChild(dateInput);

    // Next day arrow
    const nextBtn = document.createElement('button');
    nextBtn.className = 'archive-arrow';
    nextBtn.textContent = '\u203A';
    nextBtn.setAttribute('aria-label', 'Next day');
    nextBtn.disabled = current >= today;
    nextBtn.addEventListener('click', () => setDate(shiftDate(current, 1)));

    container.appendChild(prevBtn);
    container.appendChild(dateLabel);
    container.appendChild(nextBtn);

    // "Today" link when viewing archive
    if (isArchive) {
      const todayBtn = document.createElement('button');
      todayBtn.className = 'archive-today-btn';
      todayBtn.textContent = 'Today';
      todayBtn.addEventListener('click', () => setDate(today));
      container.appendChild(todayBtn);
    }

    return container;
  }

  // --- Insert picker into the splash screen ---

  function tryInsertPicker() {
    // Don't double-insert
    if (document.getElementById(PICKER_ID)) return;

    const gameRoot = document.getElementById('pz-game-root');
    if (!gameRoot) return;

    // Look for the splash screen: find the "Play" button as an anchor point.
    // The splash screen has a visible button with text "Play".
    const buttons = gameRoot.querySelectorAll('button');
    let playButton = null;
    for (const btn of buttons) {
      if (btn.textContent.trim() === 'Play') {
        playButton = btn;
        break;
      }
    }
    if (!playButton) return;

    // Walk up from Play button to find the splash screen container,
    // then look for the difficulty selector or the subtitle to insert after.
    // Strategy: insert our picker as the first child of the game root's
    // first child (the splash screen wrapper), right after any title/subtitle area.
    // We look for the element that contains the difficulty tabs (Easy/Medium/Hard).
    let difficultyRow = null;
    const allElements = gameRoot.querySelectorAll('*');
    for (const el of allElements) {
      if (el.children.length >= 3) {
        const texts = Array.from(el.children).map(c => c.textContent.trim());
        if (texts.includes('Easy') && texts.includes('Medium') && texts.includes('Hard')) {
          difficultyRow = el;
          break;
        }
      }
    }

    injectStyles();
    const picker = buildPicker();

    if (difficultyRow) {
      // Insert before the difficulty selector
      difficultyRow.parentNode.insertBefore(picker, difficultyRow);
    } else {
      // Fallback: insert before the Play button's parent
      playButton.parentNode.insertBefore(picker, playButton);
    }
  }

  // --- Observe DOM for splash screen appearing/disappearing ---

  function startObserving() {
    const gameRoot = document.getElementById('pz-game-root');
    if (!gameRoot) {
      // Wait for game root to exist
      const bodyObserver = new MutationObserver(() => {
        if (document.getElementById('pz-game-root')) {
          bodyObserver.disconnect();
          startObserving();
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
      return;
    }

    // Try immediately
    tryInsertPicker();

    // Observe for changes (React re-renders, navigation between splash and game)
    const observer = new MutationObserver(() => {
      tryInsertPicker();
    });
    observer.observe(gameRoot, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();
