/**
 * @file UI utility functions
 */

export function $(id) { return document.getElementById(id); }

export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

let _toastTimer = null;
export function showToast(msg, ms = 2800) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function formatDuration(s) {
  if (!isFinite(s) || s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
           : `${m}:${String(sec).padStart(2, '0')}`;
}

export function videoId(name) {
  return name.toLowerCase().replace(/[^a-z0-9.]/g, '_');
}

export function videoTitle(name) {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function makeRecord(name, src) {
  return { id: videoId(name), src, name, title: videoTitle(name), duration: null };
}

export function resolveImageSource(candidates, preferredSrc) {
  if (preferredSrc) return Promise.resolve(preferredSrc);
  return new Promise(resolve => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) { resolve(''); return; }
      const candidate = candidates[idx++];
      const probe = new Image();
      probe.onload = () => resolve(candidate);
      probe.onerror = tryNext;
      probe.src = candidate;
    };
    tryNext();
  });
}
