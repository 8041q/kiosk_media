/**
 * @file Application state management
 */

import { DEFAULT_PASSWORD, DEFAULT_ACCENT } from './config.js';

/** @type {Object} */
export const cfg = {
  password:     DEFAULT_PASSWORD,
  accent:       DEFAULT_ACCENT,
  lightMode:    false,
  logoSrc:      null,
  selectedIds:  [],
  disabledIds:  [],
  videoVolumes: {},
  videoTitles:  {},
  language:     'en',
  viewMode:     'cards-medium',
};

/** @type {Object} */
export const catalog = { videos: [] };

/** @type {Object} */
export const ui = {
  activeScreen: 'main',
  lastTileIdx:  0,
  rovingIdx:    0,
  gridTiles:    [],
  currentVideoId: null,
};

/** @type {Object} */
export const draft = {
  selectedIds:  [],
  videoVolumes: {},
  videoTitles:  {},
  accent:       DEFAULT_ACCENT,
  lightMode:    false,
  logoSrc:      null,
  password:     DEFAULT_PASSWORD,
  language:     'en',
  viewMode:     'cards-medium',
};

/** @type {Object|null} */
export let mediaRootHandle = null;

/** @type {Object.<string, Array<{name: string, src: string}>>} */
export let allLangSources = {};

/** @type {string} */
export let adminVidLang = 'en';

/** @type {Map} */
export const thumbCache = new Map();

/** @type {Map} */
export const durCache = new Map();

/** @type {Object} */
export const thumbDebug = {
  queued: 0, success: 0, failed: 0, timeout: 0,
  mediaError: 0, seekError: 0, securityError: 0, otherError: 0, warns: 0,
};

/** @type {boolean} */
export let thumbSecurityToastShown = false;

export function setAllLangSources(val) { allLangSources = val; }
export function setAdminVidLang(val) { adminVidLang = val; }
export function setMediaRootHandle(val) { mediaRootHandle = val; }
export function setThumbSecurityToastShown(val) { thumbSecurityToastShown = val; }
