/**
 * @file Persistence layer - LocalStorage and server API sync
 */

import { cfg } from './state.js';
import { LS_KEY, VIEW_MODES } from './config.js';
import { UI_STRINGS } from './i18n.js';

export async function persistLoad() {
  let s = null;
  try {
    const res = await fetch('/api/config');
    if (res.ok) s = await res.json();
  } catch (_) {}

  if (!s || !Object.keys(s).length) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) s = JSON.parse(raw);
    } catch (_) {}
  }

  if (!s) return;
  if (s.password)                       cfg.password     = s.password;
  if (s.accent)                         cfg.accent       = s.accent;
  if (typeof s.lightMode === 'boolean') cfg.lightMode    = s.lightMode;
  if (s.logoSrc)                        cfg.logoSrc      = s.logoSrc;
  if (Array.isArray(s.selectedIds))     cfg.selectedIds  = s.selectedIds;
  if (Array.isArray(s.disabledIds))     cfg.disabledIds  = s.disabledIds;
  if (s.videoVolumes && typeof s.videoVolumes === 'object') cfg.videoVolumes = s.videoVolumes;
  if (s.videoTitles  && typeof s.videoTitles  === 'object') cfg.videoTitles  = s.videoTitles;
  if (s.language && UI_STRINGS[s.language]) cfg.language = s.language;
  if (s.viewMode && VIEW_MODES.includes(s.viewMode)) cfg.viewMode = s.viewMode;
}

export function persistSave() {
  const data = {
    password: cfg.password, accent: cfg.accent, lightMode: cfg.lightMode,
    logoSrc: cfg.logoSrc, selectedIds: cfg.selectedIds, disabledIds: cfg.disabledIds,
    videoVolumes: cfg.videoVolumes, videoTitles: cfg.videoTitles, language: cfg.language,
    viewMode: cfg.viewMode,
  };
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {});
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {
    try { data.logoSrc = null; localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {}
  }
}

export function persistVolumes() { persistSave(); }
