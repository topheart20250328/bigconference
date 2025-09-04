// Deterministic per-device selection of one curated verse–quote PAIR
// Contract:
// - Input: merged_verses_quotes.txt (4-line blocks: ref, verse, author, quote) — sole data source
// - Output: render chosen pair to DOM
// - Determinism per device: uses stable device key stored in localStorage (generated one-time from userAgent + platform + language + screen metrics)

const STATE_KEYS = {
  deviceKey: 'rs_device_key_v2',
  bindCode: 'rs_bind_code_v1', // manual override for cross-browser consistency
};

// Optional data version from URL (e.g., view.html?v=20250828) to force-refresh assets after updates
const DATA_VERSION = (() => {
  try {
    const p = new URLSearchParams(location.search);
    return p.get('v') || '';
  } catch { return ''; }
})();

function stableHash32(str) {
  // MurmurHash3-ish simple 32-bit hash (not cryptographically secure).
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // final avalanche
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return (h >>> 0);
}

function getURLBindCode() {
  try {
    const p = new URLSearchParams(location.search);
    return p.get('code') || p.get('bind') || null;
  } catch { return null; }
}

function canvasFingerprint() {
  try {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 60;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0,0,240,60);
    ctx.fillStyle = '#069';
    ctx.fillText('rs-fp-😊-測試123', 2, 2);
    ctx.strokeStyle = '#ff0';
    ctx.arc(120,30,20,0,Math.PI*2);
    ctx.stroke();
    const data = c.toDataURL();
    return stableHash32(data).toString(16);
  } catch { return 'cfp0'; }
}

function webglFingerprint() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return 'w0';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const sh = [gl.getParameter(gl.SHADING_LANGUAGE_VERSION), gl.getParameter(gl.VERSION)].join('|');
    return stableHash32([vendor, renderer, sh].join('|')).toString(16);
  } catch { return 'w0'; }
}

function computeFingerprint() {
  const d = new Date();
  const tz = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const nav = navigator;
  const parts = [
    nav.userAgent || '',
    nav.platform || '',
    (nav.language || '') + '|' + (Array.isArray(nav.languages) ? nav.languages.join(',') : ''),
    'dm:' + (nav.deviceMemory || 'x'),
    'hc:' + (nav.hardwareConcurrency || 'x'),
    'mt:' + (nav.maxTouchPoints || '0'),
    'pr:' + (window.devicePixelRatio || 1),
    'sw:' + screen.width + 'x' + screen.height,
    'sa:' + screen.availWidth + 'x' + screen.availHeight,
    'cd:' + screen.colorDepth,
    'tzoff:' + d.getTimezoneOffset(),
    'tz:' + tz,
    'cfp:' + canvasFingerprint(),
    'wfp:' + webglFingerprint(),
  ];
  try {
    const plug = (nav.plugins ? Array.from(nav.plugins).map(p => p.name + ':' + p.filename).join(',') : '');
    parts.push('pl:' + plug);
  } catch {}
  return stableHash32(parts.join('|')).toString(16).padStart(8, '0');
}

function getOrCreateDeviceKey() {
  // URL override/bind
  const urlCode = getURLBindCode();
  if (urlCode) {
    localStorage.setItem(STATE_KEYS.bindCode, urlCode);
  }
  const bound = localStorage.getItem(STATE_KEYS.bindCode);
  if (bound) {
    // Use manual bind code as the cross-browser key
    return bound;
  }
  const existing = localStorage.getItem(STATE_KEYS.deviceKey);
  if (existing) return existing;
  // Stronger cross-browser fingerprint
  const key = computeFingerprint();
  localStorage.setItem(STATE_KEYS.deviceKey, key);
  return key;
}

function pickDeterministicIndex(max, seedStr, salt) {
  const h = stableHash32(seedStr + '|' + salt);
  return h % Math.max(1, max);
}

