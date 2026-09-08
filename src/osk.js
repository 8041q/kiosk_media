/**
 * @file On-screen keyboard
 */

import { cfg } from './state.js';
import { $ } from './ui.js';
import { OSK_STRINGS, OSK_EXTRA_ROWS } from './i18n.js';

const OSK_SELECTOR = 'input[type="text"], input[type="password"]';
let oskTarget = null;
let osk = null;
let oskMode = 'full';

let _checkAuthFn = null;
export function registerCheckAuth(fn) { _checkAuthFn = fn; }

function getOskLanguage() {
  return OSK_STRINGS[cfg.language] ? cfg.language : 'en';
}

function getOskDisplayForLanguage(lang) {
  const labels = OSK_STRINGS[lang] || OSK_STRINGS.en;
  return { '{bksp}': '\u232B', '{shift}': '\u21E7', '{space}': labels.space, '{enter}': labels.enter, '{close}': labels.close };
}

function getNumericOskLayout() {
  return { default: ['7 8 9', '4 5 6', '1 2 3', '0 {bksp}', '{enter} {close}'], shift: ['7 8 9', '4 5 6', '1 2 3', '0 {bksp}', '{enter} {close}'] };
}

function getOskLayoutForLanguage(lang) {
  const extra = OSK_EXTRA_ROWS[lang] || OSK_EXTRA_ROWS.en;
  return {
    default: ['1 2 3 4 5 6 7 8 9 0 {bksp}', 'q w e r t y u i o p', 'a s d f g h j k l', '{shift} z x c v b n m {shift}', extra.default, '{space} {enter} {close}'].filter(Boolean),
    shift: ['! @ # $ % ^ & * ( ) {bksp}', 'Q W E R T Y U I O P', 'A S D F G H J K L', '{shift} Z X C V B N M {shift}', extra.shift, '{space} {enter} {close}'].filter(Boolean),
  };
}

export function syncOskLanguage(layoutName, mode) {
  if (!osk) return;
  const lang = getOskLanguage();
  const nextMode = mode || oskMode || 'full';
  const nextLayoutName = layoutName || (osk.options && osk.options.layoutName) || 'default';
  osk.setOptions({
    layout: nextMode === 'numeric' ? getNumericOskLayout() : getOskLayoutForLanguage(lang),
    display: getOskDisplayForLanguage(lang),
    layoutName: nextMode === 'numeric' ? 'default' : nextLayoutName,
  });
}

function findOskInputTarget(target) {
  if (!(target instanceof Element)) return null;
  const hit = target.closest(OSK_SELECTOR);
  return shouldUseOsk(hit) ? hit : null;
}

function shouldUseOsk(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || '').toLowerCase();
  return (type === 'text' || type === 'password') && !el.disabled && !el.readOnly;
}

function isPinInput(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  return el.id === 'auth-input' || el.id === 'pw1' || el.id === 'pw2';
}

export function forceNumericValue(el) {
  if (!(el instanceof HTMLInputElement)) return;
  const onlyDigits = (el.value || '').replace(/\D+/g, '');
  if (el.value !== onlyDigits) el.value = onlyDigits;
}

export function hideOnScreenKeyboard() {
  const overlay = $('osk-overlay');
  if (!overlay) return;
  overlay.classList.remove('osk-visible');
  overlay.classList.remove('osk-numeric');
  overlay.setAttribute('aria-hidden', 'true');
  oskMode = 'full';
  oskTarget = null;
  if (osk) osk.setOptions({ layoutName: 'default' });
}

function submitFromOsk(input) {
  if (!input) return;
  if (input.id === 'auth-input') { if (_checkAuthFn) _checkAuthFn(); return; }
  if (input.id === 'pw1' || input.id === 'pw2') { $('panel-save').click(); return; }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
}

function showOnScreenKeyboard(input) {
  if (!osk || !shouldUseOsk(input)) return;
  const overlay = $('osk-overlay');
  if (!overlay) return;
  const numeric = isPinInput(input);
  if (numeric) forceNumericValue(input);
  oskMode = numeric ? 'numeric' : 'full';
  oskTarget = input;
  overlay.classList.toggle('osk-numeric', numeric);
  syncOskLanguage('default', oskMode);
  osk.setInput(input.value || '');
  overlay.classList.add('osk-visible');
  overlay.setAttribute('aria-hidden', 'false');
}

export function initOnScreenKeyboard() {
  const overlay = $('osk-overlay');
  const container = $('osk-container');
  if (!overlay || !container) return;
  if (!window.SimpleKeyboard || !window.SimpleKeyboard.default) return;

  const oskLang = getOskLanguage();
  osk = new window.SimpleKeyboard.default({
    layoutName: 'default',
    layout: getOskLayoutForLanguage(oskLang),
    display: getOskDisplayForLanguage(oskLang),
    onChange: val => {
      if (!oskTarget) return;
      let nextVal = val;
      if (isPinInput(oskTarget)) nextVal = (val || '').replace(/\D+/g, '');
      if (nextVal !== val) osk.setInput(nextVal);
      if (oskTarget.value !== nextVal) {
        oskTarget.value = nextVal;
        oskTarget.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    onKeyPress: key => {
      if (key === '{shift}') {
        if (oskMode === 'numeric') return;
        osk.setOptions({ layoutName: osk.options.layoutName === 'default' ? 'shift' : 'default' });
        return;
      }
      if (key === '{enter}') { submitFromOsk(oskTarget); hideOnScreenKeyboard(); return; }
      if (key === '{close}') hideOnScreenKeyboard();
    }
  });

  document.addEventListener('pointerdown', e => {
    const input = findOskInputTarget(e.target);
    if (!input) return;
    if (document.activeElement !== input) { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } }
    showOnScreenKeyboard(input);
  }, true);

  document.addEventListener('focusin', e => {
    const input = findOskInputTarget(e.target);
    if (input) showOnScreenKeyboard(input);
  });

  document.addEventListener('input', e => {
    if (!osk || !oskTarget) return;
    if (e.target === oskTarget) osk.setInput(oskTarget.value || '');
  });

  document.addEventListener('pointerdown', e => {
    if (!overlay.classList.contains('osk-visible')) return;
    const isKeyboardTap = overlay.contains(e.target);
    const isTextFieldTap = shouldUseOsk(e.target);
    if (!isKeyboardTap && !isTextFieldTap) hideOnScreenKeyboard();
  });
}
