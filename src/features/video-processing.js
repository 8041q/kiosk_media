import { apiFetch } from '../core/api.js';
import { cfg, draft, remapMediaId, saveSettings } from '../core/state.js';
import { $, escHtml, formatBytes, formatDuration, showToast } from '../core/ui.js';
import { LANGUAGES, t } from '../core/i18n.js';
import { refreshCatalog } from './library.js';

let analysis = [];
let selected = new Set();
let filter = 'all';
let languageFilter = 'all';
let activeJobId = null;
let pollTimer = null;
let initialized = false;
let lastAnalyzedAt = null;
let renderedLogLines = [];

const POLL_INTERVAL_MS = 1000;
const ANALYSIS_STALE_MS = 30_000;
const PROCESSING_PROFILES = new Set(['recommended', 'high', 'smaller']);

function statusLabel(status) {
  if (status === 'ready') return t('filterProcessed');
  if (status === 'error') return t('statusError');
  if (status === 'optimize') return t('statusOptimize');
  if (status === 'transcode') return t('statusTranscode');
  return status;
}

function actionLabel(action) {
  return action === 'remux' ? t('actionRemux') : action === 'transcode' ? t('actionTranscode') : '-';
}

function isAttention(item) {
  return item.status === 'optimize' || item.status === 'transcode';
}


function populateLanguageFilter() {
  const select = $('vp-lang-filter'); if (!select) return;
  const current = select.value || 'all';
  const used = new Set(analysis.map(v => v.language));
  select.innerHTML = `<option value="all">${escHtml(t('filterAll'))}</option>` + LANGUAGES
    .filter(l => used.has(l.code))
    .map(l => `<option value="${l.code}">${escHtml(l.label)}</option>`)
    .join('');
  select.value = [...select.options].some(o => o.value === current) ? current : 'all';
  languageFilter = select.value;
}

function filteredAnalysis() {
  return analysis.filter(item => {
    if (languageFilter !== 'all' && item.language !== languageFilter) return false;
    if (filter === 'processed') return item.status === 'ready';
    if (filter === 'unprocessed') return item.status !== 'ready';
    return true;
  });
}

function currentProfile() {
  const checked = document.querySelector('input[name="processing-profile"]:checked');
  const value = checked?.value || draft.processingProfile || cfg.processingProfile || 'recommended';
  return PROCESSING_PROFILES.has(value) ? value : 'recommended';
}

function syncProfileUI() {
  const value = PROCESSING_PROFILES.has(draft.processingProfile)
    ? draft.processingProfile
    : (PROCESSING_PROFILES.has(cfg.processingProfile) ? cfg.processingProfile : 'recommended');
  document.querySelectorAll('input[name="processing-profile"]').forEach(input => {
    input.checked = input.value === value;
  });
  draft.processingProfile = value;
}

function updateProcessButton() {
  const btn = $('process-selected-btn'); if (!btn) return;
  const count = selected.size;
  btn.disabled = count === 0 || !!activeJobId;
  btn.textContent = count ? `${t('processSelected')} (${count})` : t('processSelected');
}