async function fetchJSON(path) {
  const url = DATA_VERSION ? `${path}?v=${encodeURIComponent(DATA_VERSION)}` : path;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function fetchText(path) {
  // Build absolute URL and add version param robustly
  const u = new URL(path, location.href);
  if (DATA_VERSION) u.searchParams.set('v', DATA_VERSION);
  const url = u.toString();
  try { window.__RS_LAST_FETCH_URL = url; } catch {}
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function parseMergedPairs(txt) {
  // Expect blocks of 4 non-empty lines: ref, verse, author, quote; ignore blank lines and header line
  const rawLines = txt.split(/\r?\n/);
  const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length && /^BIG/.test(lines[0])) lines.shift();
  const out = [];
  for (let i = 0; i + 3 < lines.length; ) {
    const ref = lines[i++];
    const verse = lines[i++];
    const author = lines[i++];
    const qline = lines[i++];
    const quote = qline.replace(/^「/, '').replace(/」$/, '');
    out.push({ ref, verse, author, quote });
  }
  return out;
}

function renderVerse(v) {
  const verseText = document.getElementById('verseText');
  const verseRef = document.getElementById('verseRef');
  if (!v) {
    verseText.textContent = '（未找到經文）';
    verseRef.textContent = '';
    return;
  }
  // support old shape { verse, book/chapter } and new shape { text, ref }
  verseText.textContent = v.text || v.verse || '';
  verseRef.textContent = v.ref || [v.book, v.chapter].filter(Boolean).join(' ');
}

function renderQuote(q) {
  const quoteText = document.getElementById('quoteText');
  const quoteRef = document.getElementById('quoteRef');
  if (!q) {
    quoteText.textContent = '（未找到語錄）';
    quoteRef.textContent = '';
    return;
  }
  quoteText.textContent = q.text || '';
  quoteRef.textContent = q.author ? `— ${q.author}` : '';
}

function rarityWeight(r) {
  switch ((r || 'common').toLowerCase()) {
    case 'legendary': return 1;
    case 'rare': return 2;
    case 'medium': return 4;
    case 'common':
    default: return 8;
  }
}

function buildWeightedArray(items, getWeight) {
  const out = [];
  items.forEach((it, idx) => {
    const w = Math.max(1, getWeight(it, idx));
    for (let i = 0; i < w; i++) out.push(idx);
  });
  return out;
}

const LS_RESET = 'rs_global_last_reset_v1';

async function getSupabase() {
  try {
    const m = await import('./supabase-client.js');
    return m.getSupabase ? await m.getSupabase() : null;
  } catch { return null; }
}

async function checkGlobalReset() {
  try {
    const supa = await getSupabase();
    if (!supa) return;
    const { data, error } = await supa.from('config').select('value, updated_at').eq('key','quiz_reset_at').single();
    if (error || !data) return;
    const remoteTs = Date.parse(data.value || data.updated_at || '') || 0;
    const localTs = Number(localStorage.getItem(LS_RESET) || '0');
    if (remoteTs > localTs) {
      // Clear local device bindings for verse/quote and update marker
      localStorage.removeItem(STATE_KEYS.deviceKey);
      localStorage.removeItem(STATE_KEYS.bindCode);
      localStorage.setItem(LS_RESET, String(remoteTs));
    }
  } catch {}
}

async function main() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const cards = document.getElementById('cards');
  const debug = /(?:[?&])debug=1(?:&|$)/.test(location.search);

  try {
    // Check remote reset flag (may clear local device/bind so do this before obtaining key)
    await checkGlobalReset();
    const deviceKey = getOrCreateDeviceKey();
    const resetSalt = String(localStorage.getItem(LS_RESET) || '');

    // expose current key on UI if present
    const keyEl = document.getElementById('currentKey');
    if (keyEl) keyEl.textContent = deviceKey;

    // fetch curated pairs from merged text and parse
  const txt = await fetchText('merged_verses_quotes.txt');
    const pairs = parseMergedPairs(txt);
    if (!pairs.length) throw new Error('No curated pairs parsed');

    // Deterministic pick using device key (single index into curated list)
    const seedBase = `${deviceKey}|${resetSalt}`;
    const pairIdx = pickDeterministicIndex(pairs.length, seedBase, 'pair');
    const p = pairs[pairIdx];

  renderVerse({ text: p.verse, ref: p.ref });
  renderQuote({ text: p.quote, author: p.author });

    loading.classList.add('hidden');
    error.classList.add('hidden');
    cards.classList.remove('hidden');

  // After render, auto-fit texts to prevent page scroll where possible
  try { autoFitCards(); } catch {}
  } catch (e) {
    console.error('Init failed:', e);
    loading.classList.add('hidden');
    if (error) {
      if (debug) {
        const extra = (window.__RS_LAST_FETCH_URL ? ('\nURL: ' + window.__RS_LAST_FETCH_URL) : '');
        error.textContent = '載入失敗：' + (e && e.message ? e.message : String(e)) + extra;
      }
      error.classList.remove('hidden');
    }
  }
}

