// Quiz logic per requirements
// - Three stages: 大格局 / 大突破 / 大夢想 (10 Q each)
// - 100 base points per question
// - Speed bonus: start at 100 then linearly down to 0 across 5 seconds (A: ~100 at 5s left, 80 @4s, etc., more granular)
// - Stage perfect bonus: +500 per stage
// - Player name (Chinese only), bind to device, one play per device; after completion, always show result.
// - Right-bottom logo handled by HTML; intro overlay handled on page.

const LS = {
  playerName: 'rs_player_name_v1',
  deviceKey: 'rs_device_key_v2',
  completed: 'rs_quiz_completed_v1',
  result: 'rs_quiz_result_v1',
};

function stableHash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return h >>> 0;
}

function getOrCreateDeviceKey() {
  try {
    const existing = localStorage.getItem(LS.deviceKey);
    if (existing) return existing;
    const nav = navigator;
    const key = stableHash32([
      nav.userAgent||'', nav.platform||'', nav.language||'',
      screen.width+'x'+screen.height, Date.now().toString(36)
    ].join('|')).toString(16);
    localStorage.setItem(LS.deviceKey, key);
    return key;
  } catch { return 'dev'; }
}

const deviceKey = getOrCreateDeviceKey();

// Data: questions (updated)
const STAGES = [
  { name: '大格局', items: [
    { q: '一個能帶下格局的人，通常會怎樣？', A: '成為讓人害怕的人', B: '成為讓人疏遠的人', C: '成為讓人信任的人', ans: 'C' },
    { q: '一個人是否有格局，最容易從哪裡被看見？', A: '他如何面對批評', B: '他很低調安靜', C: '他有多少朋友', ans: 'A' },
    { q: '大格局的人看待「小事」的態度是？', A: '小事無所謂，就盡力而為', B: '小事若忠心，大事才可靠', C: '只在意大事，不拘小節', ans: 'B' },
    { q: '為什麼「感恩」能成為大格局的起點？', A: '因為感恩讓人不再比較', B: '因為感恩能讓人活得輕鬆', C: '因為感恩讓人少生氣', ans: 'A' },
    { q: '一個真正有格局的人，會如何使用「自由」？', A: '為自己爭取更多方便', B: '用來成全與祝福他人', C: '用來避免付出', ans: 'B' },
    { q: '「格局點燃法則」包含哪些元素？', A: 'Vision、Mission、Passion、Action', B: 'Money、Power、Status、Fame', C: 'Dream、Luck、Talent、Chance', ans: 'A' },
    { q: '領袖最大的價值不是自己發光，而是什麼？', A: '幫助別人成功', B: '幫助別人反省', C: '讓團隊變成工具', ans: 'A' },
    { q: '影響力的最高境界「被人愛戴」，代表領袖具備什麼？', A: '令人追隨的品格與犧牲', B: '令人敬畏的權力', C: '令人忌妒的成就', ans: 'A' },
    { q: '領袖若只追求「效率」卻忽略「關係」，最終會如何？', A: '團隊可能越來越疏離', B: '團隊會變得更有效率', C: '團隊會自動變得更親密', ans: 'A' },
    { q: '從「成功」邁向「卓越」的關鍵轉折是？', A: '放下責任專注自己', B: '讓團隊和別人一起更好', C: '努力的實現自我成就', ans: 'B' },
  ]},
  { name: '大突破', items: [
    { q: '真正的卓越員工，會讓老闆怎麼看待他？', A: '「公司即使沒有你，也能一樣運轉」', B: '「公司隨時可以用別人取代你」', C: '「公司不能沒有你，因為你帶來關鍵價值」', ans: 'C' },
    { q: '當一個人陷入「忙碌主義」時，他最可能的結果是什麼？', A: '工作雖然多，但成就感大幅提升', B: '忙碌能讓他不需要再面對生命問題', C: '表面看起來很努力，但其實無法真正突破', ans: 'C' },
    { q: '對於有大突破眼光的領袖而言，危機通常代表什麼？', A: '讓人無能為力的絕境', B: '對團隊而言只是增加壓力', C: '一個突破與成長的契機', ans: 'C' },
    { q: '為什麼「幫助他人成功」是一種突破？', A: '因為這樣別人會欠你一個人情', B: '因為這會帶來更深的人際信任與愛戴', C: '因為你會因此獲得更多讚賞', ans: 'B' },
    { q: '以下哪一項最不可能帶來真正的突破？', A: '願意冒險並行動', B: '抱怨環境', C: '勇敢面對挑戰', ans: 'B' },
    { q: '大突破的第一步通常不是改變環境，而是？', A: '改變自己的思維與態度', B: '改變別人的看法', C: '改變工作的目標', ans: 'A' },
    { q: '一個有突破的人，遇見「看似不可能」的挑戰時，最可能的選擇是？', A: '禱告並尋找解方', B: '停下來等待環境改變', C: '妥協是一種自我保護', ans: 'A' },
    { q: '一個突破的契機，常常隱藏在哪裡？', A: '在最艱難的問題中', B: '在最輕鬆的娛樂裡', C: '在別人給的獎賞中', ans: 'A' },
    { q: '為什麼危機常常成為神給的「突破考場」？', A: '危機能暴露我們真實的信心狀態', B: '危機只是偶然發生的意外', C: '危機能讓我們少於承擔責任', ans: 'A' },
    { q: '在職場中，哪一個聖經人物展現了突破的生命典範？', A: '該隱──用嫉妒成就自己', B: '約瑟──在惡劣環境仍然忠心到底', C: '亞哈──用權力壓制他人', ans: 'B' },
  ]},
  { name: '大夢想', items: [
    { q: '大夢想的人格條件組合中，哪一項是聖經強調的？', A: '錢財、地位、權力、名聲、享樂', B: '雄心、信心、愛心、耐心、恆心', C: '驕傲、嫉妒、懶惰、抱怨、脾氣', ans: 'B' },
    { q: '真正的異象與野心最大的差別是什麼？', A: '異象需要更多錢，野心只要努力', B: '異象是從神而來，野心只是滿足自我慾望', C: '異象會讓人受歡迎，野心會讓人孤立', ans: 'B' },
    { q: '建造夢想團隊時，找「對的人」最重要的條件是？', A: '精明會計算', B: '忠誠、委身、能受教', C: '討好領袖、顧好自己', ans: 'B' },
    { q: '領袖若缺乏夢想，會帶來什麼後果？', A: '團隊可能失去方向', B: '團隊會沒有安全感', C: '團隊會變得更輕鬆', ans: 'A' },
    { q: '真正的大夢想，最終目的應該是什麼？', A: '榮耀神並祝福他人', B: '成為受矚目的人', C: '擁有最多的資源', ans: 'A' },
    { q: '夢想的價值若只是「讓自己變好」，問題在哪裡？', A: '容易讓人失去堅持', B: '容易讓人更快成功', C: '容易讓人獲得幫助', ans: 'A' },
    { q: '領袖面對團隊的失敗時，最能展現夢想的態度是？', A: '帶領大家重新站起來', B: '讓大家找問題改進', C: '開會檢討找人負責', ans: 'A' },
    { q: '大夢想與小夢想的差別是什麼？', A: '小夢想只為自己，大夢想包含別人', B: '小夢想比較實際，大夢想比較硬氣', C: '小夢想需要勇氣，大夢想需要運氣', ans: 'A' },
    { q: '面對未來的不確定，哪一種心態能成為大夢想的根基？', A: '每天認真做一件事', B: '信靠神的供應與帶領', C: '等待環境有機會就行動', ans: 'B' },
    { q: '在職場與事奉中，真正的「倫理」高峰是什麼？', A: '幫助他人成功，成全更多人', B: '成為眾人中最有名的人', C: '盡量累積自己的成就', ans: 'A' },
  ]},
];

