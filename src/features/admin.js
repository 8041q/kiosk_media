import { apiFetch } from '../core/api.js';
import { cfg, draft, catalog, ui, resetDraft, commitDraft, saveSettings } from '../core/state.js';
import { $, escHtml, showToast, applyAccent, applyTheme, applyViewMode, applyLogo, refreshAboutPanel, openAboutLink, showScreen } from '../core/ui.js';
import { LANGUAGES, t, tf, applyI18n } from '../core/i18n.js';
import { refreshCatalog, renderMainScreen, queueMeta, bindThumbImage, renderLanguageSwitcher } from './library.js';
import { hideOnScreenKeyboard } from './keyboard.js';

let wired = false;

export function openAdmin() {
  $('admin-auth-wrap')?.classList.remove('hidden');
  if ($('auth-input')) $('auth-input').value = '';
  if ($('auth-err')) $('auth-err').textContent = '';
  showScreen('admin');
  setTimeout(() => $('auth-input')?.focus(), 60);
}

export function checkAuth() {
  if ($('auth-input')?.value === cfg.password) {
    hideOnScreenKeyboard(); $('admin-auth-wrap')?.classList.add('hidden'); openAdminPanel();
    return;
  }
  if ($('auth-err')) $('auth-err').textContent = t('wrongPw');
  if ($('auth-input')) { $('auth-input').value = ''; $('auth-input').focus(); }
  const card = $('auth-card'); if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
}

function openAdminPanel() {
  resetDraft(); ui.adminLanguage = cfg.language;
  applyI18n(); renderAdminLanguageSelect(); renderVideoAdminGrid(); refreshLogoPreview(); refreshAboutPanel();
  $('color-pick').value = draft.accent; $('color-hex').textContent = draft.accent;
  $('theme-chk').checked = draft.lightMode; $('theme-lbl').textContent = draft.lightMode ? t('light') : t('dark');
  $('view-mode').value = draft.viewMode;
  $('pw1').value = ''; $('pw2').value = ''; $('pw-err').textContent = '';
  const profile = $('processing-profile'); if (profile) profile.value = draft.processingProfile || 'recommended';
  adminNavTo('videos');
}