// Start after first paint to ensure the intro can animate smoothly
function scheduleMain(){
  const kick = () => requestAnimationFrame(() => setTimeout(main, 0));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kick, { once:true });
  } else {
    kick();
  }
}
scheduleMain();

// Auto-fit helpers to keep both cards visible without page scroll on phones
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function fitCard(card){
  if (!card) return;
  const textEl = card.querySelector('.content');
  const refEl = card.querySelector('.ref');
  if (!textEl) return;
  // Start from current computed size, shrink or grow toward bounds to fill space
  const cs = getComputedStyle(textEl);
  let base = parseFloat(cs.fontSize) || 21;
  let refBase = parseFloat(getComputedStyle(refEl||textEl).fontSize) || 13;
  const minBase = 16, maxBase = 24; // tighter bounds for compactness
  const minRef = 11, maxRef = 15;
  let tries = 24;
  const total = () => card.clientHeight;
  const used = () => (textEl.scrollHeight + (refEl ? refEl.scrollHeight : 0));
  // First, shrink if overflowing
  while (tries-- > 0 && used() > total()) {
    base = clamp(base - 1, minBase, maxBase);
    refBase = clamp(refBase - 1, minRef, maxRef);
    textEl.style.fontSize = base + 'px';
    if (refEl) refEl.style.fontSize = refBase + 'px';
  }
  // Then, gently grow if there is ample free space
  let growTries = 10;
  while (growTries-- > 0 && used() < total() * 0.88) {
    const nextBase = clamp(base + 1, minBase, maxBase);
    const nextRef = clamp(refBase + 1, minRef, maxRef);
    if (nextBase === base && nextRef === refBase) break;
    base = nextBase; refBase = nextRef;
    textEl.style.fontSize = base + 'px';
    if (refEl) refEl.style.fontSize = refBase + 'px';
  }
}
function autoFitCards(){
  const cards = document.querySelectorAll('#cards .card');
  cards.forEach(fitCard);
}
addEventListener('resize', ()=>{ try { autoFitCards(); } catch {} }, { passive:true });

// Simple handlers for bind code UI
window.__rs_setBindCode = function() {
  const current = localStorage.getItem(STATE_KEYS.bindCode) || '';
  const v = prompt('請輸入一致性代碼（留空可清除）', current);
  if (v === null) return; // cancelled
  const trimmed = (v || '').trim();
  if (trimmed) {
    localStorage.setItem(STATE_KEYS.bindCode, trimmed);
    alert('已設定一致性代碼，將重新載入套用。');
  } else {
    localStorage.removeItem(STATE_KEYS.bindCode);
    alert('已清除一致性代碼，將重新載入套用。');
  }
  location.reload();
}
window.__rs_copyKey = function() {
  const text = document.getElementById('currentKey')?.textContent || '';
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => alert('已複製：' + text)).catch(() => {});
}