function renderList() {
  const grid = $('video-status-grid'); if (!grid) return;
  const rows = filteredAnalysis();
  if (!rows.length) {
    const emptyText = filter === 'unprocessed' ? t('noAttention') : t('noVideosFound');
    grid.innerHTML = `<div class="vp-empty">${escHtml(emptyText)}</div>`;
    updateProcessButton();
    return;
  }

  grid.innerHTML = rows.map(item => {
    const processable = isAttention(item);
    const included = processable && selected.has(item.src);
    const codec = [item.videoCodec || '-', item.audioCodec || '-'].join(' / ');
    const dimensions = item.width && item.height ? `${item.width}×${item.height}` : '-';
    const action = processable ? actionLabel(item.action) : '';
    let actionHtml = '';

    if (processable && !activeJobId) {
      actionHtml = `<div class="vp-action-stack">${action ? `<span class="vp-action-label">${escHtml(action)}</span>` : ''}<button type="button" class="vp-queue-btn${included ? ' included' : ''}" data-src="${escHtml(item.src)}">${escHtml(included ? t('willProcess') : t('skipped'))}</button></div>`;
    } else if (processable) {
      actionHtml = `<div class="vp-action-stack">${action ? `<span class="vp-action-label">${escHtml(action)}</span>` : ''}<span class="vp-row-state">${escHtml(t('processingProgress'))}</span></div>`;
    } else if (item.status === 'ready') {
      actionHtml = `<span class="vp-row-state processed">${escHtml(t('filterProcessed'))}</span>`;
    } else {
      actionHtml = `<span class="vp-row-state error">${escHtml(t('statusError'))}</span>`;
    }

    return `<article class="vp-row vp-${escHtml(item.status)}" data-src="${escHtml(item.src)}">
      <div class="vp-main-cell">
        <div class="vp-file-line"><strong title="${escHtml(item.src)}">${escHtml(item.name)}</strong><span class="vp-badge ${escHtml(item.status)}">${escHtml(statusLabel(item.status))}</span></div>
        <div class="vp-meta-line"><span>${escHtml(item.language?.toUpperCase() || '-')}</span><span>${escHtml(codec)}</span><span>${escHtml(dimensions)}</span><span>${escHtml(formatBytes(item.size))}</span><span>${escHtml(formatDuration(item.duration))}</span></div>
        <div class="vp-reason">${escHtml(item.reason || '')}</div>
      </div>
      <div class="vp-action-cell">${actionHtml}</div>
    </article>`;
  }).join('');

  updateProcessButton();
}

function setAnalyzing(isBusy) {
  const btn = $('analyze-btn');
  if (btn) {
    btn.disabled = isBusy || !!activeJobId;
    btn.textContent = isBusy ? t('analyzing') : t('analyzeLibrary');
  }
}

export async function analyzeLibrary({ refresh = true } = {}) {
  if (activeJobId) return;
  setAnalyzing(true);
  const grid = $('video-status-grid');
  if (grid) grid.innerHTML = `<div class="vp-empty">${escHtml(t('analyzing'))}</div>`;
  try {
    if (refresh) await refreshCatalog();
    const data = await apiFetch('/api/video-analysis', { method: 'POST', body: JSON.stringify({}) });
    analysis = Array.isArray(data?.videos) ? data.videos : [];
    selected = new Set(analysis.filter(isAttention).map(v => v.src));
    lastAnalyzedAt = new Date();
    populateLanguageFilter();
    renderList();
  } catch (err) {
    analysis = [];
    selected.clear();
    if (grid) grid.innerHTML = `<div class="vp-empty vp-error-text">${escHtml(err.message)}</div>`;
    updateProcessButton();
    showToast(err.message);
  } finally {
    setAnalyzing(false);
  }
}

function resetJobLog() {
  renderedLogLines = [];
  const output = $('log-output');
  if (output) output.textContent = '';
}

function appendJobLog(lines) {
  const output = $('log-output'); if (!output) return;
  const nextLines = Array.isArray(lines) ? lines.map(String) : [String(lines || '')].filter(Boolean);
  const canAppend = renderedLogLines.length <= nextLines.length &&
    (!renderedLogLines.length || renderedLogLines[renderedLogLines.length - 1] === nextLines[renderedLogLines.length - 1]);

  if (!canAppend) {
    output.textContent = nextLines.join('\n');
  } else if (nextLines.length > renderedLogLines.length) {
    const addition = nextLines.slice(renderedLogLines.length).join('\n');
    output.append(document.createTextNode(`${renderedLogLines.length ? '\n' : ''}${addition}`));
  }
  renderedLogLines = nextLines;
  output.scrollTop = output.scrollHeight;
}

function renderJob(job) {
  const panel = $('processing-panel'); if (!panel) return;
  panel.classList.remove('hidden');
  const state = job.state || 'running';
  const current = job.current || '';
  const pct = Math.max(0, Math.min(100, Number(job.overallPercent || 0)));
  $('vp-job-title').textContent = state === 'completed' ? t('processingComplete') : state === 'cancelled' ? t('processingCancelled') : state === 'failed' ? t('fixFailed') : `${t('processingProgress')} ${job.completed || 0} / ${job.total || 0}`;
  $('vp-job-file').textContent = current;
  $('vp-progress-bar').style.width = `${pct}%`;
  $('vp-progress-text').textContent = `${Math.round(pct)}%`;
  $('cancel-job-btn').disabled = !['queued', 'running'].includes(state);
  appendJobLog(job.log || []);
}

