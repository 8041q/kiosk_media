import { cfg, ui, IDLE_TIMEOUT_MS, HUD_FADE_MS, SEEK_STEP_SECONDS, saveSettingsSoon } from '../core/state.js';
import { $, showScreen } from '../core/ui.js';
import { focusLibraryTile } from './library.js';

let hudTimer = null;
let idleTimer = null;
let scrubbing = false;

function clearHudTimer() { clearTimeout(hudTimer); hudTimer = null; }
function clearIdleTimer() { clearTimeout(idleTimer); idleTimer = null; }

function hudActivity() {
  const hud = $('player-hud');
  if (!hud) return;
  hud.classList.remove('hud-faded');
  clearHudTimer();
  const v = $('player-video');
  if (v && !v.paused && !v.ended && !scrubbing) hudTimer = setTimeout(() => hud.classList.add('hud-faded'), HUD_FADE_MS);
}

function startIdleTimer() { clearIdleTimer(); idleTimer = setTimeout(leavePlayer, IDLE_TIMEOUT_MS); }
function startHudTimer() {
  clearHudTimer();
  if (!scrubbing) hudTimer = setTimeout(() => $('player-hud')?.classList.add('hud-faded'), HUD_FADE_MS);
}

function formatPlayerTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function ensurePlayerProgress() {
  const hud = $('player-hud');
  if (!hud || $('player-progress-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'player-progress-wrap';
  wrap.className = 'hud-fadeable';
  wrap.innerHTML = `
    <div class="player-progress-heading">
      <div id="player-now-title" title=""></div>
      <div class="player-time-readout" aria-hidden="true">
        <span id="player-time-current">0:00</span>
        <span class="player-time-separator">/</span>
        <span id="player-time-duration">0:00</span>
      </div>
    </div>
    <input id="player-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Video progress" style="--seek-pct:0%;--buffer-pct:0%" />`;
  hud.appendChild(wrap);
}

function updateBufferedUI(v) {
  const seek = $('player-seek');
  if (!seek || !Number.isFinite(v.duration) || v.duration <= 0 || !v.buffered?.length) {
    seek?.style.setProperty('--buffer-pct', '0%');
    return;
  }
  let furthest = 0;
  for (let i = 0; i < v.buffered.length; i += 1) furthest = Math.max(furthest, v.buffered.end(i));
  const pct = Math.max(0, Math.min(100, (furthest / v.duration) * 100));
  seek.style.setProperty('--buffer-pct', `${pct}%`);
}

function updateProgressUI() {
  const v = $('player-video');
  const seek = $('player-seek');
  if (!v || !seek) return;
  const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
  const current = Math.max(0, Number.isFinite(v.currentTime) ? v.currentTime : 0);
  const ratio = duration ? Math.min(1, current / duration) : 0;
  seek.value = String(Math.round(ratio * 1000));
  seek.disabled = !duration;
  seek.style.setProperty('--seek-pct', `${ratio * 100}%`);
  if ($('player-time-current')) $('player-time-current').textContent = formatPlayerTime(current);
  if ($('player-time-duration')) $('player-time-duration').textContent = formatPlayerTime(duration);
  updateBufferedUI(v);
}

function updateVolUI(value) {
  const pct = Math.round(value * 100);
  const slider = $('player-vol');
  if (slider) { slider.value = String(value); slider.style.setProperty('--vol-pct', `${pct}%`); }
  if ($('player-vol-pct')) $('player-vol-pct').textContent = `${pct}%`;
  const path = document.getElementById('vol-icon-path'); if (!path) return;
  path.setAttribute('d', value === 0
    ? 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
    : value < 0.5
      ? 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z'
      : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
}

function syncPlayButton() {
  const v = $('player-video'); const btn = $('player-play-toggle'); if (!v || !btn) return;
  const paused = v.paused;
  btn.innerHTML = paused
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  btn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
}

function togglePlayback() {
  const v = $('player-video'); if (!v) return;
  if (v.paused || v.ended) v.play().catch(() => {}); else v.pause();
  hudActivity(); syncPlayButton();
}

function seek(delta) {
  const v = $('player-video'); if (!v) return;
  const max = Number.isFinite(v.duration) ? v.duration : Math.max(v.currentTime + Math.abs(delta), 0);
  v.currentTime = Math.max(0, Math.min(max, v.currentTime + delta));
  updateProgressUI(); hudActivity();
}

function refocus() { requestAnimationFrame(() => $('screen-player')?.focus({ preventScroll: true })); }

function cleanupVideo() {
  const v = $('player-video'); if (!v) return;
  v.pause(); v.removeAttribute('src'); v.load();
  $('player-error')?.classList.remove('active'); $('player-spinner')?.classList.remove('active');
  clearIdleTimer(); clearHudTimer(); scrubbing = false;
  if ($('player-now-title')) { $('player-now-title').textContent = ''; $('player-now-title').removeAttribute('title'); }
  if ($('player-seek')) { $('player-seek').value = '0'; $('player-seek').style.setProperty('--seek-pct', '0%'); $('player-seek').style.setProperty('--buffer-pct', '0%'); }
  if ($('player-time-current')) $('player-time-current').textContent = '0:00';
  if ($('player-time-duration')) $('player-time-duration').textContent = '0:00';
}

function leavePlayer() {
  cleanupVideo(); showScreen('main'); focusLibraryTile(ui.lastTileIdx);
}

function openVideo(record, tileIdx) {
  ui.lastTileIdx = tileIdx; ui.currentVideoId = record.id;
  const v = $('player-video');
  $('player-error')?.classList.remove('active'); $('player-spinner')?.classList.add('active'); $('player-hud')?.classList.remove('hud-faded');
  const title = record.title || record.name || '';
  if ($('player-now-title')) { $('player-now-title').textContent = title; $('player-now-title').title = title; }
  if ($('player-seek')) { $('player-seek').value = '0'; $('player-seek').disabled = true; $('player-seek').style.setProperty('--seek-pct', '0%'); }
  if ($('player-time-current')) $('player-time-current').textContent = '0:00';
  if ($('player-time-duration')) $('player-time-duration').textContent = '0:00';
  const vol = Math.max(0, Math.min(1, cfg.videoVolumes[record.id] ?? 1));
  v.muted = false; v.volume = vol; updateVolUI(vol); v.src = record.src;
  showScreen('player'); refocus(); syncPlayButton();
  v.play().catch(() => { $('player-spinner')?.classList.remove('active'); hudActivity(); startIdleTimer(); syncPlayButton(); });
}

export function initPlayer() {
  const v = $('player-video'); const screen = $('screen-player'); if (!v || !screen) return;
  ensurePlayerProgress();
  const seekBar = $('player-seek');

  window.addEventListener('kiosk:play-video', e => openVideo(e.detail.record, e.detail.tileIdx));
  window.addEventListener('kiosk:screenchange', e => { if (e.detail.name !== 'player' && v.getAttribute('src')) cleanupVideo(); });
  v.addEventListener('enterpictureinpicture', () => document.exitPictureInPicture?.().catch(() => {}));
  document.addEventListener('contextmenu', e => e.preventDefault());
  v.addEventListener('canplay', () => $('player-spinner')?.classList.remove('active'));
  v.addEventListener('waiting', () => $('player-spinner')?.classList.add('active'));
  v.addEventListener('loadedmetadata', updateProgressUI);
  v.addEventListener('durationchange', updateProgressUI);
  v.addEventListener('timeupdate', updateProgressUI);
  v.addEventListener('progress', () => updateBufferedUI(v));
  v.addEventListener('playing', () => { $('player-spinner')?.classList.remove('active'); clearIdleTimer(); startHudTimer(); syncPlayButton(); });
  v.addEventListener('pause', () => { if (ui.activeScreen === 'player') { hudActivity(); startIdleTimer(); } syncPlayButton(); });
  v.addEventListener('ended', leavePlayer);
  v.addEventListener('error', () => { $('player-spinner')?.classList.remove('active'); $('player-error')?.classList.add('active'); clearIdleTimer(); });

  screen.addEventListener('mousemove', hudActivity, { passive: true });
  screen.addEventListener('touchstart', hudActivity, { passive: true });
  screen.addEventListener('pointerdown', hudActivity, { passive: true });
  screen.addEventListener('keydown', e => {
    hudActivity();
    switch (e.key) {
      case 'Escape': case 'BrowserBack': case 'GoBack': e.preventDefault(); leavePlayer(); break;
      case ' ': case 'Enter': case 'NumpadEnter': case 'MediaPlayPause': e.preventDefault(); togglePlayback(); break;
      case 'ArrowLeft': case 'MediaRewind': e.preventDefault(); seek(-SEEK_STEP_SECONDS); break;
      case 'ArrowRight': case 'MediaFastForward': e.preventDefault(); seek(SEEK_STEP_SECONDS); break;
      case 'Home': e.preventDefault(); if (Number.isFinite(v.duration)) { v.currentTime = 0; updateProgressUI(); } break;
      case 'End': e.preventDefault(); if (Number.isFinite(v.duration)) { v.currentTime = Math.max(0, v.duration - 0.1); updateProgressUI(); } break;
      case 'ArrowUp': e.preventDefault(); v.muted = false; v.volume = Math.min(1, v.volume + 0.05); updateVolUI(v.volume); cfg.videoVolumes[ui.currentVideoId] = v.volume; saveSettingsSoon(); break;
      case 'ArrowDown': e.preventDefault(); v.muted = false; v.volume = Math.max(0, v.volume - 0.05); updateVolUI(v.volume); cfg.videoVolumes[ui.currentVideoId] = v.volume; saveSettingsSoon(); break;
    }
  });

  seekBar?.addEventListener('pointerdown', () => { scrubbing = true; hudActivity(); });
  seekBar?.addEventListener('input', e => {
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, Number(e.target.value) / 1000));
    v.currentTime = ratio * v.duration;
    updateProgressUI(); hudActivity();
  });
  const endScrub = () => { scrubbing = false; hudActivity(); if (!v.paused && !v.ended) startHudTimer(); };
  seekBar?.addEventListener('pointerup', endScrub);
  seekBar?.addEventListener('pointercancel', endScrub);
  seekBar?.addEventListener('change', endScrub);

  $('player-vol')?.addEventListener('input', e => { const value = Number(e.target.value); v.muted = false; v.volume = value; updateVolUI(value); if (ui.currentVideoId) { cfg.videoVolumes[ui.currentVideoId] = value; saveSettingsSoon(); } hudActivity(); });
  $('player-vol-icon')?.addEventListener('click', () => { v.muted = !v.muted; updateVolUI(v.muted ? 0 : v.volume); hudActivity(); refocus(); });
  $('player-play-toggle')?.addEventListener('click', () => { togglePlayback(); refocus(); });
  $('player-rewind')?.addEventListener('click', () => { seek(-SEEK_STEP_SECONDS); refocus(); });
  $('player-forward')?.addEventListener('click', () => { seek(SEEK_STEP_SECONDS); refocus(); });
  $('player-back')?.addEventListener('click', leavePlayer);
  $('player-err-btn')?.addEventListener('click', leavePlayer);
}
