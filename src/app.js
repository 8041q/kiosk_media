/**
 * @file Main application entry point
 */

import { cfg } from './state.js';
import { persistLoad } from './persistence.js';
import { applyAccent, applyTheme, applyViewMode } from './theme.js';
import { applyI18n } from './i18n.js';
import { buildLangSwitcher, closeLangMenu, applyLanguage } from './language.js';
import { loadInitialManifest, buildCatalog, loadFallbackCatalog, scanAllLanguages } from './catalog.js';
import { renderMainScreen, clearGridSelection } from './main-screen.js';
import { wirePlayer, clearIdleTimer, clearHudTimer } from './player.js';
import { initOnScreenKeyboard, hideOnScreenKeyboard, forceNumericValue, registerCheckAuth } from './osk.js';
import { openAdmin, checkAuth } from './admin.js';
import { showScreen, registerPlayerTimers, registerOskHide } from './screen-router.js';
import { allLangSources } from './state.js';
import { applyLogo } from './logo.js';
import { registerClearGridSelection } from './player.js';

async function boot() {
  // Register callbacks to break circular dependencies
  registerPlayerTimers(clearIdleTimer, clearHudTimer);
  registerOskHide(hideOnScreenKeyboard);
  registerCheckAuth(checkAuth);
  registerClearGridSelection(clearGridSelection);

  await persistLoad();
  applyAccent(cfg.accent);
  applyTheme(cfg.lightMode);
  applyLogo(cfg.logoSrc);
  applyViewMode(cfg.viewMode);
  applyI18n();
  initOnScreenKeyboard();

  const hasManifest = loadInitialManifest();
  buildLangSwitcher();

  if (hasManifest && cfg.language in allLangSources) {
    buildCatalog(allLangSources[cfg.language]);
  } else {
    loadFallbackCatalog();
  }

  renderMainScreen();
  showScreen('main');
  wirePlayer();

  const adminCorner = document.getElementById('admin-corner');
  if (adminCorner) {
    adminCorner.addEventListener('click', openAdmin);
    adminCorner.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAdmin(); }
    });
  }

  const authBtn = document.getElementById('auth-btn');
  const authInput = document.getElementById('auth-input');
  const authCancel = document.getElementById('auth-cancel');
  if (authBtn) authBtn.addEventListener('click', checkAuth);
  if (authInput) authInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkAuth(); });
  if (authCancel) authCancel.addEventListener('click', () => showScreen('main'));

  ['auth-input', 'pw1', 'pw2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => forceNumericValue(el));
  });

  document.querySelectorAll('.snav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.snav-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'sec-' + btn.dataset.sec));
    });
  });

  document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener('pointerdown', e => {
    const switcher = document.getElementById('lang-switcher');
    const menu = document.getElementById('lang-menu');
    if (!switcher || !menu || !menu.classList.contains('open')) return;
    if (!switcher.contains(e.target)) closeLangMenu();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLangMenu();
  });
}

boot();
