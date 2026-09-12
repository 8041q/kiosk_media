import { apiFetch } from '../core/api.js';
import { cfg, draft, catalog, ui, setCatalog, setActiveCatalogLanguage, migrateLegacyMediaKeys, saveSettingsSoon } from '../core/state.js';
import { $, escHtml, formatDuration, videoTitle, applyViewMode, showToast } from '../core/ui.js';
import { LANGUAGES, t, tf, setLanguage, applyI18n } from '../core/i18n.js';

const thumbCache = new Map();
const durationCache = new Map();
const metaQueue = [];
const activeProbeVideos = new Map();
let activeProbes = 0;
const META_CONCURRENCY = 3;

function normalizeServerCatalog(data) {
  const source = data?.languages || {};
  const result = {};
  for (const { code } of LANGUAGES) {
    result[code] = (source[code] || []).map(item => ({
      id: item.src,
      src: item.src,
      name: item.name || decodeURIComponent(String(item.src).split('/').pop()),
      title: item.title || videoTitle(item.name || String(item.src).split('/').pop()),
      language: code,
    }));
  }
  return result;
}

function ensureSelectionDefaults() {
  for (const video of catalog.all) {
    const id = video.id;
    if (!cfg.selectedIds.includes(id) && !cfg.disabledIds.includes(id)) cfg.selectedIds.push(id);
  }
}

export async function refreshCatalog({ toast = false } = {}) {
  const data = await apiFetch('/api/catalog');
  setCatalog(normalizeServerCatalog(data));
  const migrated = migrateLegacyMediaKeys();
  ensureSelectionDefaults();
  setActiveCatalogLanguage(cfg.language);
  renderLanguageSwitcher();
  if (toast) {
    const total = catalog.all.length;
    const langs = Object.values(catalog.byLanguage).filter(arr => arr.length).length;
    showToast(total ? (langs > 1 ? tf('videosFoundAcross', { count: total, langs }) : tf('videosFound', { count: total })) : t('noVideosFound'));
  }
  if (migrated) saveSettingsSoon(0);
  return data;
}

export function applyLanguage(code, persist = true) {
  if (!LANGUAGES.some(l => l.code === code)) return;
  cfg.language = code;
  setLanguage(code);
  setActiveCatalogLanguage(code);
  applyI18n();
  renderLanguageSwitcher();
  renderMainScreen();
  window.dispatchEvent(new CustomEvent('kiosk:languagechange', { detail: { code } }));
  if (persist) saveSettingsSoon();
}

export function renderLanguageSwitcher() {
  const sw = $('lang-switcher');
  if (!sw) return;
  const visible = LANGUAGES.filter(({ code }) => (catalog.byLanguage[code]?.length || 0) > 0);
  sw.style.display = visible.length <= 1 ? 'none' : '';
  sw.innerHTML = `
    <button id="lang-select" type="button" aria-label="Language" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.87 15.07l-2.54-2.58.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2h-2v2H1v2h11.17c-.41 1.18-1.12 2.3-2.1 3.29-.64-.71-1.18-1.5-1.62-2.35H6.37c.53 1.34 1.35 2.59 2.43 3.69l-5.09 5.02L5.12 17l5.12-5.12 3.19 3.19.44-1.99zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.63 7l1.76-4.67L19.37 17h-3.5z"/></svg>
    </button>
    <div id="lang-menu" role="menu" aria-label="Language">
      ${visible.map(({ code, label }) => `<button class="lang-menu-item${code === cfg.language ? ' active' : ''}" type="button" role="menuitemradio" aria-checked="${code === cfg.language}" data-lang-code="${code}">${escHtml(label)}</button>`).join('')}
    </div>`;
  const trigger = $('lang-select');
  const menu = $('lang-menu');
  const current = LANGUAGES.find(l => l.code === cfg.language);
  trigger.title = current?.label || 'Language';
  trigger.setAttribute('aria-label', current ? `Language: ${current.label}` : 'Language');
  trigger.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); trigger.setAttribute('aria-expanded', String(menu.classList.contains('open'))); });
  menu.querySelectorAll('.lang-menu-item').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation(); closeLangMenu(); applyLanguage(btn.dataset.langCode, true);
  }));
}

export function closeLangMenu() {
  const trigger = $('lang-select');
  const menu = $('lang-menu');
  if (!menu || !trigger) return;
  menu.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
}

function abortProbe(src) {
  const video = activeProbeVideos.get(src);
  if (!video) return;
  activeProbeVideos.delete(src);
  video.removeAttribute('src');
  video.load();
}

export function queueMeta(record, onThumb, onDuration = () => {}) {
  metaQueue.push({ record, onThumb, onDuration });
  drainMeta();
}

function drainMeta() {
  while (activeProbes < META_CONCURRENCY && metaQueue.length) {
    activeProbes += 1;
    runMeta(metaQueue.shift()).finally(() => { activeProbes -= 1; drainMeta(); });
  }
}