async function pollJob() {
  if (!activeJobId) return;
  try {
    const job = await apiFetch(`/api/video-jobs/${encodeURIComponent(activeJobId)}`);
    renderJob(job);
    if (['completed', 'cancelled', 'failed'].includes(job.state)) {
      clearTimeout(pollTimer); pollTimer = null; activeJobId = null;
      let settingsChanged = false;
      for (const result of (job.results || [])) {
        if (result?.outputSrc && result?.src && result.outputSrc !== result.src) settingsChanged = remapMediaId(result.src, result.outputSrc) || settingsChanged;
      }
      if (settingsChanged) { try { await saveSettings(); } catch (_) {} }
      updateProcessButton(); setAnalyzing(false);
      await analyzeLibrary({ refresh: true });
      return;
    }
  } catch (err) {
    clearTimeout(pollTimer); pollTimer = null; activeJobId = null;
    updateProcessButton();
    showToast(err.message);
    return;
  }
  pollTimer = setTimeout(pollJob, POLL_INTERVAL_MS);
}

async function resumeCurrentJob() {
  if (activeJobId) return true;
  try {
    const job = await apiFetch('/api/video-jobs/current');
    if (!job?.id || !['queued', 'running'].includes(job.state)) return false;
    activeJobId = job.id;
    selected.clear();
    resetJobLog();
    renderJob(job);
    renderList();
    pollJob();
    return true;
  } catch (_) {
    return false;
  }
}

async function processSelected() {
  if (!selected.size || activeJobId) return;
  const files = [...selected];
  try {
    const data = await apiFetch('/api/video-jobs', {
      method: 'POST',
      body: JSON.stringify({ profile: currentProfile(), files }),
    });
    activeJobId = data.jobId;
    selected.clear();
    renderList();
    resetJobLog();
    renderJob({ state: 'queued', total: files.length, completed: 0, overallPercent: 0, current: '', log: [] });
    pollJob();
  } catch (err) {
    showToast(err.message);
  }
}

async function cancelJob() {
  if (!activeJobId) return;
  try {
    await apiFetch(`/api/video-jobs/${encodeURIComponent(activeJobId)}/cancel`, { method: 'POST', body: '{}' });
  } catch (err) {
    showToast(err.message);
  }
}

export function initVideoProcessing() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('kiosk:admin-section', async e => {
    if (e.detail.section !== 'video-processing') return;
    syncProfileUI();
    if (await resumeCurrentJob()) return;
    const stale = !lastAnalyzedAt || Date.now() - lastAnalyzedAt.getTime() > ANALYSIS_STALE_MS;
    if (!activeJobId && stale) analyzeLibrary({ refresh: true });
    else {
      populateLanguageFilter();
      renderList();
    }
  });

  window.addEventListener('kiosk:languagechange', renderList);
  $('analyze-btn')?.addEventListener('click', () => analyzeLibrary({ refresh: true }));
  $('process-selected-btn')?.addEventListener('click', processSelected);
  $('cancel-job-btn')?.addEventListener('click', cancelJob);

  document.querySelectorAll('input[name="processing-profile"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked && PROCESSING_PROFILES.has(input.value)) draft.processingProfile = input.value;
    });
  });

  $('vp-lang-filter')?.addEventListener('change', e => {
    languageFilter = e.target.value;
    renderList();
  });

  $('video-status-grid')?.addEventListener('click', e => {
    const btn = e.target.closest?.('.vp-queue-btn');
    if (!btn || activeJobId) return;
    const src = btn.dataset.src;
    if (!src) return;
    if (selected.has(src)) selected.delete(src); else selected.add(src);
    renderList();
  });

  document.querySelectorAll('.vp-filter-btn').forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.vp-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderList();
  }));

  syncProfileUI();
}
