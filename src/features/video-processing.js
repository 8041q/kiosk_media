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

const profileHelpKeys = {
  recommended: 'profileRecommendedHelp',
  high: 'profileHighHelp',
  smaller: 'profileSmallerHelp',
};

function statusLabel(status) {
  return ({ ready: t('statusReady'), optimize: t('statusOptimize'), transcode: t('statusTranscode'), error: t('statusError') })[status] || status;
}

function actionLabel(action) {
  return action === 'remux' ? t('actionRemux') : action === 'transcode' ? t('actionTranscode') : '—';
}

function isAttention(item) { return item.status === 'optimize' || item.status === 'transcode'; }

function summary() {
  const counts = { total: analysis.length, ready: 0, optimize: 0, transcode: 0, error: 0 };
  analysis.forEach(item => { if (counts[item.status] != null) counts[item.status] += 1; });
  for (const [key, value] of Object.entries(counts)) {
    const el = $(`vp-summary-${key}`); if (el) el.textContent = String(value);
  }
  const attentionBtn = document.querySelector('.vp-filter-btn[data-filter="attention"]');
  if (attentionBtn) attentionBtn.querySelector('.vp-filter-count').textContent = String(counts.optimize + counts.transcode);
  const last = $('vp-last-analyzed');
  if (last) last.textContent = lastAnalyzedAt ? lastAnalyzedAt.toLocaleTimeString() : '—';
}

function populateLanguageFilter() {
  const select = $('vp-lang-filter'); if (!select) return;
  const current = select.value || 'all';
  const used = new Set(analysis.map(v => v.language));
  select.innerHTML = `<option value="all">${escHtml(t('filterAll'))}</option>` + LANGUAGES.filter(l => used.has(l.code)).map(l => `<option value="${l.code}">${escHtml(l.label)}</option>`).join('');
  select.value = [...select.options].some(o => o.value === current) ? current : 'all';
  languageFilter = select.value;
}

function filteredAnalysis() {
  return analysis.filter(item => {
    if (languageFilter !== 'all' && item.language !== languageFilter) return false;
    if (filter === 'attention') return isAttention(item);
    if (filter === 'ready') return item.status === 'ready';
    if (filter === 'error') return item.status === 'error';
    return true;
  });
}

function updateProcessButton() {
  const btn = $('process-selected-btn'); if (!btn) return;
  const count = selected.size;
  btn.disabled = count === 0 || !!activeJobId;
  btn.textContent = count ? `${t('processSelected')} (${count})` : t('processSelected');
  const allAttention = analysis.filter(isAttention);
  const check = $('vp-select-attention');
  if (check) {
    check.checked = allAttention.length > 0 && allAttention.every(v => selected.has(v.src));
    check.indeterminate = selected.size > 0 && !check.checked;
  }
}

function renderList() {
  const grid = $('video-status-grid'); if (!grid) return;
  const rows = filteredAnalysis();
  if (!rows.length) {
    grid.innerHTML = `<div class="vp-empty">${escHtml(filter === 'attention' ? t('noAttention') : t('noVideosFound'))}</div>`;
    updateProcessButton(); return;
  }
  grid.innerHTML = rows.map(item => {
    const disabled = !isAttention(item) || !!activeJobId;
    const checked = selected.has(item.src);
    const codec = [item.videoCodec || '—', item.audioCodec || '—'].join(' / ');
    const dimensions = item.width && item.height ? `${item.width}×${item.height}` : '—';
    return `<article class="vp-row vp-${escHtml(item.status)}" data-src="${escHtml(item.src)}">
      <label class="vp-select-cell"><input type="checkbox" class="vp-row-check" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="Select ${escHtml(item.name)}"></label>
      <div class="vp-main-cell">
        <div class="vp-file-line"><strong title="${escHtml(item.src)}">${escHtml(item.name)}</strong><span class="vp-badge ${escHtml(item.status)}">${escHtml(statusLabel(item.status))}</span></div>
        <div class="vp-meta-line"><span>${escHtml(item.language?.toUpperCase() || '—')}</span><span>${escHtml(codec)}</span><span>${escHtml(dimensions)}</span><span>${escHtml(formatBytes(item.size))}</span><span>${escHtml(formatDuration(item.duration))}</span></div>
        <div class="vp-reason">${escHtml(item.reason || '')}</div>
      </div>
      <div class="vp-action-cell"><span>${escHtml(isAttention(item) ? actionLabel(item.action) : '')}</span></div>
    </article>`;
  }).join('');
  grid.querySelectorAll('.vp-row-check').forEach(cb => cb.addEventListener('change', () => {
    const src = cb.closest('.vp-row').dataset.src;
    if (cb.checked) selected.add(src); else selected.delete(src);
    updateProcessButton();
  }));
  updateProcessButton();
}