function runMeta({ record, onThumb, onDuration }) {
  return new Promise(resolve => {
    if (thumbCache.has(record.src) && durationCache.has(record.src)) {
      onThumb(thumbCache.get(record.src)); onDuration(durationCache.get(record.src)); resolve(); return;
    }
    const video = document.createElement('video');
    video.muted = true; video.preload = 'metadata'; video.playsInline = true;
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    let finished = false; let timer = null; let attempts = 0;
    activeProbeVideos.set(record.src, video);
    const cleanup = () => { clearTimeout(timer); activeProbeVideos.delete(record.src); video.removeAttribute('src'); video.load(); };
    const finish = (thumb = null) => { if (finished) return; finished = true; thumbCache.set(record.src, thumb); onThumb(thumb); cleanup(); resolve(); };
    video.addEventListener('loadeddata', () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      durationCache.set(record.src, duration); onDuration(duration);
      const seek = duration > 0 ? Math.min(2, Math.max(0.05, duration * 0.1), Math.max(0, duration - 0.25)) : 0;
      try { video.currentTime = seek; } catch (_) { finish(null); }
    }, { once: true });
    video.addEventListener('seeked', () => {
      try {
        ctx.drawImage(video, 0, 0, 320, 180);
        finish(canvas.toDataURL('image/jpeg', 0.72));
      } catch (_) {
        attempts += 1;
        if (attempts < 2 && Number.isFinite(video.duration) && video.duration > 1) { video.currentTime = Math.min(video.duration - 0.25, video.duration * 0.35); }
        else finish(null);
      }
    });
    video.addEventListener('error', () => finish(null), { once: true });
    timer = setTimeout(() => finish(null), 10000);
    video.src = record.src; video.load();
  });
}

export function bindThumbImage(img, placeholder, url) {
  const show = () => { img.classList.remove('loaded'); placeholder?.classList.remove('hidden'); };
  const reveal = () => { img.classList.add('loaded'); placeholder?.classList.add('hidden'); };
  show();
  if (!url) { img.removeAttribute('src'); return; }
  img.onload = reveal; img.onerror = show; img.src = url;
  if (img.complete && img.naturalWidth) reveal();
}

export function renderMainScreen() {
  const grid = $('tile-grid');
  if (!grid) return;
  applyViewMode(cfg.viewMode);
  grid.innerHTML = '';
  ui.gridTiles = [];
  ui.rovingIdx = 0;
  const visible = catalog.videos.filter(v => cfg.selectedIds.includes(v.id));
  if (!visible.length) {
    grid.innerHTML = `<div class="grid-message"><svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg><h2>${escHtml(t('noVideos'))}</h2><p>${escHtml(t('openAdminToConfigure'))}</p></div>`;
    return;
  }
  visible.forEach((video, idx) => {
    const tile = document.createElement('div');
    tile.className = 'tile fade-up'; tile.style.animationDelay = `${Math.min(idx * 28, 280)}ms`;
    tile.tabIndex = idx === 0 ? 0 : -1; tile.dataset.idx = String(idx); tile.setAttribute('role', 'gridcell');
    const displayTitle = cfg.videoTitles?.[cfg.language]?.[video.id] || video.title;
    tile.setAttribute('aria-label', displayTitle);
    tile.innerHTML = `<div class="tile-thumb"><div class="tile-loader"></div><img alt=""/><div class="tile-play-overlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><span class="tile-badge"></span></div><div class="tile-meta"><div class="tile-title">${escHtml(displayTitle)}</div><div class="tile-dur"></div></div>`;
    const activate = () => { abortProbe(video.src); window.dispatchEvent(new CustomEvent('kiosk:play-video', { detail: { record: video, tileIdx: idx } })); };
    tile.addEventListener('click', activate);
    tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    tile.addEventListener('focus', () => rovingSync(idx));
    grid.appendChild(tile); ui.gridTiles.push(tile);
    queueMeta(video, url => bindThumbImage(tile.querySelector('img'), tile.querySelector('.tile-loader'), url), secs => {
      const text = formatDuration(secs); if (text !== '—') { tile.querySelector('.tile-badge').textContent = text; tile.querySelector('.tile-dur').textContent = text; }
    });
  });
  initRoving(grid);
}

function rovingSync(idx) {
  ui.gridTiles.forEach((tile, i) => { tile.tabIndex = i === idx ? 0 : -1; tile.classList.toggle('kfocus', i === idx); });
  ui.rovingIdx = idx;
}

function measureCols() {
  if (ui.gridTiles.length < 2) return 1;
  const top = ui.gridTiles[0].getBoundingClientRect().top;
  let cols = 1;
  for (let i = 1; i < ui.gridTiles.length; i++) { if (Math.abs(ui.gridTiles[i].getBoundingClientRect().top - top) < 5) cols += 1; else break; }
  return cols;
}

function initRoving(grid) {
  grid.onkeydown = e => {
    const tiles = ui.gridTiles; if (!tiles.length) return;
    const cols = measureCols(); let next = ui.rovingIdx;
    if (e.key === 'ArrowRight') next = Math.min(next + 1, tiles.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(next - 1, 0);
    else if (e.key === 'ArrowDown') next = Math.min(next + cols, tiles.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(next - cols, 0);
    else if (['Enter', ' ', 'NumpadEnter'].includes(e.key)) { e.preventDefault(); tiles[ui.rovingIdx]?.click(); return; }
    else return;
    e.preventDefault(); rovingSync(next); tiles[next]?.focus();
  };
}

export function focusLibraryTile(index = ui.lastTileIdx) {
  const tiles = ui.gridTiles;
  if (!tiles.length) return;
  const safe = Math.max(0, Math.min(index, tiles.length - 1));
  rovingSync(safe);
  $('tile-grid')?.focus({ preventScroll: true });
}
