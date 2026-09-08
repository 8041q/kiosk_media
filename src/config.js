/**
 * @file Configuration constants for the Exhibition Kiosk
 */

/** @type {string} */
export const DEFAULT_PASSWORD = '1234';

/** @type {string} */
export const DEFAULT_ACCENT = '#00BFA5';

/** @type {number} */
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/** @type {number} */
export const HUD_FADE_MS = 1500; // 1.5 seconds of inactivity → fade HUD

/** @type {number} */
export const SEEK_STEP_SECONDS = 5;

/** @type {string[]} */
export const VIEW_MODES = ['cards-medium', 'cards-large', 'cards-small', 'list-comfort', 'list-compact'];

/** @type {string} */
export const APP_NAME = 'Exhibition Kiosk';

/** @type {string} */
export const APP_VERSION = '1.0.0';

/** @type {string} */
export const APP_BUILD_DATE = '2026-05-08';

/** @type {string} */
export const APP_LICENSE = 'MIT';

/** @type {string} */
export const APP_AUTHOR = 'Made by 8041q (crt_)';

/** @type {string} */
export const GITHUB_URL = 'https://github.com/8041q/kiosk_media';

/** @type {string} */
export const ISSUES_URL = 'https://github.com/8041q/kiosk_media/issues';

/** @type {string[]} */
export const LOGO_IMAGE_CANDIDATES = ['assets/logo.png', 'assets/logo.jpg', 'assets/logo.svg'];

/** @type {string[]} */
export const ABOUT_IMAGE_CANDIDATES = ['bin/favicon.jpg'];

/**
 * @typedef {Object} LanguageConfig
 * @property {string} code
 * @property {string} label
 * @property {string} folder
 */

/** @type {LanguageConfig[]} */
export const LANGUAGES = [
  { code: 'en', label: 'English',   folder: 'en'    },
  { code: 'zh', label: '中文',       folder: 'zh'    },
  { code: 'pt', label: 'Português', folder: 'pt' },
  { code: 'es', label: 'Español',   folder: 'es'    },
  { code: 'fr', label: 'Français',  folder: 'fr'    },
];

/** @type {string} */
export const LS_KEY = 'kiosk_v3';

/** @type {string} */
export const MEDIA_MANIFEST_SRC = 'media/manifest.js';

/** @type {string} */
export const MEDIA_MANIFEST_GLOBAL = 'KIOSK_MEDIA_MANIFEST';

/** @type {string} */
export const MEDIA_SCAN_API = '/api/scan';

/** @type {string} */
export const MEDIA_EXIT_API = '/api/exit';

/** @type {number} */
export const CONCURRENCY = 3;