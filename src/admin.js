/**
 * @file Admin panel logic
 */

import { cfg, draft, catalog, adminVidLang, allLangSources, setAdminVidLang, thumbCache } from './state.js';
import { $, escHtml, showToast } from './ui.js';
import { t, tf } from './i18n.js';
import { applyAccent, applyTheme, applyViewMode } from './theme.js';
import { applyI18n } from './i18n.js';
import { persistSave } from './persistence.js';
import { applyLogo, refreshAboutPanel, openAboutLink } from './logo.js';
import { buildVidLangTabs, switchAdminVidLang, setBuildVideoAdminGrid, buildLangSwitcher } from './language.js';
import { buildCatalog, loadCatalogForLanguage, scanAllLanguages, requestKioskExit, queueMeta, bindThumbImage } from './catalog.js';
import { renderMainScreen } from './main-screen.js';
import { showScreen } from './screen-router.js';
import { hideOnScreenKeyboard } from './osk.js';
import { LANGUAGES } from './config.js';

export function openAdmin() {
  $('admin-auth-wrap').classList.remove('hidden');
  $('auth-input').value = '';
  $('auth-err').textContent = '';
  showScreen('admin');
  setTimeout(() => $('auth-input').focus(), 60);
}

export function checkAuth() {
  if ($('auth-input').value === cfg.password) {
    hideOnScreenKeyboard();
    $('admin-auth-wrap').classList.add('hidden');
    openAdminPanel();
  } else {
    $('auth-err').textContent = t('wrongPw');
    $('auth-input').value = '';
    $('auth-input').focus();
    const card = $('auth-card');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }
}

export function openAdminPanel() {
  draft.selectedIds = [...cfg.selectedIds];
  draft.videoVolumes = { ...cfg.videoVolumes };
  draft.videoTitles = JSON.parse(JSON.stringify(cfg.videoTitles || {}));
  draft.accent = cfg.accent;
  draft.lightMode = cfg.lightMode;
  draft.logoSrc = cfg.logoSrc;
  draft.password = cfg.password;
  draft.language = cfg.language;
  draft.viewMode = cfg.viewMode;

  setAdminVidLang(cfg.language);
  buildVidLangTabs();
  buildVideoAdminGrid();
  refreshLogoPreview();
  refreshAboutPanel();
  applyI18n();

  $('color-pick').value = draft.accent;
  $('color-hex').textContent = draft.accent;
  $('theme-chk').checked = draft.lightMode;
  $('theme-lbl').textContent = draft.lightMode ? t('light') : t('dark');
  $('view-mode').value = draft.viewMode;
  $('pw1').value = '';
  $('pw2').value = '';
  $('pw-err').textContent = '';
  adminNavTo('videos');
}

export function adminNavTo(secId) {
  document.querySelectorAll('.snav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sec === secId);
  });
  document.querySelectorAll('.admin-section').forEach(s => {
    s.classList.toggle('active', s.id === 'sec-' + secId);
  });
}