// Helper: Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Runtime state for shuffled stages and per-question options
let RUN_STAGES = null; // [{ name, items: [...] }], items order shuffled per stage
let currentOptions = []; // options for current question after shuffling answers

const els = {
  nameCard: document.getElementById('nameCard'),
  playerName: document.getElementById('playerName'),
  startBtn: document.getElementById('startBtn'),
  quizCard: document.getElementById('quizCard'),
  stageName: document.getElementById('stageName'),
  question: document.getElementById('question'),
  optA: document.getElementById('optA'),
  optB: document.getElementById('optB'),
  optC: document.getElementById('optC'),
  meter: document.getElementById('meter'),
  resultCard: document.getElementById('resultCard'),
  score: document.getElementById('score'),
  resultName: document.getElementById('resultName'),
  resultTitle: document.getElementById('resultTitle'),
  passBadge: document.getElementById('passBadge'),
  failBadge: document.getElementById('failBadge'),
  detailBody: document.getElementById('detailBody'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  goHomeBtn: document.getElementById('goHomeBtn'),
  fxCanvas: document.getElementById('fxCanvas'),
  fxFail: document.getElementById('fxFail'),
  // leaderboard containers
  lbBodyStart: document.getElementById('lbBodyStart'),
  lbBodyResult: document.getElementById('lbBodyResult'),
  lbRefreshA: document.getElementById('lbRefreshA'),
  lbRefreshB: document.getElementById('lbRefreshB'),
};

// Validation: Chinese-only (CJK)
function isChineseName(s) {
  if (!s) return false;
  const t = s.trim();
  if (!t) return false;
  // Allow CJK Unified Ideographs and middle dot; 2-12 chars
  return /^[\u4E00-\u9FFF·]{2,12}$/.test(t);
}

const LS_RESET = 'rs_quiz_last_reset_v1';
function currentSalt() { return String(localStorage.getItem(LS_RESET) || ''); }

// Deferred init to allow global reset check first
async function initSavedState() {
  await checkGlobalReset();
  // 允許重複遊玩：不自動顯示結果，於名稱存在時僅鎖定名稱輸入
}

els.startBtn.addEventListener('click', () => {
  let name = String(els.playerName.value || '').trim();
  const stored = localStorage.getItem(LS.playerName) || '';
  if (stored) {
    name = stored; // 名稱鎖定
  } else {
    if (!isChineseName(name)) {
      alert('請輸入中文全名（2-12字）');
      return;
    }
    localStorage.setItem(LS.playerName, name);
    try { els.playerName.value = name; els.playerName.readOnly = true; els.playerName.disabled = true; } catch {}
  }
  startQuiz(name);
});

// Speed bonus meter
const QUESTION_TIME = 10000; // 10s window for bonus
let timerStart = 0;
let rafId = 0;
function startMeter() {
  timerStart = performance.now();
  cancelAnimationFrame(rafId);
  const tick = () => {
    const t = performance.now() - timerStart;
    const left = Math.max(0, QUESTION_TIME - t);
    const ratio = left / QUESTION_TIME; // 1 -> 0
  els.meter.style.transform = `scaleX(${ratio.toFixed(3)})`;
  // color shift: 120 (green) -> 0 (red)
  const hue = Math.max(0, Math.min(120, Math.round(120 * ratio)));
  els.meter.style.background = `hsl(${hue} 70% 45%)`;
    if (left > 0) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
function stopMeter() { cancelAnimationFrame(rafId); }

// Compute bonus more granular than 20-step: linear 0..100 mapped to nearest 20 step display concept
function computeBonus(msLeft) {
  const pct = Math.max(0, Math.min(1, msLeft / QUESTION_TIME));
  // Smooth curve can be linear; reward = round to nearest 1 pt
  return Math.round(pct * 100);
}

// Quiz flow state
let currentStage = 0;
let currentIndex = 0;
let stageCorrect = 0;
let totalScore = 0;
let qCounter = 0;
const details = []; // per-question and bonus entries
const PASS_SCORE = 5500;

function resetQuizState(){
  currentStage = 0;
  currentIndex = 0;
  stageCorrect = 0;
  totalScore = 0;
  qCounter = 0;
  details.length = 0;
  // Build shuffled stages: keep stage order fixed, but shuffle questions within each stage
  RUN_STAGES = STAGES.map(s => ({ name: s.name, items: shuffleArray(s.items) }));
}

function startQuiz(name) {
  resetQuizState();
  els.nameCard.style.display = 'none';
  els.quizCard.style.display = '';
  nextQuestion();
}

function nextQuestion() {
  const stage = RUN_STAGES[currentStage];
  const item = stage.items[currentIndex];
  // Theme per stage (1..3)
  const body = document.body;
  body.classList.remove('theme-1','theme-2','theme-3');
  body.classList.add(`theme-${currentStage+1}`);
  els.stageName.textContent = stage.name;
  els.question.textContent = `${currentIndex+1}. ${item.q}`;

  // Build and shuffle options per question
  const options = [
    { key: 'A', text: item.A },
    { key: 'B', text: item.B },
    { key: 'C', text: item.C },
  ];
  currentOptions = shuffleArray(options);
  // Render shuffled options with fixed A/B/C labels
  els.optA.textContent = `A. ${currentOptions[0].text}`;
  els.optB.textContent = `B. ${currentOptions[1].text}`;
  els.optC.textContent = `C. ${currentOptions[2].text}`;

  els.optA.onclick = (e) => { clickPop(e); answer('A'); };
  els.optB.onclick = (e) => { clickPop(e); answer('B'); };
  els.optC.onclick = (e) => { clickPop(e); answer('C'); };

  startMeter();
}

function answer(choice) {
  const msLeft = Math.max(0, QUESTION_TIME - (performance.now() - timerStart));
  stopMeter();
  const stage = RUN_STAGES[currentStage];
  const item = stage.items[currentIndex];
  let gained = 0;
  // Determine whether the chosen displayed option corresponds to the correct original answer
  const picked = (choice === 'A') ? currentOptions[0] : (choice === 'B') ? currentOptions[1] : currentOptions[2];
  const isCorrect = picked.key === item.ans;
  if (isCorrect) {
    const bonus = computeBonus(msLeft); // 0..100
    gained = 100 + bonus;
    stageCorrect += 1;
    details.push({ type:'q', no: (++qCounter), stage: stage.name, status: '✔ 正確', gained, bonus, msLeft });
  } else {
    gained = 0; // no base for wrong? Requirements: base 100 per Q only if correct? The prompt implies base for each question; we assume only correct gets base.
    details.push({ type:'q', no: (++qCounter), stage: stage.name, status: '✘ 錯誤', gained, bonus: 0, msLeft });
  }
  totalScore += gained;

  // Next
  currentIndex += 1;
  if (currentIndex >= 10) {
    // Stage end bonus if perfect
    if (stageCorrect === 10) {
      totalScore += 500;
  details.push({ type:'bonus', stage: RUN_STAGES[currentStage].name, text: `${RUN_STAGES[currentStage].name} 全對加成 +500` });
    }
    // Reset for next stage
    currentStage += 1;
    currentIndex = 0;
    stageCorrect = 0;
    if (currentStage >= STAGES.length) {
      return finish();
    }
  }
  nextQuestion();
}

function finish() {
  els.quizCard.style.display = 'none';
  const name = localStorage.getItem(LS.playerName) || '';
  showResult(name, totalScore);
  // Persist completion
  // 在結果中加入目前 salt，讓重置後不會讀到舊結果
  localStorage.setItem(LS.completed, deviceKey);
  localStorage.setItem(LS.result, JSON.stringify({ name, score: totalScore, t: Date.now(), deviceKey, salt: currentSalt() }));
  // Submit to leaderboard if configured
  submitScore(name, totalScore);
}

function showResult(name, sc) {
  els.resultCard.style.display = '';
  els.score.textContent = String(sc);
  els.resultName.textContent = name || '';
  // Hide start/quiz if present
  els.nameCard.style.display = 'none';
  els.quizCard.style.display = 'none';
  // Pass/Fail badges
  const passed = sc >= PASS_SCORE;
  if (els.passBadge && els.failBadge) {
    els.passBadge.style.display = passed ? '' : 'none';
    els.failBadge.style.display = passed ? 'none' : '';
  }
  if (els.resultTitle) {
    els.resultTitle.textContent = passed ? '太猛了！滿滿高分～' : '差一點點！再試一次';
  }
  // Details table
  if (els.detailBody) {
    const rows = [];
    for (const d of details) {
      if (d.type === 'q') {
        const secLeft = (d.msLeft/1000).toFixed(1);
        rows.push(`<tr><td>${d.no}</td><td style="color:${d.status.includes('✔')?'#16a34a':'#ef4444'}">${d.status}</td><td>${d.gained}</td><td>剩餘 ${secLeft}s</td></tr>`);
      } else if (d.type === 'bonus') {
        rows.push(`<tr><td colspan="4" style="color:#ff4fa3;font-weight:700">${d.text}</td></tr>`);
      }
    }
    els.detailBody.innerHTML = rows.join('');
  }
  // FX strengthened
  if (passed) {
    triggerFX(true);
    if (els.resultCard) { els.resultCard.classList.remove('sad'); els.resultCard.classList.add('celebrate'); setTimeout(()=>els.resultCard.classList.remove('celebrate'), 1000); }
    floatingEmojis(['🎉','🍬','🍭','🎈','🌟'], 26, 3200);
  } else {
    triggerFX(false);
    if (els.resultCard) { els.resultCard.classList.remove('celebrate'); els.resultCard.classList.add('sad'); setTimeout(()=>els.resultCard.classList.remove('sad'), 1000); }
    floatingEmojis(['💔','😿','🥺','💢','🫠'], 18, 3200);
  }
}

// If name exists and not completed, prefill
const storedName = localStorage.getItem(LS.playerName) || '';
if (storedName) {
  els.playerName.value = storedName;
  try { els.playerName.readOnly = true; els.playerName.disabled = true; } catch {}
}

// Defer Supabase import until after first paint to not block intro
function defer(fn){
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => fn(), { timeout: 1000 });
  } else {
    setTimeout(fn, 0);
  }
}
requestAnimationFrame(() => defer(() => {
  import('../scripts/supabase-client.js')
    .then(m => { if (m.getSupabase) { window.__getSupa = m.getSupabase; } })
    // After Supabase is ready, re-check global reset (so remote clear affects this device)
    .then(() => checkGlobalReset())
    // Then do an immediate leaderboard refresh
    .then(() => refreshLeaderboards())
    .catch(() => { /* noop */ });
}));
// Also schedule a fallback refresh (using JSON if no Supabase) to ensure table fills even if import fails
requestAnimationFrame(() => defer(() => { refreshLeaderboards(); }));
// Lightweight auto-refresh while page is visible
let __lb_timer = null;
function startLbAutoRefresh() {
  if (__lb_timer) return;
  __lb_timer = setInterval(() => {
    if (document.hidden) return;
    // drop in-flight guard and refresh
    __lb_loading = false; refreshLeaderboards();
  }, 15000); // every 15s
}
function stopLbAutoRefresh() { if (__lb_timer) { clearInterval(__lb_timer); __lb_timer = null; } }
startLbAutoRefresh();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLbAutoRefresh(); else startLbAutoRefresh();
});

