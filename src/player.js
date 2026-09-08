/**
 * @file Video player logic - HUD, idle timer, volume, controls
 */

import { cfg, ui } from './state.js';
import { $ } from './ui.js';
import { IDLE_TIMEOUT_MS, HUD_FADE_MS, SEEK_STEP_SECONDS } from './config.js';
import { showScreen } from './screen-router.js';
import { persistVolumes } from './persistence.js';

let _hudTimer = null;
let _idleTimer = null;

export function hudActivity() {
  const hud = $('player-hud');
  hud.classList.remove('hud-faded');
  clearHudTimer();
  const v = $('player-video');
  if (!v.paused && !v.ended) {
    _hudTimer = setTimeout(() => hud.classList.add('hud-faded'), HUD_FADE_MS);
  }
}

export function clearHudTimer() {
  if (_hudTimer) { clearTimeout(_hudTimer); _hudTimer = null; }
}

function startHudFadeCountdown() {
  clearHudTimer();
  _hudTimer = setTimeout(() => $('player-hud').classList.add('hud-faded'), HUD_FADE_MS);
}

function startIdleTimer() {
  clearIdleTimer();
  _idleTimer = setTimeout(leavePlayer, IDLE_TIMEOUT_MS);
}

export function clearIdleTimer() {
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
}

export function updateVolUI(value) {
  const pct = Math.round(value * 100);
  const slider = $('player-vol');
  slider.value = value;
  slider.style.setProperty('--vol-pct', pct + '%');
  $('player-vol-pct').textContent = pct + '%';
  const path = document.getElementById('vol-icon-path');
  if (value === 0) {
    path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z');
  } else if (value < 0.5) {
    path.setAttribute('d', 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z');
  } else {
    path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
  }
}

export function syncPlayerToggleUI() {
  const paused = $('player-video').paused;
  const label = paused ? 'Play' : 'Pause';
  const icon = paused
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  const btn = $('player-play-toggle');
  if (!btn) return;
  btn.innerHTML = icon;
  btn.setAttribute('aria-label', `${label} video`);
}

export function togglePlayerPlayback() {
  const v = $('player-video');
  if (v.paused || v.ended) v.play().catch(() => {});
  else v.pause();
  hudActivity();
  syncPlayerToggleUI();
}

export function seekPlayerBy(delta) {
  const v = $('player-video');
  const maxTime = Number.isFinite(v.duration) ? v.duration : Math.max(v.currentTime + Math.abs(delta), 0);
  v.currentTime = Math.max(0, Math.min(maxTime, v.currentTime + delta));
  hudActivity();
}

export function refocusPlayerSurface() {
  requestAnimationFrame(() => $('screen-player').focus({ preventScroll: true }));
}

export function leavePlayer() {
  clearIdleTimer();
  clearHudTimer();
  showScreen('main');
  if (_clearGridSelection) _clearGridSelection(Math.min(ui.lastTileIdx, ui.gridTiles.length - 1));
  $('tile-grid').focus({ preventScroll: true });
}

let _clearGridSelection = null;
export function registerClearGridSelection(fn) { _clearGridSelection = fn; }

export function wirePlayer() {
  const v = $('player-video');
  const screen = $('screen-player');

  v.addEventListener('enterpictureinpicture', () => { document.exitPictureInPicture().catch(() => {}); });
  document.addEventListener('contextmenu', e => e.preventDefault());

  v.addEventListener('canplay', () => $('player-spinner').classList.remove('active'));
  v.addEventListener('waiting', () => $('player-spinner').classList.add('active'));
  v.addEventListener('playing', () => {
    $('player-spinner').classList.remove('active');
    clearIdleTimer(); startHudFadeCountdown(); syncPlayerToggleUI();
  });
  v.addEventListener('pause', () => { hudActivity(); startIdleTimer(); syncPlayerToggleUI(); });
  v.addEventListener('ended', leavePlayer);
  v.addEventListener('error', () => {
    $('player-spinner').classList.remove('active');
    $('player-error').classList.add('active');
    clearIdleTimer();
  });

  screen.addEventListener('mousemove', hudActivity, { passive: true });
  screen.addEventListener('touchstart', hudActivity, { passive: true });

  screen.addEventListener('keydown', e => {
    hudActivity();
    switch (e.key) {
      case 'Escape': case 'BrowserBack': case 'GoBack':
        e.preventDefault(); leavePlayer(); break;
      case ' ': case 'Enter': case 'NumpadEnter': case 'MediaPlayPause':
        e.preventDefault(); togglePlayerPlayback(); break;
      case 'ArrowLeft': case 'MediaRewind':
        e.preventDefault(); seekPlayerBy(-SEEK_STEP_SECONDS); break;
      case 'ArrowRight': case 'MediaFastForward':
        e.preventDefault(); seekPlayerBy(SEEK_STEP_SECONDS); break;
      case 'ArrowUp':
        e.preventDefault();
        v.volume = Math.min(1, v.volume + 0.05);
        updateVolUI(v.volume);
        if (ui.currentVideoId) { cfg.videoVolumes[ui.currentVideoId] = v.volume; persistVolumes(); }
        break;
      case 'ArrowDown':
        e.preventDefault();
        v.volume = Math.max(0, v.volume - 0.05);
        updateVolUI(v.volume);
        if (ui.currentVideoId) { cfg.videoVolumes[ui.currentVideoId] = v.volume; persistVolumes(); }
        break;
    }
  });

  $('player-vol').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    v.volume = val; updateVolUI(val);
    if (ui.currentVideoId) { cfg.videoVolumes[ui.currentVideoId] = val; persistVolumes(); }
    hudActivity();
  });

  $('player-vol-icon').addEventListener('click', () => {
    v.muted = !v.muted;
    updateVolUI(v.muted ? 0 : v.volume);
    hudActivity(); refocusPlayerSurface();
  });

  $('player-play-toggle').addEventListener('click', () => { togglePlayerPlayback(); refocusPlayerSurface(); });
  $('player-rewind').addEventListener('click', () => { seekPlayerBy(-SEEK_STEP_SECONDS); refocusPlayerSurface(); });
  $('player-forward').addEventListener('click', () => { seekPlayerBy(SEEK_STEP_SECONDS); refocusPlayerSurface(); });
  $('player-back').addEventListener('click', () => { leavePlayer(); refocusPlayerSurface(); });
  $('player-err-btn').addEventListener('click', leavePlayer);
}