export function buildVideoAdminGrid() {
  const grid = $('video-admin-grid');
  grid.querySelectorAll('.vid-admin-card').forEach(c => c.remove());
  const empty = $('vac-empty');
  if (catalog.videos.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  const langTitles = draft.videoTitles[adminVidLang] || {};

  catalog.videos.forEach(video => {
    const isEnabled = draft.selectedIds.includes(video.id);
    const customTitle = langTitles[video.id] || video.title;
    const card = document.createElement('div');
    card.className = 'vid-admin-card' + (isEnabled ? ' enabled' : '');
    card.dataset.id = video.id;

    card.innerHTML = `
      <div class="vac-thumb">
        <div class="vac-thumb-shimmer"></div>
        <img alt="${escHtml(video.title)}" />
      </div>
      <div class="vac-body">
        <div class="vac-toggle-row">
          <label class="toggle">
            <input type="checkbox" class="vac-enabled-cb" ${isEnabled ? 'checked' : ''} />
            <div class="toggle-track"></div>
            <div class="toggle-knob"></div>
          </label>
          <span class="vac-toggle-lbl" data-i18n="showOnScreen">${escHtml(t('showOnScreen'))}</span>
        </div>
        <div class="field" style="margin-top:6px;">
          <label style="font-size:0.72rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.07em;">${escHtml(t('displayName'))}</label>
          <input type="text" class="vac-name-input" value="${escHtml(customTitle)}" placeholder="${escHtml(video.title)}" />
        </div>
      </div>`;

    const imgEl = card.querySelector('.vac-thumb img');
    const shimmer = card.querySelector('.vac-thumb-shimmer');
    if (thumbCache.has(video.src)) {
      bindThumbImage(imgEl, shimmer, thumbCache.get(video.src));
    } else {
      queueMeta(video, url => bindThumbImage(imgEl, shimmer, url), () => {});
    }

    const cb = card.querySelector('.vac-enabled-cb');
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!cfg.selectedIds.includes(video.id)) cfg.selectedIds.push(video.id);
        if (!draft.selectedIds.includes(video.id)) draft.selectedIds.push(video.id);
        cfg.disabledIds = cfg.disabledIds.filter(id => id !== video.id);
      } else {
        cfg.selectedIds = cfg.selectedIds.filter(id => id !== video.id);
        draft.selectedIds = draft.selectedIds.filter(id => id !== video.id);
        if (!cfg.disabledIds.includes(video.id)) cfg.disabledIds.push(video.id);
      }
      card.classList.toggle('enabled', cb.checked);
      persistSave();
    });

    const nameInput = card.querySelector('.vac-name-input');
    nameInput.addEventListener('input', () => {
      if (!draft.videoTitles[adminVidLang]) draft.videoTitles[adminVidLang] = {};
      const val = nameInput.value.trim();
      if (val && val !== video.title) draft.videoTitles[adminVidLang][video.id] = val;
      else delete draft.videoTitles[adminVidLang][video.id];
    });

    grid.appendChild(card);
  });
}

setBuildVideoAdminGrid(buildVideoAdminGrid);

const chkAllBtn = $('chk-all');
if (chkAllBtn) {
  chkAllBtn.addEventListener('click', () => {
    catalog.videos.forEach(v => { if (!draft.selectedIds.includes(v.id)) draft.selectedIds.push(v.id); });
    $('video-admin-grid').querySelectorAll('.vid-admin-card').forEach(card => {
      card.classList.add('enabled');
      card.querySelector('.vac-enabled-cb').checked = true;
    });
  });
}

const chkNoneBtn = $('chk-none');
if (chkNoneBtn) {
  chkNoneBtn.addEventListener('click', () => {
    draft.selectedIds = [];
    $('video-admin-grid').querySelectorAll('.vid-admin-card').forEach(card => {
      card.classList.remove('enabled');
      card.querySelector('.vac-enabled-cb').checked = false;
    });
  });
}

$('scan-btn').addEventListener('click', async () => {
  const btn = $('scan-btn');
  btn.disabled = true;
  btn.textContent = t('scanning');
  const ok = await scanAllLanguages();
  btn.disabled = false;
  btn.textContent = t('scan');
  const totalVideos = Object.values(allLangSources).reduce((n, arr) => n + arr.length, 0);
  if (!ok || totalVideos === 0) { showToast(t('noVideosFound')); return; }
  buildCatalog(allLangSources[cfg.language] || []);
  setAdminVidLang(cfg.language);
  buildVidLangTabs();
  draft.selectedIds = [...cfg.selectedIds];
  buildVideoAdminGrid();
  buildLangSwitcher();
  const langCount = Object.keys(allLangSources).length;
  const msg = langCount > 1 ? tf('videosFoundAcross', { count: totalVideos, langs: langCount }) : tf('videosFound', { count: totalVideos });
  showToast(msg);
});

