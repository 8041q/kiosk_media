/**
 * @file Video catalog and metadata (thumbnails, duration)
 */

import { cfg, catalog, allLangSources, thumbCache, durCache, thumbDebug, thumbSecurityToastShown, setAllLangSources, setThumbSecurityToastShown } from './state.js';
import { CONCURRENCY, LANGUAGES, MEDIA_MANIFEST_SRC, MEDIA_MANIFEST_GLOBAL } from './config.js';
import { makeRecord, $ } from './ui.js';
import { showToast } from './ui.js';

let activeProbes = 0;
const metaQueue = [];

export function queueMeta(record, onThumb, onDuration) {
  thumbDebug.queued += 1;
  metaQueue.push({ record, onThumb, onDuration });
  drainMeta();
}

function drainMeta() {
  while (activeProbes < CONCURRENCY && metaQueue.length > 0) {
    const job = metaQueue.shift();
    activeProbes++;
    runMeta(job).finally(() => { activeProbes--; drainMeta(); });
  }
}

function runMeta({ record, onThumb, onDuration }) {
  return new Promise(resolve => {
    if (thumbCache.has(record.src) && durCache.has(record.src)) {
      onThumb(thumbCache.get(record.src));
      onDuration(durCache.get(record.src));
      resolve(); return;
    }

    const MAX_CAPTURE_ATTEMPTS = 2;
    const video  = document.createElement('video');
    video.muted  = true; video.preload = 'auto'; video.playsInline = true;
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 180;
    const ctx    = canvas.getContext('2d');
    let done = false;
    let attempts = 0;
    let timer = null;

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.removeAttribute('src');
      video.load();
    };

    const finish = () => { if (done) return; done = true; cleanup(); resolve(); };

    const settleFailure = (reason, err) => {
      thumbDebug.failed += 1;
      if (reason === 'timeout') thumbDebug.timeout += 1;
      else if (reason === 'media-error') thumbDebug.mediaError += 1;
      else if (reason === 'seek-error') thumbDebug.seekError += 1;

      if (err && err.name === 'SecurityError') {
        thumbDebug.securityError += 1;
        if (!thumbSecurityToastShown) {
          setThumbSecurityToastShown(true);
          showToast('Thumbnail capture blocked by browser security (file mode).');
        }
      } else if (err) { thumbDebug.otherError += 1; }

      if (thumbDebug.warns < 6) {
        const msg = err ? `${err.name || 'Error'}: ${err.message || 'unknown'}` : 'no exception details';
        console.warn('[kiosk thumb] failed', { src: record.src, reason, detail: msg });
        thumbDebug.warns += 1;
      }
      thumbCache.set(record.src, null);
      if (!durCache.has(record.src)) { durCache.set(record.src, 0); onDuration(0); }
      onThumb(null); finish();
    };

    const settleSuccess = (url) => {
      thumbDebug.success += 1;
      thumbCache.set(record.src, url);
      onThumb(url); finish();
    };

    const trySeekAt = (time) => {
      try { video.currentTime = time; } catch (err) { settleFailure('seek-error', err); }
    };

    const handleLoadedData = () => {
      if (isFinite(video.duration)) { durCache.set(record.src, video.duration); onDuration(video.duration); }
      const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const startTime = duration ? Math.min(2, Math.max(duration * 0.1, 0.05), Math.max(duration - 0.25, 0)) : 0;
      trySeekAt(startTime);
    };

    const handleSeeked = () => {
      if (!ctx) { settleFailure(); return; }
      try {
        ctx.drawImage(video, 0, 0, 320, 180);
        const url = canvas.toDataURL('image/jpeg', 0.72);
        if (!url) throw new Error('empty thumbnail');
        settleSuccess(url);
      } catch (err) {
        attempts += 1;
        if (attempts < MAX_CAPTURE_ATTEMPTS) {
          const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
          const retryTime = dur ? Math.min(Math.max(dur * 0.35, 1), Math.max(dur - 0.25, 0)) : 1;
          trySeekAt(retryTime); return;
        }
        settleFailure('capture-error', err);
      }
    };

    const handleError = () => { settleFailure('media-error'); };

    timer = setTimeout(() => { settleFailure('timeout'); }, 10000);
    video.addEventListener('loadeddata', handleLoadedData, { once: true });
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError, { once: true });
    video.src = record.src; video.load();
  });
}

