/**
 * @file Main screen rendering and tile grid
 */

import { cfg, catalog, ui } from './state.js';
import { $, escHtml, formatDuration } from './ui.js';
import { t } from './i18n.js';
import { applyViewMode } from './theme.js';
import { queueMeta, bindThumbImage } from './catalog.js';
import { hudActivity, refocusPlayerSurface, syncPlayerToggleUI, updateVolUI } from './player.js';
import { showScreen } from './screen-router.js';

export function renderMainScreen() {
  const grid = $('tile-grid');
  applyViewMode(cfg.viewMode);
  const hadSelection = hasGridSelection();
  grid.innerHTML = '';
  ui.gridTiles = [];
  rovingReset();

  const visible = catalog.videos.filter(v => cfg.selectedIds.includes(v.id));

  if (visible.length === 0) {
    grid.innerHTML = `
      <div class="grid-message">
        <svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
        <h2>${escHtml(t('noVideos'))}</h2>
        <p>${escHtml(t('openAdminToConfigure'))}</p>
      </div>`;
    return;
  }

  visible.forEach((video, idx) => {
    const tile = document.createElement('div');
    tile.className = 'tile fade-up';
    tile.style.animationDelay = `${idx * 28}ms`;
    tile.tabIndex = idx === 0 ? 0 : -1;
    tile.dataset.idx = String(idx);
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', video.title);

    const displayTitle = (cfg.videoTitles?.[cfg.language]?.[video.id]) || video.title;
    tile.innerHTML = `
      <div class="tile-thumb">
        <div class="tile-loader"></div>
        <img alt="" />
        <div class="tile-play-overlay">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span class="tile-badge"></span>
      </div>
      <div class="tile-meta">
        <div class="tile-title">${escHtml(displayTitle)}</div>
        <div class="tile-dur"></div>
      </div>`;

    const activate = () => openVideo(video, idx);
    tile.addEventListener('click', activate);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
    tile.addEventListener('focus', () => rovingSync(idx));
    grid.appendChild(tile); ui.gridTiles.push(tile);

    const imgEl = tile.querySelector('img');
    const loader = tile.querySelector('.tile-loader');
    const badge = tile.querySelector('.tile-badge');
    const durEl = tile.querySelector('.tile-dur');

    queueMeta(video,
      url => bindThumbImage(imgEl, loader, url),
      secs => {
        const s = formatDuration(secs);
        if (s) { badge.textContent = s; badge.style.display = ''; durEl.textContent = s; }
      }
    );
  });

  initRovingFocus(grid);
  const restore = Math.min(ui.lastTileIdx, ui.gridTiles.length - 1);
  if (hadSelection && restore >= 0) {
    rovingGoto(restore, false);
  } else {
    clearGridSelection(restore >= 0 ? restore : 0);
    if (ui.activeScreen === 'main') grid.focus({ preventScroll: true });
  }
}

export function openVideo(record, tileIdx) {
  ui.lastTileIdx = tileIdx;
  ui.currentVideoId = record.id;
  const v = $('player-video');
  $('player-error').classList.remove('active');
  $('player-spinner').classList.add('active');
  $('player-hud').classList.remove('hud-faded');
  const vol = cfg.videoVolumes[record.id] ?? 1.0;
  v.volume = Math.max(0, Math.min(1, vol));
  updateVolUI(v.volume);
  v.src = record.src;
  showScreen('player');
  refocusPlayerSurface();
  syncPlayerToggleUI();
  v.play().catch(() => {
    $('player-spinner').classList.remove('active');
    hudActivity();
    syncPlayerToggleUI();
  });
}

function hasGridSelection() {
  return ui.gridTiles.some(tile => tile.classList.contains('kfocus'));
}

export function clearGridSelection(startIdx = 0) {
  const safeIdx = Math.max(0, Math.min(startIdx, ui.gridTiles.length - 1));
  ui.gridTiles.forEach((tile, idx) => {
    tile.tabIndex = idx === safeIdx ? 0 : -1;
    tile.classList.remove('kfocus');
  });
  ui.rovingIdx = safeIdx;
}

let _rovGrid = null, _rovHandler = null;

function rovingReset() {
  if (_rovGrid && _rovHandler) _rovGrid.removeEventListener('keydown', _rovHandler);
  _rovGrid = null; _rovHandler = null; ui.rovingIdx = 0;
}

function rovingSync(idx) {
  ui.gridTiles.forEach((t, i) => {
    t.tabIndex = (i === idx) ? 0 : -1;
    t.classList.toggle('kfocus', i === idx);
  });
  ui.rovingIdx = idx;
}

function rovingGoto(idx, scroll = true) {
  rovingSync(idx);
  if (scroll && ui.gridTiles[idx]) ui.gridTiles[idx].focus({ preventScroll: false });
}

function measureGridCols() {
  const tiles = ui.gridTiles;
  if (tiles.length < 2) return 1;
  const top0 = tiles[0].getBoundingClientRect().top;
  let cols = 1;
  for (let i = 1; i < tiles.length; i++) {
    if (Math.abs(tiles[i].getBoundingClientRect().top - top0) < 5) cols++;
    else break;
  }
  return Math.max(1, cols);
}

function initRovingFocus(grid) {
  _rovGrid = grid;
  _rovHandler = e => {
    const tiles = ui.gridTiles;
    if (!tiles.length) return;
    if (!hasGridSelection()) {
      const startIdx = Math.min(ui.rovingIdx, tiles.length - 1);
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
        e.preventDefault(); rovingGoto(startIdx); tiles[startIdx]?.click(); return;
      }
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault(); rovingGoto(startIdx); return;
      }
    }
    const cols = measureGridCols(); let next = ui.rovingIdx;
    if      (e.key === 'ArrowRight') next = Math.min(ui.rovingIdx + 1,    tiles.length - 1);
    else if (e.key === 'ArrowLeft')  next = Math.max(ui.rovingIdx - 1,    0);
    else if (e.key === 'ArrowDown')  next = Math.min(ui.rovingIdx + cols, tiles.length - 1);
    else if (e.key === 'ArrowUp')    next = Math.max(ui.rovingIdx - cols, 0);
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
      e.preventDefault(); tiles[ui.rovingIdx]?.click(); return;
    }
    else return;
    e.preventDefault(); if (next !== ui.rovingIdx) rovingGoto(next);
  };
  grid.addEventListener('keydown', _rovHandler);
}