function refreshLogoPreview() {
  const img = $('logo-prev-img');
  const empty = $('logo-no-logo');
  const rmBtn = $('logo-remove');
  if (draft.logoSrc) {
    img.src = draft.logoSrc; img.classList.add('visible');
    empty.style.display = 'none'; rmBtn.style.display = '';
  } else {
    img.classList.remove('visible');
    empty.style.display = ''; rmBtn.style.display = 'none';
  }
}

$('logo-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast(t('pickImageFile')); return; }
  if (file.size > 3 * 1024 * 1024) { showToast(t('imageUnder3mb')); return; }
  const reader = new FileReader();
  reader.onload = ev => { draft.logoSrc = ev.target.result; refreshLogoPreview(); refreshAboutPanel(); };
  reader.readAsDataURL(file);
});

$('logo-remove').addEventListener('click', () => { draft.logoSrc = null; refreshLogoPreview(); refreshAboutPanel(); });
$('about-github').addEventListener('click', () => { void openAboutLink('github'); });
$('about-issues').addEventListener('click', () => { void openAboutLink('issues'); });

$('color-pick').addEventListener('input', e => {
  draft.accent = e.target.value;
  $('color-hex').textContent = draft.accent;
  applyAccent(draft.accent);
});

$('theme-chk').addEventListener('change', e => {
  draft.lightMode = e.target.checked;
  $('theme-lbl').textContent = draft.lightMode ? t('light') : t('dark');
  applyTheme(draft.lightMode);
});

$('view-mode').addEventListener('change', e => {
  draft.viewMode = e.target.value;
  applyViewMode(draft.viewMode);
});

function returnAdmin() {
  applyAccent(cfg.accent);
  applyTheme(cfg.lightMode);
  applyViewMode(cfg.viewMode);
  showScreen('main');
  restoreAndRender();
}

$('panel-return').addEventListener('click', returnAdmin);
$('screen-admin').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); returnAdmin(); }
});

$('panel-exit').addEventListener('click', async () => {
  if (!window.confirm(t('exitConfirm'))) return;
  const btn = $('panel-exit');
  btn.disabled = true; btn.textContent = t('exiting');
  const ok = await requestKioskExit();
  if (!ok) { btn.disabled = false; btn.textContent = t('exit'); showToast(t('exitFailed')); return; }
  setTimeout(() => {
    if (document.visibilityState !== 'hidden') { btn.disabled = false; btn.textContent = t('exit'); showToast(t('exitStillOpen')); }
  }, 2800);
});

$('panel-save').addEventListener('click', () => {
  const pw1 = $('pw1').value;
  const pw2 = $('pw2').value;
  if (pw1 || pw2) {
    if (/\D/.test(pw1) || /\D/.test(pw2)) { $('pw-err').textContent = t('pwDigits'); $('pw1').focus(); return; }
    if (pw1.length < 4) { $('pw-err').textContent = t('pwMin'); $('pw1').focus(); return; }
    if (pw1 !== pw2) { $('pw-err').textContent = t('pwMismatch'); $('pw2').focus(); return; }
    draft.password = pw1;
  }
  $('pw-err').textContent = '';
  cfg.selectedIds = [...draft.selectedIds];
  cfg.videoVolumes = { ...draft.videoVolumes };
  cfg.videoTitles = JSON.parse(JSON.stringify(draft.videoTitles));
  cfg.accent = draft.accent;
  cfg.lightMode = draft.lightMode;
  cfg.logoSrc = draft.logoSrc;
  cfg.password = draft.password;
  cfg.language = draft.language;
  cfg.viewMode = draft.viewMode;
  persistSave();
  applyLogo(cfg.logoSrc);
  applyI18n();
  showScreen('main');
  showToast(t('saved'));
  restoreAndRender();
});

async function restoreAndRender() {
  await loadCatalogForLanguage(cfg.language);
  renderMainScreen();
}
