// Deterministic per-device selection of one verse and one quote
// Contract:
// - Inputs: external-verses.json (array of {book, chapter, verse, version, rarity}), quotes.json (array of {text, author})
// - Output: render chosen verse and quote to DOM
// - Determinism per device: uses stable device key stored in localStorage (generated one-time from userAgent + platform + language + screen metrics)
// - Fallback: if quotes.json missing, use a small placeholder set

const STATE_KEYS = {
  deviceKey: 'rs_device_key_v2',
  bindCode: 'rs_bind_code_v1', // manual override for cross-browser consistency
};

// Optional data version from URL (e.g., view.html?v=20250828) to force-refresh JSON after updates
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

function renderVerse(v) {
  const verseText = document.getElementById('verseText');
  const verseRef = document.getElementById('verseRef');
  if (!v) {
    verseText.textContent = '（未找到經文）';
    verseRef.textContent = '';
    return;
  }
  verseText.textContent = v.verse || '';
  const ref = [v.book, v.chapter].filter(Boolean).join(' ');
  // 僅顯示書卷與章節，不顯示版本名稱
  verseRef.textContent = ref;
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

async function main() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const cards = document.getElementById('cards');

  try {
  const deviceKey = getOrCreateDeviceKey();

  // expose current key on UI if present
  const keyEl = document.getElementById('currentKey');
  if (keyEl) keyEl.textContent = deviceKey;

    // fetch data
    const [verses, quotesMaybe] = await Promise.all([
      fetchJSON('./external-verses.json'),
      fetchJSON('./quotes.json').catch(() => null),
    ]);

    // Prepare quotes and filter out anonymous/missing author entries defensively
    const primaryQuotes = Array.isArray(quotesMaybe) && quotesMaybe.length
      ? quotesMaybe
      : [
          { text: '行動是治療恐懼的良藥。', author: '安娜依絲·寧' },
          { text: '真正的勇氣不是沒有恐懼，而是戰勝恐懼。', author: '納爾遜·曼德拉' },
          { text: '把簡單做到極致，就是不簡單。', author: '達芬奇' },
        ];
    const quotesFiltered = primaryQuotes.filter(q => {
      if (!q || !q.author || !q.text) return false;
      const a = String(q.author).trim();
      return a && !/(佚名|匿名|unknown|無名)/i.test(a);
    });
    // De-duplicate by normalized text+author
    const seen = new Set();
    const quotesDedup = [];
    for (const q of quotesFiltered) {
      const key = (String(q.text).trim().toLowerCase() + '|' + String(q.author).trim().toLowerCase());
      if (seen.has(key)) continue;
      seen.add(key);
      quotesDedup.push(q);
    }
    const quotes = quotesDedup.length ? quotesDedup : primaryQuotes;

    // Deterministic picks using device key
    const versePool = buildWeightedArray(verses, (v) => rarityWeight(v.rarity));
    const verseIdx = versePool.length
      ? versePool[pickDeterministicIndex(versePool.length, deviceKey, 'verse')]
      : 0;
    const quoteIdx = pickDeterministicIndex(quotes.length, deviceKey, 'quote');

    renderVerse(verses[verseIdx]);
    renderQuote(quotes[quoteIdx]);

    loading.classList.add('hidden');
    error.classList.add('hidden');
    cards.classList.remove('hidden');
  } catch (e) {
    console.error('Init failed:', e);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
  }
}

main();

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