// Leaderboard: load top 100 from supabase or fallback JSON
let __lb_cache = [];
let __lb_loading = false;
async function loadLeaderboardTop100() {
  if (__lb_loading) return __lb_cache;
  __lb_loading = true;
  try {
    const getSupa = window.__getSupa ? window.__getSupa : null;
    if (getSupa) {
      const supa = await getSupa();
      if (supa) {
        const { data, error } = await supa
          .from('leaderboard')
          .select('name,score')
          .order('score', { ascending: false })
          .limit(100);
        if (!error && Array.isArray(data)) {
          __lb_cache = (data || []).map(x => ({ name: x.name || '', score: Number(x.score) || 0 }));
          return __lb_cache;
        }
      }
    }
    // fallback to static
    const res = await fetch('./leaderboard.json', { cache: 'no-store' }).catch(() => null);
    if (res && res.ok) {
      const arr = await res.json();
      __lb_cache = Array.isArray(arr) ? arr.slice(0,100).map(x => ({ name: x.name || '', score: Number(x.score) || 0 })) : [];
      return __lb_cache;
    }
  } catch (e) { /* noop */ }
  finally { __lb_loading = false; }
  return __lb_cache;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

function rankBadge(rank) {
  // Return emoji/icon for top ranks
  const badges = {
    1: '👑', 2: '🥈', 3: '🥉', 4: '⭐', 5: '🌟', 6: '🎯', 7: '🔥', 8: '⚡', 9: '💎', 10: '🏅'
  };
  return badges[rank] || '';
}

function rowClassForRank(rank) {
  if (rank === 1) return 'lb-top1';
  if (rank === 2) return 'lb-top2';
  if (rank === 3) return 'lb-top3';
  if (rank <= 10) return 'lb-top10';
  return '';
}

function renderLeaderboardRows(tbodyEl, list) {
  if (!tbodyEl) return;
  const rows = [];
  list.slice(0, 100).forEach((it, i) => {
    const rank = i + 1;
    const klass = rowClassForRank(rank);
    const badge = rankBadge(rank);
    rows.push(`<tr class="${klass}"><td class="lb-rank">${rank}</td><td>${badge?`<span class='lb-badge'>${badge}</span>`:''}${escapeHtml(it.name)}</td><td style="text-align:right">${it.score}</td></tr>`);
  });
  tbodyEl.innerHTML = rows.join('') || `<tr><td colspan="3" style="color:#94a3b8">暫無資料</td></tr>`;
}

async function refreshLeaderboards() {
  const data = await loadLeaderboardTop100();
  renderLeaderboardRows(els.lbBodyStart, data);
  renderLeaderboardRows(els.lbBodyResult, data);
}

// Wire refresh buttons
if (els.lbRefreshA) els.lbRefreshA.addEventListener('click', () => { __lb_loading = false; refreshLeaderboards(); });
if (els.lbRefreshB) els.lbRefreshB.addEventListener('click', () => { __lb_loading = false; refreshLeaderboards(); });

async function submitScore(name, score) {
  try {
    if (!window.__getSupa) return;
    const supa = await window.__getSupa();
    if (!supa) return;
    // 相同玩家名稱覆蓋舊分數，避免重複名稱
    const { data: existing, error: selErr } = await supa
      .from('leaderboard')
      .select('name')
      .eq('name', name)
      .maybeSingle();
    if (selErr) {
      // 查詢失敗時退回插入嘗試
      const { error: insErr } = await supa.from('leaderboard').insert({ name, score, device_key: deviceKey });
      if (insErr) console.warn('submitScore insert error', insErr);
      return;
    }
    if (existing) {
      const { error: updErr } = await supa.from('leaderboard').update({ score }).eq('name', name);
      if (updErr) console.warn('submitScore update error', updErr);
    } else {
      const { error: insErr } = await supa.from('leaderboard').insert({ name, score, device_key: deviceKey });
      if (insErr) console.warn('submitScore insert error', insErr);
    }
  // refresh cache after successful write
  __lb_loading = false; await refreshLeaderboards();
  } catch (e) { console.warn('submitScore ex', e); }
}


async function checkGlobalReset() {
  try {
    if (!window.__getSupa) return;
    const supa = await window.__getSupa();
    if (!supa) return;
    // config table: key (text pk), value (text), updated_at default now()
    const { data, error } = await supa.from('config').select('value, updated_at').eq('key','quiz_reset_at').single();
    if (error || !data) return;
    const remoteTs = Date.parse(data.value || data.updated_at || '') || 0;
    const localTs = Number(localStorage.getItem(LS_RESET) || '0');
    if (remoteTs > localTs) {
      // Clear local quiz locks + player/device binds so名字可重新輸入
      localStorage.removeItem(LS.completed);
      localStorage.removeItem(LS.result);
      localStorage.removeItem(LS.playerName);
      localStorage.removeItem(LS.deviceKey);
      localStorage.setItem(LS_RESET, String(remoteTs));
      // Try to update UI to allow renaming without reload
      try {
        if (els.playerName) {
          els.playerName.readOnly = false;
          els.playerName.disabled = false;
          els.playerName.value = '';
        }
      } catch {}
    }
  } catch { /* noop */ }
}

// Boot (init state immediately but keep heavy IO deferred)
initSavedState();

// Replay support
if (els.playAgainBtn) {
  els.playAgainBtn.addEventListener('click', () => {
    // keep name; reset quiz and start
    const name = localStorage.getItem(LS.playerName) || '';
    els.resultCard.style.display = 'none';
    startQuiz(name);
  });
}

// Go home: return to start screen with rules
if (els.goHomeBtn) {
  els.goHomeBtn.addEventListener('click', () => {
    els.resultCard.style.display = 'none';
    els.quizCard.style.display = 'none';
    els.nameCard.style.display = '';
    document.body.classList.remove('theme-1','theme-2','theme-3');
  });
}

// Celebration / Fail effects
function triggerFX(passed){
  if (passed) startConfetti(); else startFailFX();
}

function startConfetti(){
  try{
    const canvas = els.fxCanvas; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    const resize = () => { canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr; canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; };
    resize();
    const colors = ['#ff4fa3','#ffc93c','#7cd4ff','#a3e635','#f472b6'];
    const N = 200;
    const parts = Array.from({length:N},()=>({
      x: Math.random()*canvas.width,
      y: -Math.random()*canvas.height*0.5,
      r: 4 + Math.random()*6,
      vx: -1.2 + Math.random()*2.4,
      vy: 2.2 + Math.random()*3.2,
      rot: Math.random()*Math.PI*2,
      vr: (-0.1+Math.random()*0.2),
      color: colors[(Math.random()*colors.length)|0]
    }));
    let running = true; const t0 = performance.now();
    const loop = () => {
      if (!running) return;
      const t = performance.now()-t0; if (t>5200) running=false;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (const p of parts){
        p.vy += 0.02*dpr; p.x += p.vx*dpr; p.y += p.vy*dpr; p.rot += p.vr;
        if (p.y>canvas.height+20) { p.y = -10; p.vy=2+Math.random()*3; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(-p.r,0); ctx.lineTo(0,-p.r); ctx.lineTo(p.r,0); ctx.lineTo(0,p.r); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      if (running) requestAnimationFrame(loop);
      else setTimeout(()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); }, 200);
    };
    requestAnimationFrame(loop);
  }catch{}
}

function startFailFX(){
  try{
    if (els.resultCard) els.resultCard.classList.add('shake');
    const host = els.fxFail; if (!host) return;
    host.style.display = '';
    host.innerHTML = '';
    const N = 28;
    for (let i=0;i<N;i++){
      const span = document.createElement('span');
      span.textContent = ['💔','😭','😿','🥺'][Math.floor(Math.random()*4)];
      const left = Math.round(Math.random()*100);
      const duration = (3+Math.random()*2).toFixed(2);
      span.style.cssText = `position:absolute;left:${left}vw;top:-10vh;font-size:${24+Math.random()*24}px;animation:fall${i} ${duration}s ease-in forwards`;
      host.appendChild(span);
      const key = document.createElement('style');
      key.textContent = `@keyframes fall${i}{to{transform:translateY(120vh) rotate(${(Math.random()*60-30).toFixed(1)}deg);opacity:0.2}}`;
      document.head.appendChild(key);
      setTimeout(()=>{ key.remove(); }, duration*1000+500);
    }
    setTimeout(()=>{ host.style.display='none'; if (els.resultCard) els.resultCard.classList.remove('shake'); }, 3500);
  }catch{}
}

// Cute click particles
function clickPop(e){
  try{
    const emojis = ['🍬','🍭','✨','🌟','💖','🍪','🧁'];
    const el = document.createElement('div'); el.className='pop';
    el.style.left = e.clientX+'px'; el.style.top = e.clientY+'px';
    const count = 4 + Math.floor(Math.random()*3);
    for(let i=0;i<count;i++){
      const s = document.createElement('span');
      s.textContent = emojis[(Math.random()*emojis.length)|0];
      s.style.transform = `translate(${(Math.random()*30-15).toFixed(0)}px, ${(Math.random()*-20-10).toFixed(0)}px)`;
      s.style.fontSize = (16+Math.random()*12)+'px';
      el.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 900);
  }catch{}
}

// Floating emojis helper
function floatingEmojis(icons, n, ms){
  try{
    const host = els.fxFail; if (!host) return;
    host.style.display='';
    host.innerHTML='';
    for(let i=0;i<n;i++){
      const span=document.createElement('span');
      span.textContent = icons[i%icons.length];
      const left = Math.round(Math.random()*100);
      const duration = (2.2+Math.random()*1.8).toFixed(2);
      span.style.cssText = `position:absolute;left:${left}vw;top:110vh;font-size:${22+Math.random()*22}px;animation:rise${i} ${duration}s ease-out forwards`;
      host.appendChild(span);
      const key = document.createElement('style');
      key.textContent = `@keyframes rise${i}{to{transform:translateY(-130vh) rotate(${(Math.random()*40-20).toFixed(1)}deg);opacity:0.1}}`;
      document.head.appendChild(key);
      setTimeout(()=>{ key.remove(); }, duration*1000+500);
    }
    setTimeout(()=>{ host.style.display='none'; }, ms||3000);
  }catch{}
}

