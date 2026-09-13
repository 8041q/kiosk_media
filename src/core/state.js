import { apiFetch } from './api.js';

export const APP = Object.freeze({
  name: 'Exhibition Kiosk',
  version: '2.2.0',
  buildDate: '2026-09-13',
  license: 'MIT',
  author: 'Made by 8041q (crt_)',
  githubUrl: 'https://github.com/8041q/kiosk_media',
  issuesUrl: 'https://github.com/8041q/kiosk_media/issues',
});

export const VIEW_MODES = ['cards-medium', 'cards-large', 'cards-small', 'list-comfort', 'list-compact'];
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
export const HUD_FADE_MS = 1500;
export const SEEK_STEP_SECONDS = 5;
export const LS_KEY = 'kiosk_v4';

const DEFAULT_CONFIG = Object.freeze({
  password: '1234',
  accent: '#00BFA5',
  lightMode: false,
  logoSrc: null,
  selectedIds: [],
  disabledIds: [],
  videoVolumes: {},
  videoTitles: {},
  language: 'en',
  viewMode: 'cards-medium',
  processingProfile: 'recommended',
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export const cfg = clone(DEFAULT_CONFIG);
export const draft = clone(DEFAULT_CONFIG);
export const catalog = { byLanguage: {}, videos: [], all: [] };
export const ui = {
  activeScreen: 'main',
  lastTileIdx: 0,
  rovingIdx: 0,
  gridTiles: [],
  currentVideoId: null,
  adminLanguage: 'en',
};

export function resetDraft() {
  Object.assign(draft, clone(cfg));
}

export function commitDraft() {
  Object.assign(cfg, clone(draft));
}

export function setCatalog(byLanguage) {
  catalog.byLanguage = byLanguage || {};
  catalog.all = Object.entries(catalog.byLanguage).flatMap(([language, videos]) =>
    (videos || []).map(v => ({ ...v, language, id: v.id || v.src }))
  );
  setActiveCatalogLanguage(cfg.language);
}

export function setActiveCatalogLanguage(language) {
  catalog.videos = (catalog.byLanguage[language] || []).map(v => ({ ...v, language, id: v.id || v.src }));
}

function sanitizeLoaded(s) {
  if (!s || typeof s !== 'object') return;
  if (typeof s.password === 'string' && s.password) cfg.password = s.password;
  if (typeof s.accent === 'string') cfg.accent = s.accent;
  if (typeof s.lightMode === 'boolean') cfg.lightMode = s.lightMode;
  if ('logoSrc' in s) cfg.logoSrc = s.logoSrc || null;
  if (Array.isArray(s.selectedIds)) cfg.selectedIds = [...s.selectedIds];
  if (Array.isArray(s.disabledIds)) cfg.disabledIds = [...s.disabledIds];
  if (s.videoVolumes && typeof s.videoVolumes === 'object') cfg.videoVolumes = { ...s.videoVolumes };
  if (s.videoTitles && typeof s.videoTitles === 'object') cfg.videoTitles = clone(s.videoTitles);
  if (typeof s.language === 'string') cfg.language = s.language;
  if (VIEW_MODES.includes(s.viewMode)) cfg.viewMode = s.viewMode;
  if (['recommended', 'high', 'smaller'].includes(s.processingProfile)) cfg.processingProfile = s.processingProfile;
  // v1 compatibility
  if (s.videoQualityMode === 'lossless' && !s.processingProfile) cfg.processingProfile = 'high';
}

export async function loadSettings() {
  let loaded = null;
  try { loaded = await apiFetch('/api/config'); } catch (_) {}
  if (!loaded || !Object.keys(loaded).length) {
    for (const key of [LS_KEY, 'kiosk_v3']) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) { loaded = JSON.parse(raw); break; }
      } catch (_) {}
    }
  }
  sanitizeLoaded(loaded);
  resetDraft();
}

function serializableConfig() {
  return {
    password: cfg.password,
    accent: cfg.accent,
    lightMode: cfg.lightMode,
    logoSrc: cfg.logoSrc,
    selectedIds: [...cfg.selectedIds],
    disabledIds: [...cfg.disabledIds],
    videoVolumes: { ...cfg.videoVolumes },
    videoTitles: clone(cfg.videoTitles),
    language: cfg.language,
    viewMode: cfg.viewMode,
    processingProfile: cfg.processingProfile,
  };
}

export async function saveSettings() {
  const data = serializableConfig();
  await apiFetch('/api/config', { method: 'POST', body: JSON.stringify(data) });
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {
    try { const small = { ...data, logoSrc: null }; localStorage.setItem(LS_KEY, JSON.stringify(small)); } catch (_) {}
  }
  return data;
}

let persistTimer = null;
export function saveSettingsSoon(delay = 350) {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { saveSettings().catch(() => {}); }, delay);
}

export function remapMediaId(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return false;
  const apply = target => {
    let changed = false;
    for (const key of ['selectedIds', 'disabledIds']) {
      const arr = Array.isArray(target[key]) ? target[key] : [];
      const had = arr.includes(oldId);
      target[key] = arr.filter(id => id !== oldId);
      if (had && !target[key].includes(newId)) target[key].push(newId);
      changed = changed || had;
    }
    if (target.videoVolumes && Object.prototype.hasOwnProperty.call(target.videoVolumes, oldId)) {
      if (!Object.prototype.hasOwnProperty.call(target.videoVolumes, newId)) target.videoVolumes[newId] = target.videoVolumes[oldId];
      delete target.videoVolumes[oldId]; changed = true;
    }
    for (const titles of Object.values(target.videoTitles || {})) {
      if (titles && Object.prototype.hasOwnProperty.call(titles, oldId)) {
        if (!Object.prototype.hasOwnProperty.call(titles, newId)) titles[newId] = titles[oldId];
        delete titles[oldId]; changed = true;
      }
    }
    return changed;
  };
  const cfgChanged = apply(cfg);
  apply(draft);
  return cfgChanged;
}
