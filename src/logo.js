/**
 * @file Logo handling and about panel
 */

import { $, resolveImageSource } from './ui.js';
import { LOGO_IMAGE_CANDIDATES, ABOUT_IMAGE_CANDIDATES, APP_NAME, APP_VERSION, APP_BUILD_DATE, APP_LICENSE, APP_AUTHOR } from './config.js';

export function applyLogo(src) {
  const mainLogo   = $('main-logo');
  const playerLogo = $('player-logo');
  const setAll = (url) => { [mainLogo, playerLogo].forEach(img => { img.src = url; img.style.display = 'block'; }); };
  const hideAll = () => { [mainLogo, playerLogo].forEach(img => { img.src = ''; img.style.display = 'none'; }); };
  hideAll();
  resolveImageSource(LOGO_IMAGE_CANDIDATES, src).then(url => { if (url) setAll(url); });
}

export function refreshAboutPanel() {
  const aboutName = $('about-name');
  const aboutVersion = $('about-version');
  const aboutBuildDate = $('about-build-date');
  const aboutLicense = $('about-license');
  const aboutAuthor = $('about-author');
  const aboutImage = $('about-image');
  const aboutFallback = $('about-image-fallback');

  if (aboutName) aboutName.textContent = APP_NAME;
  if (aboutVersion) aboutVersion.textContent = `v${APP_VERSION}`;
  if (aboutBuildDate) aboutBuildDate.textContent = APP_BUILD_DATE;
  if (aboutLicense) aboutLicense.textContent = APP_LICENSE;
  if (aboutAuthor) aboutAuthor.textContent = APP_AUTHOR;

  if (!aboutImage || !aboutFallback) return;
  aboutImage.classList.remove('visible');
  aboutImage.removeAttribute('src');
  aboutFallback.style.display = '';
  resolveImageSource(ABOUT_IMAGE_CANDIDATES, '').then(url => {
    if (!url) return;
    aboutImage.src = url;
    aboutImage.classList.add('visible');
    aboutFallback.style.display = 'none';
  });
}

export async function openAboutLink(target) {
  try {
    const resp = await fetch(`/api/open-${target}`, { method: 'POST' });
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => ({}));
    return !!data.ok;
  } catch (_) { return false; }
}
