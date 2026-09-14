import { APP, ui } from './state.js';

export function $(id) { return document.getElementById(id); }

export function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

let toastTimer = null;
export function showToast(message, ms = 3200) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '-';
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = Math.floor(value % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatBytes(bytes) {
  let value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function videoTitle(name) {
  return String(name || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function wcagChannel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function applyAccent(hex) {
  const clean = String(hex || '#00BFA5').replace('#', '');
  const value = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(value.slice(0, 2), 16) || 0;
  const g = parseInt(value.slice(2, 4), 16) || 0;
  const b = parseInt(value.slice(4, 6), 16) || 0;
  const luminance = 0.2126 * wcagChannel(r) + 0.7152 * wcagChannel(g) + 0.0722 * wcagChannel(b);
  document.documentElement.style.setProperty('--accent', `#${value}`);
  document.documentElement.style.setProperty('--accent-text', luminance > 0.179 ? '#111111' : '#ffffff');
}

export function applyTheme(light) {
  document.body.classList.toggle('light', !!light);
}

export function applyViewMode(mode) {
  const grid = $('tile-grid');
  if (!grid) return;
  const valid = ['cards-small', 'cards-medium', 'cards-large', 'list-comfort', 'list-compact'];
  const next = valid.includes(mode) ? mode : 'cards-medium';
  grid.classList.remove(...valid.map(v => `view-${v}`));
  grid.classList.add(`view-${next}`);
}

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(`screen-${name}`);
  if (el) el.classList.add('active');
  const previous = ui.activeScreen;
  ui.activeScreen = name;
  const adminCorner = $('admin-corner');
  if (adminCorner) adminCorner.style.display = name === 'main' ? '' : 'none';
  window.dispatchEvent(new CustomEvent('kiosk:screenchange', { detail: { previous, name } }));
}

const imageSourceCache = new Map();
let logoRequestId = 0;

function resolveImageSource(candidates, preferred) {
  if (preferred) return Promise.resolve(preferred);
  const cacheKey = candidates.join('|');
  if (imageSourceCache.has(cacheKey)) return imageSourceCache.get(cacheKey);
  const pending = new Promise(resolve => {
    let i = 0;
    const next = () => {
      if (i >= candidates.length) { resolve(''); return; }
      const candidate = candidates[i++];
      const image = new Image();
      image.onload = () => resolve(candidate);
      image.onerror = next;
      image.src = candidate;
    };
    next();
  });
  imageSourceCache.set(cacheKey, pending);
  return pending;
}

const LOGO_CANDIDATES = ['assets/logo.png', 'assets/logo.jpg', 'assets/logo.svg'];
const ABOUT_CANDIDATES = ['assets/favicon.jpg', 'assets/favicon.ico'];

export async function applyLogo(src) {
  const requestId = ++logoRequestId;
  const main = $('main-logo');
  const player = $('player-logo');
  const targets = [main, player].filter(Boolean);
  targets.forEach(img => { img.removeAttribute('src'); img.style.display = 'none'; });
  const url = await resolveImageSource(LOGO_CANDIDATES, src);
  if (requestId !== logoRequestId) return;
  if (url) targets.forEach(img => { img.src = url; img.style.display = 'block'; });
}

export async function refreshAboutPanel() {
  if ($('about-name')) $('about-name').textContent = APP.name;
  if ($('about-version')) $('about-version').textContent = `v${APP.version}`;
  if ($('about-build-date')) $('about-build-date').textContent = APP.buildDate;
  if ($('about-license')) $('about-license').textContent = APP.license;
  if ($('about-author')) $('about-author').textContent = APP.author;
  const img = $('about-image');
  const fallback = $('about-image-fallback');
  if (!img || !fallback) return;
  img.classList.remove('visible');
  img.removeAttribute('src');
  fallback.style.display = '';
  const url = await resolveImageSource(ABOUT_CANDIDATES, '');
  if (url) { img.src = url; img.classList.add('visible'); fallback.style.display = 'none'; }
}

export async function openAboutLink(target) {
  try {
    const res = await import('./api.js');
    const data = await res.apiFetch(`/api/open-${target}`, { method: 'POST', body: '{}' });
    return !!data?.ok;
  } catch (_) { return false; }
}
