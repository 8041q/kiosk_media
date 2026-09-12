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
  draft.videoQualityMode = cfg.videoQualityMode || 'crf23';

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
  $('quality-mode').value = draft.videoQualityMode;
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
  if (secId === 'video-processing') {
    buildVideoStatusGrid();
  }
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

// ── Video Processing section ──
let vpQualityMode = 'crf23';
let vpAbortController = null;

async function buildVideoStatusGrid() {
  const grid = $('video-status-grid');
  grid.innerHTML = '';
  grid.className = 'vp-status-grid';

  const logEl = $('log-output');
  const logContainer = $('processing-log');
  logEl.textContent = '';
  logContainer.classList.add('hidden');

  try {
    const res = await fetch('/api/scan', { method: 'POST', cache: 'no-store', headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Scan failed');
  } catch (err) {
    grid.innerHTML = `<div class="vac-empty">${escHtml(t('noVideosFound'))}</div>`;
    return;
  }

  const allVideos = [];
  for (const langCode of Object.keys(allLangSources)) {
    for (const src of allLangSources[langCode]) {
      allVideos.push({ ...src, lang: langCode });
    }
  }

  if (allVideos.length === 0) {
    grid.innerHTML = `<div class="vac-empty">${escHtml(t('noVideosFound'))}</div>`;
    return;
  }

  for (const vid of allVideos) {
    const card = document.createElement('div');
    card.className = 'vp-status-card pending';
    card.dataset.src = vid.src;
    card.dataset.lang = vid.lang;

    const statusBadge = (status) => {
      const labels = {
        ok: t('videoAlreadyOk') || 'OK',
        needs_fix: t('videoNeedsFix') || 'Needs Fix',
        fixed: t('videoFixed') || 'Fixed',
        converted: t('formatConverted') || 'Converted',
        error: t('videoError') || 'Error',
        pending: t('videoPending') || 'Pending',
        processing: t('videoProcessing') || 'Processing...'
      };
      return `<span class="vp-status-badge ${status}">${escHtml(labels[status] || status)}</span>`;
    };

    card.innerHTML = `
      <div class="vp-status-header">
        <span class="vp-status-title">${escHtml(vid.name)}</span>
        ${statusBadge('pending')}
      </div>
      <div class="vp-status-body">
        <div class="vp-status-row"><span class="vp-status-label">${escHtml(t('videoLang') || 'Language')}:</span><span class="vp-status-value">${escHtml(vid.lang.toUpperCase())}</span></div>
        <div class="vp-status-row"><span class="vp-status-label">${escHtml(t('videoCodec') || 'Codec')}:</span><span class="vp-status-value vp-codec">—</span></div>
        <div class="vp-status-row"><span class="vp-status-label">${escHtml(t('videoResolution') || 'Resolution')}:</span><span class="vp-status-value vp-res">—</span></div>
        <div class="vp-status-row"><span class="vp-status-label">${escHtml(t('videoDuration') || 'Duration')}:</span><span class="vp-status-value vp-dur">—</span></div>
        <div class="vp-status-row"><span class="vp-status-label">${escHtml(t('videoSize') || 'Size')}:</span><span class="vp-status-value vp-size">—</span></div>
      </div>
      <div class="vp-status-actions">
        <button class="vp-fix-btn" data-action="fix" disabled>${escHtml(t('fixVideo') || 'Fix')}</button>
      </div>
    `;

    grid.appendChild(card);

    // Probe video info
    try {
      const probeRes = await fetch('/api/probe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: vid.src })
      });
      const probeData = await probeRes.json();
      if (probeData.ok) {
        card.querySelector('.vp-codec').textContent = probeData.codec || '—';
        card.querySelector('.vp-res').textContent = `${probeData.width || '?'}x${probeData.height || '?'}`;
        card.querySelector('.vp-dur').textContent = formatDuration(probeData.duration || 0);
        card.querySelector('.vp-size').textContent = formatBytes(probeData.size || 0);

        const needsFix = probeData.needsFix === true;
        card.classList.remove('pending');
        card.classList.add(needsFix ? 'needs_fix' : 'ok');
        card.querySelector('.vp-status-badge').className = `vp-status-badge ${needsFix ? 'needs_fix' : 'ok'}`;
        card.querySelector('.vp-status-badge').textContent = needsFix ? (t('videoNeedsFix') || 'Needs Fix') : (t('videoAlreadyOk') || 'OK');

        const fixBtn = card.querySelector('.vp-fix-btn');
        fixBtn.disabled = !needsFix;
        if (needsFix) {
          fixBtn.addEventListener('click', () => fixSingleVideo(vid.src, vid.lang, card, fixBtn));
        }
        card.dataset.needsFix = needsFix;
      }
    } catch (e) {
      card.classList.remove('pending');
      card.classList.add('error');
      card.querySelector('.vp-status-badge').className = 'vp-status-badge error';
      card.querySelector('.vp-status-badge').textContent = t('videoError') || 'Error';
    }
  }
}

async function fixSingleVideo(src, lang, card, btn) {
  const logEl = $('log-output');
  const logContainer = $('processing-log');
  logContainer.classList.remove('hidden');

  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    logEl.textContent += `[${time}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const fileName = src.split('/').pop();

  card.classList.remove('ok', 'needs_fix', 'fixed', 'converted', 'error');
  card.classList.add('processing');
  card.querySelector('.vp-status-badge').className = 'vp-status-badge processing';
  card.querySelector('.vp-status-badge').textContent = t('videoProcessing') || 'Processing...';
  btn.disabled = true;
  btn.classList.add('processing');
  btn.textContent = t('fixing') || 'Fixing...';

  log(`Starting fix for ${fileName} (${lang}) with quality: ${vpQualityMode}`);

  vpAbortController = new AbortController();

  try {
    const res = await fetch('/api/fix-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualityMode: vpQualityMode, files: [fileName] }),
      signal: vpAbortController.signal
    });

    const data = await res.json();
    log(`Server response: ${data.ok ? 'OK' : 'FAILED'} - ${data.error || ''}`);

    if (data.ok && data.summary && data.summary.Results) {
      const result = data.summary.Results.find(r => r.File && r.File.includes(fileName));
      if (result) {
        card.classList.remove('processing');
        card.classList.add(result.Status);
        card.querySelector('.vp-status-badge').className = `vp-status-badge ${result.Status}`;
        const labels = {
          fixed: t('videoFixed') || 'Fixed',
          converted: t('formatConverted') || 'Converted',
          error: t('videoError') || 'Error'
        };
        card.querySelector('.vp-status-badge').textContent = labels[result.Status] || result.Status;
        btn.disabled = true;
        btn.textContent = labels[result.Status] || 'Done';
        btn.classList.remove('processing');

        if (result.Status === 'error') {
          log(`ERROR: ${result.Error || 'Unknown error'}`);
        } else {
          log(`SUCCESS: ${result.Status.toUpperCase()}`);
        }

        // Reload video info
        setTimeout(() => buildVideoStatusGrid(), 500);
      }
    } else {
      throw new Error(data.error || 'Fix failed');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      log('Aborted by user');
    } else {
      log(`ERROR: ${err.message}`);
      card.classList.remove('processing');
      card.classList.add('error');
      card.querySelector('.vp-status-badge').className = 'vp-status-badge error';
      card.querySelector('.vp-status-badge').textContent = t('videoError') || 'Error';
    }
    btn.disabled = false;
    btn.classList.remove('processing');
    btn.textContent = t('retry') || 'Retry';
    btn.onclick = () => fixSingleVideo(src, lang, card, btn);
  }
}

async function fixAllVideos() {
  const btn = $('fix-all-btn');
  const scanBtn = $('scan-btn-vp');
  const qualitySelect = $('quality-mode');
  const logEl = $('log-output');
  const logContainer = $('processing-log');

  btn.disabled = true;
  scanBtn.disabled = true;
  qualitySelect.disabled = true;
  logEl.textContent = '';
  logContainer.classList.remove('hidden');

  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    logEl.textContent += `[${time}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  vpQualityMode = qualitySelect.value;
  log(`Starting batch fix with quality: ${vpQualityMode}`);

  vpAbortController = new AbortController();

  try {
    const res = await fetch('/api/fix-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualityMode: vpQualityMode }),
      signal: vpAbortController.signal
    });

    const data = await res.json();
    log(`Batch fix completed. OK: ${data.ok}`);

    if (data.ok && data.summary && data.summary.Results) {
      const results = data.summary.Results;
      const fixed = results.filter(r => r.Status === 'fixed').length;
      const converted = results.filter(r => r.Status === 'converted').length;
      const errors = results.filter(r => r.Status === 'error').length;
      const ok = results.filter(r => r.Status === 'ok').length;
      const needsFix = results.filter(r => r.Status === 'needs_fix').length;

      log(`Summary: OK=${ok}, Fixed=${fixed}, Converted=${converted}, NeedsFix=${needsFix}, Errors=${errors}`);

      for (const r of results) {
        if (r.Status === 'error') {
          log(`  ERROR: ${r.File} - ${r.Error || 'Unknown'}`);
        } else if (r.Status !== 'ok') {
          log(`  ${r.Status.toUpperCase()}: ${r.File}`);
        }
      }

      showToast(tf('fixComplete', { fixed: fixed + converted, errors }));
    } else {
      log(`ERROR: ${data.error || 'Batch fix failed'}`);
      showToast(t('fixFailed') || 'Fix failed');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      log(`ERROR: ${err.message}`);
      showToast(t('fixFailed') || 'Fix failed');
    }
  } finally {
    btn.disabled = false;
    scanBtn.disabled = false;
    qualitySelect.disabled = false;
    btn.textContent = t('fixAllVideos');
    await buildVideoStatusGrid();
  }
}

async function scanVideosVP() {
  const btn = $('scan-btn-vp');
  btn.disabled = true;
  btn.textContent = t('scanning');
  await buildVideoStatusGrid();
  btn.disabled = false;
  btn.textContent = t('scan');
}

$('quality-mode').addEventListener('change', e => {
  vpQualityMode = e.target.value;
  draft.videoQualityMode = e.target.value;
});

$('fix-all-btn').addEventListener('click', fixAllVideos);
$('scan-btn-vp').addEventListener('click', scanVideosVP);

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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
  cfg.videoQualityMode = draft.videoQualityMode;
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