function setAnalyzing(isBusy) {
  const btn = $('analyze-btn'); if (btn) { btn.disabled = isBusy || !!activeJobId; btn.textContent = isBusy ? t('analyzing') : t('analyzeLibrary'); }
  $('vp-analysis-spinner')?.classList.toggle('hidden', !isBusy);
}

export async function analyzeLibrary({ refresh = true } = {}) {
  if (activeJobId) return;
  setAnalyzing(true);
  const grid = $('video-status-grid'); if (grid) grid.innerHTML = `<div class="vp-empty">${escHtml(t('analyzing'))}</div>`;
  try {
    if (refresh) await refreshCatalog();
    const data = await apiFetch('/api/video-analysis', { method: 'POST', body: JSON.stringify({}) });
    analysis = Array.isArray(data?.videos) ? data.videos : [];
    selected = new Set([...selected].filter(src => analysis.some(v => v.src === src && isAttention(v))));
    lastAnalyzedAt = new Date();
    summary(); populateLanguageFilter(); renderList();
  } catch (err) {
    analysis = [];
    summary();
    if (grid) grid.innerHTML = `<div class="vp-empty vp-error-text">${escHtml(err.message)}</div>`;
    showToast(err.message);
  } finally { setAnalyzing(false); }
}

function updateProfileHelp() {
  const select = $('processing-profile'); if (!select) return;
  draft.processingProfile = select.value;
  const help = $('processing-profile-help'); if (help) help.textContent = t(profileHelpKeys[select.value] || profileHelpKeys.recommended);
}

function appendJobLog(lines) {
  const output = $('log-output'); if (!output) return;
  output.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
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
    clearTimeout(pollTimer); pollTimer = null; activeJobId = null; updateProcessButton(); showToast(err.message); return;
  }
  pollTimer = setTimeout(pollJob, 700);
}


async function resumeCurrentJob() {
  if (activeJobId) return true;
  try {
    const job = await apiFetch('/api/video-jobs/current');
    if (!job?.id || !['queued', 'running'].includes(job.state)) return false;
    activeJobId = job.id;
    selected.clear();
    renderJob(job);
    renderList();
    pollJob();
    return true;
  } catch (_) { return false; }
}

async function processSelected() {
  if (!selected.size || activeJobId) return;
  const files = [...selected];
  try {
    const data = await apiFetch('/api/video-jobs', { method: 'POST', body: JSON.stringify({ profile: $('processing-profile').value, files }) });
    activeJobId = data.jobId;
    selected.clear();
    renderList();
    renderJob({ state: 'queued', total: files.length, completed: 0, overallPercent: 0, current: '', log: [] });
    pollJob();
  } catch (err) { showToast(err.message); }
}

async function cancelJob() {
  if (!activeJobId) return;
  try { await apiFetch(`/api/video-jobs/${encodeURIComponent(activeJobId)}/cancel`, { method: 'POST', body: '{}' }); }
  catch (err) { showToast(err.message); }
}

export function initVideoProcessing() {
  if (initialized) return; initialized = true;
  window.addEventListener('kiosk:admin-section', async e => { if (e.detail.section === 'video-processing') { updateProfileHelp(); if (!(await resumeCurrentJob()) && !activeJobId) analyzeLibrary({ refresh: true }); } });
  window.addEventListener('kiosk:languagechange', () => { updateProfileHelp(); renderList(); });
  $('analyze-btn')?.addEventListener('click', () => analyzeLibrary({ refresh: true }));
  $('process-selected-btn')?.addEventListener('click', processSelected);
  $('cancel-job-btn')?.addEventListener('click', cancelJob);
  $('processing-profile')?.addEventListener('change', updateProfileHelp);
  $('vp-lang-filter')?.addEventListener('change', e => { languageFilter = e.target.value; renderList(); });
  $('vp-select-attention')?.addEventListener('change', e => {
    if (e.target.checked) analysis.filter(isAttention).forEach(v => selected.add(v.src)); else selected.clear();
    renderList();
  });
  document.querySelectorAll('.vp-filter-btn').forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.vp-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderList();
  }));
  $('processing-profile').value = draft.processingProfile || cfg.processingProfile || 'recommended';
  updateProfileHelp();
}