export function bindThumbImage(imgEl, placeholderEl, url, hiddenClass = 'hidden') {
  const showPlaceholder = () => {
    if (!placeholderEl) return;
    if (hiddenClass) placeholderEl.classList.remove(hiddenClass);
    else placeholderEl.style.display = '';
  };
  const reveal = () => {
    imgEl.classList.add('loaded');
    if (!placeholderEl) return;
    if (hiddenClass) placeholderEl.classList.add(hiddenClass);
    else placeholderEl.style.display = 'none';
  };
  if (!url) {
    imgEl.onload = null; imgEl.onerror = null;
    imgEl.classList.remove('loaded'); imgEl.removeAttribute('src');
    showPlaceholder(); return;
  }
  const keepPlaceholder = () => { imgEl.classList.remove('loaded'); showPlaceholder(); };
  showPlaceholder();
  imgEl.onload = reveal; imgEl.onerror = keepPlaceholder; imgEl.src = url;
  if (imgEl.complete) { if (imgEl.naturalWidth > 0) reveal(); else keepPlaceholder(); }
}

export function loadInitialManifest() {
  return applyMediaManifest(window[MEDIA_MANIFEST_GLOBAL]);
}

export function reloadMediaManifest() {
  return new Promise(resolve => {
    const existingEl = document.getElementById('media-manifest-script');
    if (existingEl) existingEl.remove();
    window[MEDIA_MANIFEST_GLOBAL] = null;
    const script = document.createElement('script');
    script.id = 'media-manifest-script';
    script.src = `${MEDIA_MANIFEST_SRC}?v=${Date.now()}`;
    script.onload = () => resolve(applyMediaManifest(window[MEDIA_MANIFEST_GLOBAL]));
    script.onerror = () => { setAllLangSources({}); resolve(false); };
    document.head.appendChild(script);
  });
}

function applyMediaManifest(manifest) {
  const src = {};
  if (!manifest || typeof manifest !== 'object') { setAllLangSources(src); return false; }
  LANGUAGES.forEach(({ code }) => { src[code] = makeSourcesFromPaths(manifest[code] || []); });
  setAllLangSources(src);
  return Object.values(src).some(arr => arr.length > 0);
}

function makeSourcesFromPaths(paths) {
  return paths
    .filter(p => typeof p === 'string' && p.trim())
    .map(p => ({ name: decodeURIComponent(p.split('/').pop()), src: p }));
}

export function loadCatalogForLanguage(lang) {
  if (lang in allLangSources) buildCatalog(allLangSources[lang]);
}

export function buildCatalog(sources) {
  catalog.videos = sources.map(({ name, src }) => makeRecord(name, src));
  for (const v of catalog.videos) {
    if (!cfg.selectedIds.includes(v.id) && !cfg.disabledIds.includes(v.id)) {
      cfg.selectedIds.push(v.id);
    }
  }
}

export function loadFallbackCatalog() {
  if (typeof VIDEO_LIST === 'undefined') { buildCatalog([]); return; }
  const paths = VIDEO_LIST[cfg.language] || VIDEO_LIST.en;
  buildCatalog(paths.map(p => ({ name: p.split('/').pop(), src: p })));
}

export async function scanAllLanguages() {
  try {
    const resp = await fetch('/api/scan', { method: 'POST', cache: 'no-store', headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return await reloadMediaManifest();
  } catch { return await reloadMediaManifest(); }
  return await reloadMediaManifest();
}

export async function requestKioskExit() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch('/api/exit', { method: 'POST', cache: 'no-store', headers: { 'Accept': 'application/json' }, signal: controller.signal });
    return resp.ok;
  } catch { return false; } finally { clearTimeout(timer); }
}

export async function requestExternalOpen(target) {
  try {
    const resp = await fetch(`/api/open-${target}`, { method: 'POST' });
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => ({}));
    return !!data.ok;
  } catch (_) { return false; }
}
