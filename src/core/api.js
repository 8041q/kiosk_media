let sessionToken = null;
let sessionPromise = null;

async function getSessionToken(force = false) {
  if (force) sessionToken = null;
  if (sessionToken) return sessionToken;
  if (!sessionPromise) {
    sessionPromise = fetch('/api/session', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error(`Session request failed (${res.status})`);
        const data = await res.json();
        if (!data.token) throw new Error('Session token missing');
        sessionToken = data.token;
        return sessionToken;
      })
      .finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

async function perform(path, options, retrySession) {
  const opts = { cache: 'no-store', ...options };
  const method = String(opts.method || 'GET').toUpperCase();
  const headers = new Headers(opts.headers || {});
  if (opts.body != null && !(opts.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-Kiosk-Token', await getSessionToken(retrySession));
  opts.headers = headers;
  const res = await fetch(path, opts);
  if (res.status === 403 && !retrySession && !['GET', 'HEAD', 'OPTIONS'].includes(method)) return perform(path, options, true);
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; } }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

export function apiFetch(path, options = {}) { return perform(path, options, false); }
export function resetApiSession() { sessionToken = null; sessionPromise = null; }
