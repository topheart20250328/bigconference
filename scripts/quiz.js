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

// Data: questions as provided
const STAGES = [
  { name: '大格局', items: [
    { q: '一個有格局的人最重要的特質是什麼？', A: '常常抱怨', B: '會感恩', C: '喜歡比較', ans: 'B' },
    { q: '「格局點燃法則」包含哪些元素？', A: 'Vision、Mission、Passion、Action', B: 'Money、Power、Status、Fame', C: 'Dream、Luck、Talent、Chance', ans: 'A' },
    { q: '大格局的人，會願意做什麼？', A: '不能被說', B: '不能被提醒', C: '願意被說、被提醒', ans: 'C' },
    { q: '什麼會限制我們的格局？', A: '完美主義、忙碌主義、嫉妒主義', B: '喜樂、感恩、信心', C: '熱情、夢想、勇氣', ans: 'A' },
    { q: '下班後的時間，對大格局的人而言是什麼？', A: '休息耍廢的時刻', B: '提升競爭力的時刻', C: '不重要的時刻', ans: 'B' },
    { q: '恢復什麼，才有可能真正改變世界？', A: '自信', B: '體力', C: '財富', ans: 'A' },
    { q: '領袖必須先建立什麼，才可能帶人？', A: '恐懼感', B: '信任', C: '威嚴', ans: 'B' },
    { q: '大格局的人，講話應該怎麼樣？', A: '常帶刺', B: '有愛心', C: '充滿謊言', ans: 'B' },
    { q: '大格局就是什麼？', A: '別人看見就想擁有同樣的生命', B: '別人看見就想跟你保持距離', C: '別人看見就想挑戰你', ans: 'A' },
    { q: '一個能帶下格局的人，通常會怎樣？', A: '成為讓人信任的人', B: '成為讓人害怕的人', C: '成為讓人疏遠的人', ans: 'A' },
  ]},
  { name: '大突破', items: [
    { q: '所有被神大大使用的人，在他們的故事中最常被強調的是？', A: '他們的口才與人脈', B: '他們的大有信心', C: '他們的家世與背景', ans: 'B' },
    { q: '聖經提醒「要上巔峰必先瘋癲」，這裡的「瘋癲」最接近的意思是什麼？', A: '願意為夢想投入極大的熱情', B: '行為舉止失去理智', C: '不顧一切的衝動決定', ans: 'A' },
    { q: '領袖在面對問題時，真正的突破關鍵是？', A: '先想辦法逃避壓力，等問題自然過去', B: '勇敢承擔壓力，願意付代價解決問題', C: '把責任推給團隊，自己置身事外', ans: 'B' },
    { q: '真正的卓越員工，會讓老闆怎麼看待他？', A: '「公司即使沒有你，也能一樣運轉」', B: '「公司不能沒有你，因為你帶來關鍵價值」', C: '「公司隨時可以用別人取代你」', ans: 'B' },
    { q: '當一個人陷入「忙碌主義」時，他最可能的結果是什麼？', A: '表面看起來很努力，但其實無法真正突破', B: '工作雖然多，但成就感大幅提升', C: '忙碌能讓他不需要再面對生命問題', ans: 'A' },
    { q: '對於有大突破眼光的領袖而言，危機通常代表什麼？', A: '讓人無能為力的絕境', B: '一個突破與成長的契機', C: '對團隊而言只是增加壓力', ans: 'B' },
    { q: '如果你想要突破，以下哪個組合最有力量？', A: '熱情、信心、行動', B: '夢想、運氣、等待', C: '天份、背景、資源', ans: 'A' },
    { q: '在職場中，哪一個聖經人物展現了突破的生命典範？', A: '約瑟──在惡劣環境仍然忠心到底', B: '該隱──用嫉妒成就自己', C: '亞哈──用權力壓制他人', ans: 'A' },
    { q: '為什麼「幫助他人成功」是一種突破？', A: '因為你會因此獲得更多讚賞', B: '因為這會帶來更深的人際信任與愛戴', C: '因為這樣別人會欠你一個人情', ans: 'B' },
    { q: '以下哪一項最不可能帶來真正的突破？', A: '抱怨環境', B: '勇敢面對挑戰', C: '願意冒險並行動', ans: 'A' },
  ]},
  { name: '大夢想', items: [
    { q: '真正的異象與野心最大的差別是什麼？', A: '異象是從神而來，野心只是滿足自我慾望', B: '異象需要更多錢，野心只要努力', C: '異象會讓人受歡迎，野心會讓人孤立', ans: 'A' },
    { q: '領袖最大的價值不是自己發光，而是什麼？', A: '幫助別人成功', B: '讓自己在舞台上最亮眼', C: '讓團隊變成工具', ans: 'A' },
    { q: '影響力的第一階段「被人接納」通常意味著什麼？', A: '願意尊重並融入一個團體', B: '讓眾人看見自己的優秀', C: '用情商讓別人接受你', ans: 'A' },
    { q: '影響力的最高境界「被人愛戴」，代表領袖具備什麼？', A: '令人敬畏的權力', B: '令人追隨的品格與犧牲', C: '令人忌妒的成就', ans: 'B' },
    { q: '建造夢想團隊時，找「對的人」最重要的條件是？', A: '忠誠、委身、能受教', B: '精明會計算', C: '討好領袖、顧好自己', ans: 'A' },
    { q: '領袖在夢想旅程中必須自問的兩個核心問題是？', A: '為什麼人要跟隨我？我要帶他們去哪裡？', B: '我想去哪裡？我要什麼？', C: '我有多少人脈？我有多少資源？', ans: 'A' },
    { q: '一個有夢想的人，對周圍的人最大的影響是？', A: '畫出清晰的願景，吸引人願意跟隨', B: '讓自己成為使環境更好的壓力', C: '讓周圍的人一同賺大錢', ans: 'A' },
    { q: '在職場與事奉中，真正的「倫理」高峰是什麼？', A: '幫助他人成功，成全更多人', B: '盡量累積自己的成就', C: '成為眾人中最有名的人', ans: 'A' },
    { q: '從「成功」邁向「卓越」的關鍵轉折是？', A: '努力的實現自我成就', B: '讓團隊和別人一起更好', C: '放下責任專注自己', ans: 'B' },
    { q: '大夢想的人格條件組合中，哪一項是聖經強調的？', A: '雄心、信心、愛心、耐心、恆心', B: '驕傲、嫉妒、懶惰、抱怨、脾氣', C: '錢財、地位、權力、名聲、享樂', ans: 'A' },
  ]},
];

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
  fxCanvas: document.getElementById('fxCanvas'),
  fxFail: document.getElementById('fxFail'),
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
}

