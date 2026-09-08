/**
 * @file Screen router
 */

import { ui } from './state.js';
import { $ } from './ui.js';

let _clearIdleTimer = null;
let _clearHudTimer = null;
let _hideOnScreenKeyboard = null;

export function registerPlayerTimers(clearIdle, clearHud) { _clearIdleTimer = clearIdle; _clearHudTimer = clearHud; }
export function registerOskHide(fn) { _hideOnScreenKeyboard = fn; }

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $('screen-' + name);
  if (el) el.classList.add('active');
  ui.activeScreen = name;
  const adminCorner = $('admin-corner');
  if (adminCorner) adminCorner.style.display = (name === 'main') ? '' : 'none';
  if (name !== 'admin' && _hideOnScreenKeyboard) _hideOnScreenKeyboard();

  if (name !== 'player') {
    const v = $('player-video');
    v.pause(); v.removeAttribute('src'); v.load();
    $('player-error').classList.remove('active');
    $('player-spinner').classList.remove('active');
    if (_clearIdleTimer) _clearIdleTimer();
    if (_clearHudTimer) _clearHudTimer();
  }
}