export function adminNavTo(section) {
  document.querySelectorAll('.snav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.sec === section));
  document.querySelectorAll('.admin-section').forEach(el => el.classList.toggle('active', el.id === `sec-${section}`));
  const topbar = $('scan-btn')?.closest('.admin-topbar');
  if (topbar) topbar.style.display = section === 'videos' ? '' : 'none';
  window.dispatchEvent(new CustomEvent('kiosk:admin-section', { detail: { section } }));
}

function renderAdminLanguageSelect() {
  const tabs = $('vid-lang-tabs'); if (!tabs) return;
  const options = LANGUAGES.map(({ code, label }) => `<option value="${code}" ${code === ui.adminLanguage ? 'selected' : ''}>${escHtml(label)} (${catalog.byLanguage[code]?.length || 0})</option>`).join('');
  tabs.innerHTML = `<div class="vid-lang-copy"><strong>${escHtml(t('languageLibrary'))}</strong><span>${escHtml(t('chooseLanguageFolder'))}</span></div><select class="vid-lang-select" id="vid-lang-select-admin" aria-label="Video language">${options}</select>`;
  $('vid-lang-select-admin').addEventListener('change', e => { ui.adminLanguage = e.target.value; renderVideoAdminGrid(); });
}

function renderVideoAdminGrid() {
  const grid = $('video-admin-grid'); const empty = $('vac-empty'); if (!grid || !empty) return;
  grid.querySelectorAll('.vid-admin-card').forEach(card => card.remove());
  const videos = catalog.byLanguage[ui.adminLanguage] || [];
  empty.style.display = videos.length ? 'none' : '';
  const langTitles = draft.videoTitles[ui.adminLanguage] || {};
  videos.forEach(video => {
    const enabled = draft.selectedIds.includes(video.id);
    const card = document.createElement('div'); card.className = `vid-admin-card${enabled ? ' enabled' : ''}`; card.dataset.id = video.id;
    card.innerHTML = `<div class="vac-thumb"><div class="vac-thumb-shimmer"></div><img alt="${escHtml(video.title)}"></div><div class="vac-body"><div class="vac-toggle-row"><label class="toggle"><input type="checkbox" class="vac-enabled-cb" ${enabled ? 'checked' : ''}><div class="toggle-track"></div><div class="toggle-knob"></div></label><span class="vac-toggle-lbl">${escHtml(t('showOnScreen'))}</span></div><div class="field" style="margin-top:6px"><label style="font-size:.72rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em">${escHtml(t('displayName'))}</label><input type="text" class="vac-name-input" value="${escHtml(langTitles[video.id] || video.title)}" placeholder="${escHtml(video.title)}"></div></div>`;
    queueMeta(video, url => bindThumbImage(card.querySelector('img'), card.querySelector('.vac-thumb-shimmer'), url));
    const cb = card.querySelector('.vac-enabled-cb');
    cb.addEventListener('change', () => {
      if (cb.checked) { if (!draft.selectedIds.includes(video.id)) draft.selectedIds.push(video.id); draft.disabledIds = draft.disabledIds.filter(id => id !== video.id); }
      else { draft.selectedIds = draft.selectedIds.filter(id => id !== video.id); if (!draft.disabledIds.includes(video.id)) draft.disabledIds.push(video.id); }
      card.classList.toggle('enabled', cb.checked);
    });
    const input = card.querySelector('.vac-name-input');
    input.addEventListener('input', () => {
      draft.videoTitles[ui.adminLanguage] ||= {};
      const value = input.value.trim();
      if (value && value !== video.title) draft.videoTitles[ui.adminLanguage][video.id] = value; else delete draft.videoTitles[ui.adminLanguage][video.id];
    });
    grid.appendChild(card);
  });
}

function setAllCurrent(enabled) {
  for (const video of catalog.byLanguage[ui.adminLanguage] || []) {
    if (enabled) { if (!draft.selectedIds.includes(video.id)) draft.selectedIds.push(video.id); draft.disabledIds = draft.disabledIds.filter(id => id !== video.id); }
    else { draft.selectedIds = draft.selectedIds.filter(id => id !== video.id); if (!draft.disabledIds.includes(video.id)) draft.disabledIds.push(video.id); }
  }
  renderVideoAdminGrid();
}

async function scanMedia() {
  const btn = $('scan-btn'); btn.disabled = true; btn.textContent = t('scanning');
  try {
    await refreshCatalog({ toast: true });
    for (const video of catalog.all) {
      if (!draft.selectedIds.includes(video.id) && !draft.disabledIds.includes(video.id)) draft.selectedIds.push(video.id);
    }
    renderAdminLanguageSelect(); renderVideoAdminGrid(); renderLanguageSwitcher();
  } catch (err) { showToast(err.message); }
  finally { btn.disabled = false; btn.textContent = t('scan'); }
}

function refreshLogoPreview() {
  const img = $('logo-prev-img'); const empty = $('logo-no-logo'); const remove = $('logo-remove'); if (!img || !empty || !remove) return;
  if (draft.logoSrc) { img.src = draft.logoSrc; img.classList.add('visible'); empty.style.display = 'none'; remove.style.display = ''; }
  else { img.removeAttribute('src'); img.classList.remove('visible'); empty.style.display = ''; remove.style.display = 'none'; }
}

function discardAndReturn() {
  resetDraft(); applyAccent(cfg.accent); applyTheme(cfg.lightMode); applyViewMode(cfg.viewMode); applyLogo(cfg.logoSrc);
  showScreen('main'); renderMainScreen();
}

async function saveAndReturn() {
  const pw1 = $('pw1').value; const pw2 = $('pw2').value;
  if (pw1 || pw2) {
    if (/\D/.test(pw1) || /\D/.test(pw2)) { $('pw-err').textContent = t('pwDigits'); $('pw1').focus(); return; }
    if (pw1.length < 4) { $('pw-err').textContent = t('pwMin'); $('pw1').focus(); return; }
    if (pw1 !== pw2) { $('pw-err').textContent = t('pwMismatch'); $('pw2').focus(); return; }
    draft.password = pw1;
  }
  $('pw-err').textContent = '';
  const btn = $('panel-save'); btn.disabled = true;
  const previous = JSON.parse(JSON.stringify(cfg));
  try {
    commitDraft(); await saveSettings(); applyLogo(cfg.logoSrc); applyI18n(); renderMainScreen(); showScreen('main'); showToast(t('saved'));
  } catch (err) {
    Object.keys(cfg).forEach(key => { delete cfg[key]; }); Object.assign(cfg, previous); resetDraft();
    applyAccent(cfg.accent); applyTheme(cfg.lightMode); applyViewMode(cfg.viewMode); applyLogo(cfg.logoSrc);
    showToast(`${t('saveFailed')}: ${err.message}`);
  }
  finally { btn.disabled = false; }
}

async function exitKiosk() {
  if (!window.confirm(t('exitConfirm'))) return;
  const btn = $('panel-exit'); btn.disabled = true; btn.textContent = t('exiting');
  try { await apiFetch('/api/exit', { method: 'POST', body: '{}' }); }
  catch (err) { btn.disabled = false; btn.textContent = t('exit'); showToast(`${t('exitFailed')} ${err.message}`); }
}

export function initAdmin() {
  if (wired) return; wired = true;
  $('admin-corner')?.addEventListener('click', openAdmin);
  $('admin-corner')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAdmin(); } });
  $('auth-btn')?.addEventListener('click', checkAuth);
  $('auth-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkAuth(); });
  $('auth-cancel')?.addEventListener('click', () => showScreen('main'));
  document.querySelectorAll('.snav-btn').forEach(btn => btn.addEventListener('click', () => adminNavTo(btn.dataset.sec)));
  $('chk-all')?.addEventListener('click', () => setAllCurrent(true)); $('chk-none')?.addEventListener('click', () => setAllCurrent(false));
  $('scan-btn')?.addEventListener('click', scanMedia);
  $('logo-file')?.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(t('pickImageFile')); return; }
    if (file.size > 3 * 1024 * 1024) { showToast(t('imageUnder3mb')); return; }
    const reader = new FileReader(); reader.onload = ev => { draft.logoSrc = ev.target.result; refreshLogoPreview(); }; reader.readAsDataURL(file);
  });
  $('logo-remove')?.addEventListener('click', () => { draft.logoSrc = null; refreshLogoPreview(); });
  $('about-github')?.addEventListener('click', async () => { if (!(await openAboutLink('github'))) showToast(t('aboutLinkFailed')); });
  $('about-issues')?.addEventListener('click', async () => { if (!(await openAboutLink('issues'))) showToast(t('aboutLinkFailed')); });
  $('color-pick')?.addEventListener('input', e => { draft.accent = e.target.value; $('color-hex').textContent = draft.accent; applyAccent(draft.accent); });
  $('theme-chk')?.addEventListener('change', e => { draft.lightMode = e.target.checked; $('theme-lbl').textContent = draft.lightMode ? t('light') : t('dark'); applyTheme(draft.lightMode); });
  $('view-mode')?.addEventListener('change', e => { draft.viewMode = e.target.value; applyViewMode(draft.viewMode); });
  $('panel-return')?.addEventListener('click', discardAndReturn); $('panel-save')?.addEventListener('click', saveAndReturn); $('panel-exit')?.addEventListener('click', exitKiosk);
  $('screen-admin')?.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('admin-auth-wrap')?.classList.contains('hidden')) return; if (e.key === 'Escape') { e.preventDefault(); discardAndReturn(); } });
}