function startQuiz(name) {
  resetQuizState();
  els.nameCard.style.display = 'none';
  els.quizCard.style.display = '';
  nextQuestion();
}

function nextQuestion() {
  const stage = STAGES[currentStage];
  const item = stage.items[currentIndex];
  els.stageName.textContent = stage.name;
  els.question.textContent = `${currentIndex+1}. ${item.q}`;
  els.optA.textContent = `A. ${item.A}`;
  els.optB.textContent = `B. ${item.B}`;
  els.optC.textContent = `C. ${item.C}`;

  els.optA.onclick = (e) => { clickPop(e); answer('A'); };
  els.optB.onclick = (e) => { clickPop(e); answer('B'); };
  els.optC.onclick = (e) => { clickPop(e); answer('C'); };

  startMeter();
}

function answer(choice) {
  const msLeft = Math.max(0, QUESTION_TIME - (performance.now() - timerStart));
  stopMeter();
  const stage = STAGES[currentStage];
  const item = stage.items[currentIndex];
  let gained = 0;
  if (choice === item.ans) {
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
      details.push({ type:'bonus', stage: STAGES[currentStage].name, text: `${STAGES[currentStage].name} 全對加成 +500` });
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

import('../scripts/supabase-client.js').then(m => m.getSupabase && (window.__getSupa = m.getSupabase)).catch(()=>{});

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
      // Clear local quiz locks
  localStorage.removeItem(LS.completed);
  localStorage.removeItem(LS.result);
      localStorage.setItem(LS_RESET, String(remoteTs));
    }
  } catch { /* noop */ }
}

// Boot
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

