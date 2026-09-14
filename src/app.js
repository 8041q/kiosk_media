import { cfg, loadSettings } from './core/state.js';
import { $, applyAccent, applyTheme, applyViewMode, applyLogo, refreshAboutPanel, showScreen, showToast } from './core/ui.js';
import { setLanguage, applyI18n } from './core/i18n.js';
import { refreshCatalog, renderMainScreen, renderLanguageSwitcher, closeLangMenu } from './features/library.js';
import { initPlayer } from './features/player.js';
import { initKeyboard, forceNumericValue } from './features/keyboard.js';
import { initAdmin } from './features/admin.js';
import { initVideoProcessing } from './features/video-processing.js';

async function boot() {
  try { await loadSettings(); } catch (err) { console.warn('Settings load failed', err); }
  setLanguage(cfg.language);
  applyAccent(cfg.accent); applyTheme(cfg.lightMode); applyViewMode(cfg.viewMode); applyLogo(cfg.logoSrc); applyI18n(); refreshAboutPanel();

  initKeyboard(); initPlayer(); initAdmin(); initVideoProcessing();

  try { await refreshCatalog(); }
  catch (err) { console.error(err); showToast(err.message); }
  renderLanguageSwitcher(); renderMainScreen(); showScreen('main');

  ['auth-input', 'pw1', 'pw2'].forEach(id => $(id)?.addEventListener('input', e => forceNumericValue(e.target)));
  document.addEventListener('pointerdown', e => {
    const switcher = $('lang-switcher'); const menu = $('lang-menu');
    if (switcher && menu?.classList.contains('open') && !switcher.contains(e.target)) closeLangMenu();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLangMenu(); });
  document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

boot();
