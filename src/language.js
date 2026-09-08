/**
 * @file Language switcher and admin language tabs
 */

import { cfg, allLangSources, adminVidLang, setAdminVidLang } from './state.js';
import { LANGUAGES } from './config.js';
import { $, escHtml } from './ui.js';
import { t, setLanguage, applyI18n } from './i18n.js';
import { buildCatalog, loadCatalogForLanguage } from './catalog.js';
import { renderMainScreen } from './main-screen.js';
import { persistSave } from './persistence.js';
import { syncOskLanguage } from './osk.js';

let _buildVideoAdminGrid = () => {};
export function setBuildVideoAdminGrid(fn) { _buildVideoAdminGrid = fn; }

export function buildLangSwitcher() {
  const sw = $('lang-switcher');
  sw.innerHTML = `
    <button id="lang-select" type="button" aria-label="Language" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12.87 15.07l-2.54-2.58.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2h-2v2H1v2h11.17c-.41 1.18-1.12 2.3-2.1 3.29-.64-.71-1.18-1.5-1.62-2.35H6.37c.53 1.34 1.35 2.59 2.43 3.69l-5.09 5.02L5.12 17l5.12-5.12 3.19 3.19.44-1.99zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.63 7l1.76-4.67L19.37 17h-3.5z"/>
      </svg>
    </button>
    <div id="lang-menu" role="menu" aria-label="Language"></div>`;

  const trigger = $('lang-select');
  const menu = $('lang-menu');

  const manifestLoaded = Object.keys(allLangSources).length > 0;
  const visibleLangs = manifestLoaded
    ? LANGUAGES.filter(({ code }) => (allLangSources[code]?.length ?? 0) > 0)
    : LANGUAGES;
  sw.style.display = visibleLangs.length <= 1 ? 'none' : '';

  menu.innerHTML = visibleLangs.map(({ code, label }) => `
    <button class="lang-menu-item${code === cfg.language ? ' active' : ''}" type="button" role="menuitemradio" aria-checked="${code === cfg.language}" data-lang-code="${code}">
      ${escHtml(label)}
    </button>`).join('');

  trigger.addEventListener('click', e => { e.stopPropagation(); toggleLangMenu(); });
  trigger.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); openLangMenu();
      menu.querySelector('.lang-menu-item.active, .lang-menu-item')?.focus();
    }
  });
  menu.querySelectorAll('.lang-menu-item').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); closeLangMenu();
      applyLanguage(btn.dataset.langCode, true);
    });
  });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeLangMenu(); trigger.focus(); }
  });
  syncLangSwitcher();
}

export function syncLangSwitcher() {
  const trigger = $('lang-select');
  const menu = $('lang-menu');
  const current = LANGUAGES.find(({ code }) => code === cfg.language);
  if (trigger) {
    trigger.setAttribute('aria-label', current ? `Language: ${current.label}` : 'Language');
    trigger.setAttribute('title', current ? current.label : 'Language');
  }
  if (!menu) return;
  menu.querySelectorAll('.lang-menu-item').forEach(btn => {
    const active = btn.dataset.langCode === cfg.language;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
}

function openLangMenu() {
  const trigger = $('lang-select');
  const menu = $('lang-menu');
  if (!trigger || !menu) return;
  menu.classList.add('open');
  trigger.setAttribute('aria-expanded', 'true');
}

export function closeLangMenu() {
  const trigger = $('lang-select');
  const menu = $('lang-menu');
  if (!trigger || !menu) return;
  menu.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
}

function toggleLangMenu() {
  const menu = $('lang-menu');
  if (!menu) return;
  if (menu.classList.contains('open')) closeLangMenu();
  else openLangMenu();
}

export async function applyLanguage(code, persist) {
  cfg.language = code;
  setLanguage(code);
  syncOskLanguage();
  if (persist) persistSave();
  applyI18n();
  if (code in allLangSources) buildCatalog(allLangSources[code]);
  else loadCatalogForLanguage(code);
  renderMainScreen();
}

export function buildVidLangTabs() {
  const tabs = $('vid-lang-tabs');
  if (!tabs) return;
  const options = LANGUAGES.map(({ code, label }) => {
    const count = allLangSources[code]?.length || 0;
    const suffix = count ? ` (${count})` : '';
    return `<option value="${code}" ${code === adminVidLang ? 'selected' : ''}>${escHtml(label + suffix)}</option>`;
  }).join('');
  tabs.innerHTML = `
    <div class="vid-lang-copy">
      <strong>${escHtml(t('languageLibrary'))}</strong>
      <span>${escHtml(t('chooseLanguageFolder'))}</span>
    </div>
    <select class="vid-lang-select" id="vid-lang-select-admin" aria-label="Video language">
      ${options}
    </select>`;
  $('vid-lang-select-admin').addEventListener('change', e => switchAdminVidLang(e.target.value));
}

export async function switchAdminVidLang(lang) {
  setAdminVidLang(lang);
  await loadCatalogForLanguage(lang);
  _buildVideoAdminGrid();
}
