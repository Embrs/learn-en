// =========================================================
// 每日英文・共用邏輯（語音、收藏、導覽列、內建瀏覽器提示）
// =========================================================

function relPrefix() {
  return location.pathname.includes('/days/') ? '../' : '';
}

// ---------------- Toast ----------------
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------------- LINE / FB / IG 內建瀏覽器偵測 ----------------
function detectInApp() {
  const ua = navigator.userAgent || '';
  if (/Line\//i.test(ua)) return 'line';
  if (/FBAN|FBAV/i.test(ua)) return 'fb';
  if (/Instagram/i.test(ua)) return 'ig';
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  return null;
}

function copyLink() {
  const url = location.href;
  const done = () => toast('已複製連結');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
  } else {
    fallbackCopy(url, done);
  }
}
function fallbackCopy(url, done) {
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) {}
  document.body.removeChild(ta);
}

function showInAppBanner() {
  const kind = detectInApp();
  if (!kind) return;
  const label = { line: 'LINE', fb: 'Facebook', ig: 'Instagram', wechat: 'WeChat' }[kind];
  const banner = document.createElement('div');
  banner.className = 'inapp-banner';
  banner.innerHTML = `
    <div class="inapp-text">⚠️ 偵測到你正在 ${label} 內建瀏覽器中，語音朗讀可能無法使用</div>
    <div class="inapp-actions">
      <button class="primary" id="openExternalBtn">用瀏覽器開啟</button>
      <button class="secondary" id="copyLinkBtn">複製連結</button>
    </div>
  `;
  document.body.prepend(banner);

  document.getElementById('openExternalBtn').addEventListener('click', () => {
    if (kind === 'line') {
      const url = location.href;
      location.href = url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
    } else {
      copyLink();
      toast('已複製連結，請點右上角「⋯」選擇用瀏覽器開啟並貼上');
    }
  });
  document.getElementById('copyLinkBtn').addEventListener('click', copyLink);
}

// ---------------- 分類 ----------------
const CATEGORIES = [
  { id: 'daily-routine', zh: '生活起居', icon: '🌅' },
  { id: 'meals', zh: '用餐時間', icon: '🍽️' },
  { id: 'bath-bedtime', zh: '洗澡睡前', icon: '🛁' },
  { id: 'outings', zh: '出遊活動', icon: '🚗' },
  { id: 'playground', zh: '公園玩耍', icon: '🛝' },
  { id: 'school', zh: '上學／學校', icon: '🎒' },
  { id: 'homework', zh: '功課學習', icon: '📝' },
  { id: 'toys-sharing', zh: '玩具分享', icon: '🧸' },
  { id: 'emotions', zh: '情緒安撫', icon: '🤗' },
  { id: 'discipline', zh: '管教規矩', icon: '📏' },
  { id: 'praise', zh: '讚美鼓勵', icon: '🌟' },
  { id: 'safety', zh: '安全提醒', icon: '⚠️' },
  { id: 'health', zh: '健康就醫', icon: '🏥' },
  { id: 'relatives', zh: '親戚拜訪', icon: '👵' },
  { id: 'friends', zh: '朋友社交', icon: '👫' },
  { id: 'manners', zh: '禮貌用語', icon: '🙏' },
  { id: 'weather', zh: '天氣穿著', icon: '🧥' },
  { id: 'screen-time', zh: '3C螢幕時間', icon: '📱' },
  { id: 'celebrations', zh: '節慶慶祝', icon: '🎉' },
  { id: 'reading', zh: '睡前故事', icon: '📖' },
];
function categoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) || { id: id, zh: id, icon: '🏷️' };
}

// ---------------- 語音（只用 Samantha） ----------------
let allVoices = [];
let pickedVoice = null;

// 只找 Samantha，找不到就不指定語音（交給瀏覽器用該裝置的預設英文語音）
function pickVoice() {
  allVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const samantha = allVoices.find(v => v.name.toLowerCase().includes('samantha'));
  pickedVoice = samantha || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

function loadRate() {
  try { return parseFloat(localStorage.getItem('dailyEnglishRate')) || 0.88; }
  catch (e) { return 0.88; }
}
function saveRate(r) {
  try { localStorage.setItem('dailyEnglishRate', r); } catch (e) {}
}

function speak(text) {
  playViaBrowserTTS(text);
}

// Chrome 有個知名 bug：SpeechSynthesisUtterance 如果只存在函式內的區域變數，
// 講到一半就可能被瀏覽器記憶體回收（GC），導致「API 顯示 speaking=true 但完全沒聲音」。
// 解法是把目前正在講的 utterance 存在外層變數，保持強引用，播完才釋放。
let currentUtterance = null;
let speakWatchdogTimer = null;

function playViaBrowserTTS(text, _isRetry) {
  if (!('speechSynthesis' in window)) {
    toast('此瀏覽器不支援語音朗讀');
    return;
  }
  clearTimeout(speakWatchdogTimer);
  // Safari 對 speechSynthesis 的規定很嚴格：一定要在使用者點擊的當下「同步」呼叫 speak()，
  // 中間不能有 setTimeout／await 等非同步延遲，否則會被直接靜音擋掉。所以這裡全部同步執行。
  //
  // Chrome 則有另一個已知 bug：明明沒有東西在播放，卻呼叫 cancel() 再馬上 speak()，
  // 新的這句反而會立刻收到 "canceled" 錯誤而放不出聲音。所以只有「真的有東西在播放/排隊」時才 cancel()。
  window.speechSynthesis.resume();
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  const rateRange = document.getElementById('rateRange');
  const rate = rateRange ? (parseFloat(rateRange.value) || 0.88) : loadRate();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = pickedVoice ? pickedVoice.lang : 'en-US';
  if (pickedVoice) u.voice = pickedVoice;
  u.rate = rate;
  let started = false;
  u.onstart = () => { started = true; };
  u.onerror = (e) => {
    // "canceled"/"interrupted" 是使用者快速切換播放時的正常現象，不用跳錯誤提示
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      toast('播放失敗：' + (e.error || '未知錯誤'));
    }
    currentUtterance = null;
  };
  u.onend = () => { currentUtterance = null; };
  currentUtterance = u; // 保持強引用，避免 Chrome 中途把物件回收掉
  window.speechSynthesis.speak(u);

  // Chrome 偶爾會出現 speak() 呼叫後完全沒反應（API 顯示 speaking=true 但沒有聲音、
  // 也不會觸發 onstart）的怪異狀況。這裡加一個保險：350ms 內沒開始播放，就強制重來一次。
  if (!_isRetry) {
    speakWatchdogTimer = setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel();
        setTimeout(() => playViaBrowserTTS(text, true), 50);
      }
    }, 350);
  }
}

// ---------------- 發音設定列（動態插入） ----------------
function renderControls() {
  const holder = document.getElementById('controlsBar');
  if (!holder) return;
  const rate = loadRate();
  holder.innerHTML = `
    <span>🔊 語速：</span>
    <input type="range" id="rateRange" min="0.6" max="1.2" step="0.05" value="${rate}">
    <span id="rateVal">${rate}</span>
    <button class="play secondary" id="testBtn">試聽</button>
  `;
  const rateRange = document.getElementById('rateRange');
  const rateVal = document.getElementById('rateVal');
  rateRange.addEventListener('input', (e) => {
    rateVal.textContent = e.target.value;
    saveRate(e.target.value);
  });
  document.getElementById('testBtn').addEventListener('click', () => {
    speak('Hi there, how does this voice sound to you?');
  });

  if (!document.getElementById('voiceHint')) {
    const hint = document.createElement('div');
    hint.id = 'voiceHint';
    hint.className = 'tip';
    hint.style.display = 'none';
    holder.insertAdjacentElement('afterend', hint);
  }
}

// ---------------- 導覽列 ----------------
function renderHeader() {
  const holder = document.getElementById('siteHeader');
  if (!holder) return;
  const prefix = relPrefix();
  const isFavPage = location.pathname.endsWith('favorites.html');
  const isCatPage = location.pathname.endsWith('categories.html');
  const isHomePage = !isFavPage && !isCatPage;
  holder.innerHTML = `
    <div class="nav-inner">
      <div class="brand">📚 每日英文<span class="brand-sub">・家庭生活</span></div>
    </div>
    <nav class="tabs">
      <a href="${prefix}index.html" class="tab-link${isHomePage ? ' active' : ''}">🏠 首頁</a>
      <a href="${prefix}categories.html" class="tab-link${isCatPage ? ' active' : ''}">🗂 分類</a>
      <a href="${prefix}favorites.html" class="tab-link${isFavPage ? ' active' : ''}">⭐ 收藏<span id="favCount" class="fav-badge"></span></a>
    </nav>
  `;
  updateFavCountBadge();
}

// ---------------- 收藏功能 ----------------
const FAV_KEY = 'dailyEnglishFavorites';

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
  catch (e) { return []; }
}
function setFavorites(list) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
}
function isFavorited(id) {
  return getFavorites().some(f => f.id === id);
}
function toggleFavorite(item, btnEl) {
  let favs = getFavorites();
  const idx = favs.findIndex(f => f.id === item.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    toast('已取消收藏');
  } else {
    favs.push(item);
    toast('已加入收藏 ⭐');
  }
  setFavorites(favs);
  if (btnEl) {
    const active = isFavorited(item.id);
    btnEl.textContent = active ? '★' : '☆';
    btnEl.classList.toggle('active', active);
  }
  updateFavCountBadge();
}
function updateFavCountBadge() {
  const badge = document.getElementById('favCount');
  if (!badge) return;
  const n = getFavorites().length;
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

// ---------------- 共用：例句卡片 ----------------
// label: 顯示在卡片左上角的標籤（例如「第 1 句」或日期）
// showCategory: 是否顯示分類徽章（分類頁上已經用分類分組，所以那邊會關掉）
function buildSentenceCard(item, dateId, index, opts) {
  opts = opts || {};
  const sentId = `${dateId}-${index + 1}`;
  const card = document.createElement('div');
  card.className = 'card';

  const top = document.createElement('div');
  top.className = 'card-top';
  const labelWrap = document.createElement('div');
  labelWrap.className = 'card-top-labels';
  const numEl = document.createElement('span');
  numEl.className = 'num';
  numEl.textContent = opts.label || `第 ${index + 1} 句`;
  labelWrap.appendChild(numEl);
  if (opts.showCategory !== false && item.category) {
    const info = categoryInfo(item.category);
    const catEl = document.createElement('span');
    catEl.className = 'cat-badge';
    catEl.textContent = `${info.icon} ${info.zh}`;
    labelWrap.appendChild(catEl);
  }
  top.appendChild(labelWrap);

  const sentStar = document.createElement('button');
  sentStar.className = 'star' + (isFavorited(sentId) ? ' active' : '');
  sentStar.textContent = isFavorited(sentId) ? '★' : '☆';
  sentStar.addEventListener('click', () => toggleFavorite(
    { id: sentId, type: 'sentence', en: item.en, zh: item.zh, ipa: item.ipa, date: dateId }, sentStar
  ));
  top.appendChild(sentStar);

  const sentenceEl = document.createElement('div');
  sentenceEl.className = 'sentence';
  sentenceEl.textContent = item.en;

  const ipaEl = document.createElement('div');
  ipaEl.className = 'ipa';
  ipaEl.textContent = item.ipa;

  const zhEl = document.createElement('div');
  zhEl.className = 'zh';
  zhEl.textContent = item.zh;

  const playBtn = document.createElement('button');
  playBtn.className = 'play';
  playBtn.textContent = '▶ 播放整句';
  playBtn.addEventListener('click', () => speak(item.en));

  const vocabWrap = document.createElement('div');
  vocabWrap.className = 'vocab-list';

  (item.vocab || []).forEach((v, vi) => {
    const vocId = `${sentId}-v${vi + 1}`;
    const row = document.createElement('div');
    row.className = 'vocab-item';
    row.innerHTML = `
      <button class="mini play-mini">🔊</button>
      <div class="vocab-text">
        <div class="vocab-word-row">
          <span class="vocab-word">${v.w}</span>
          <span class="vocab-pos">${v.pos}</span>
        </div>
        <div class="vocab-meta-row">
          <span class="vocab-ipa">${v.ipa}</span>
          <span class="vocab-zh">${v.zh}</span>
        </div>
      </div>
    `;
    row.querySelector('.play-mini').addEventListener('click', () => speak(v.w));

    const vStar = document.createElement('button');
    vStar.className = 'star mini' + (isFavorited(vocId) ? ' active' : '');
    vStar.textContent = isFavorited(vocId) ? '★' : '☆';
    vStar.addEventListener('click', () => toggleFavorite(
      { id: vocId, type: 'vocab', w: v.w, pos: v.pos, ipa: v.ipa, zh: v.zh, date: dateId, sentenceEn: item.en }, vStar
    ));
    row.appendChild(vStar);

    vocabWrap.appendChild(row);
  });

  card.appendChild(top);
  card.appendChild(sentenceEl);
  card.appendChild(ipaEl);
  card.appendChild(zhEl);
  card.appendChild(playBtn);
  card.appendChild(vocabWrap);
  return card;
}

// ---------------- 每日例句渲染 ----------------
function renderSentences(data) {
  const list = document.getElementById('list');
  if (!list) return;
  const dateId = window.PAGE_DATE || 'unknown';

  data.forEach((item, i) => {
    const card = buildSentenceCard(item, dateId, i, { label: `第 ${i + 1} 句` });
    list.appendChild(card);
  });
}

// ---------------- 首頁：歷史例句列表 ----------------
function renderArchiveList() {
  const holder = document.getElementById('dayList');
  if (!holder) return;
  fetch('archive.json')
    .then(r => r.json())
    .then(days => {
      holder.innerHTML = '';
      if (!days.length) { holder.innerHTML = '<li>尚無資料</li>'; return; }
      days.slice().reverse().forEach(d => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="${d.file}">
            <span class="day-info">
              <span class="date">${d.date}</span>
              <span class="theme">${d.theme}・${d.count}句</span>
            </span>
            <span class="chevron">›</span>
          </a>
        `;
        holder.appendChild(li);
      });
    })
    .catch(() => { holder.innerHTML = '<li>讀取歸檔失敗</li>'; });
}

// ---------------- 收藏頁 ----------------
function renderFavoritesPage() {
  const wrap = document.getElementById('favList');
  if (!wrap) return;
  const favs = getFavorites().slice().reverse();
  if (!favs.length) {
    wrap.innerHTML = '<div class="tip">目前還沒有收藏，去每日例句頁面點 ☆ 收藏喜歡的句子或單字吧！</div>';
    return;
  }
  wrap.innerHTML = '';
  favs.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card fav-card';
    if (item.type === 'sentence') {
      card.innerHTML = `
        <div class="card-top"><span class="tag">句子・${item.date}</span></div>
        <div class="sentence">${item.en}</div>
        <div class="ipa">${item.ipa}</div>
        <div class="zh">${item.zh}</div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-top"><span class="tag">單字・${item.date}</span></div>
        <div class="sentence">${item.w} <span class="vocab-pos">${item.pos}</span></div>
        <div class="ipa">${item.ipa}</div>
        <div class="zh">${item.zh}</div>
      `;
    }
    const actions = document.createElement('div');
    actions.className = 'fav-actions';
    const playBtn = document.createElement('button');
    playBtn.className = 'play';
    playBtn.textContent = '▶ 播放';
    playBtn.addEventListener('click', () => speak(item.type === 'sentence' ? item.en : item.w));
    const removeBtn = document.createElement('button');
    removeBtn.className = 'play secondary';
    removeBtn.textContent = '取消收藏';
    removeBtn.addEventListener('click', () => { toggleFavorite(item, null); renderFavoritesPage(); });
    actions.appendChild(playBtn);
    actions.appendChild(removeBtn);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
}

// ---------------- 分類頁：跨日期依分類瀏覽 ----------------
let __sentencesCache = null;
function fetchAllSentences() {
  if (__sentencesCache) return Promise.resolve(__sentencesCache);
  return fetch(relPrefix() + 'sentences.json')
    .then(r => r.json())
    .then(list => { __sentencesCache = list; return list; });
}

function renderCategoriesPage() {
  const grid = document.getElementById('catGrid');
  const results = document.getElementById('catResults');
  if (!grid || !results) return;

  results.innerHTML = '<div class="tip">載入中...</div>';

  fetchAllSentences().then(all => {
    const counts = {};
    all.forEach(item => { counts[item.category] = (counts[item.category] || 0) + 1; });

    grid.innerHTML = '';
    CATEGORIES.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-chip';
      btn.dataset.cat = c.id;
      btn.innerHTML = `
        <span class="cat-chip-icon">${c.icon}</span>
        <span class="cat-chip-label">${c.zh}</span>
        <span class="cat-chip-count">${counts[c.id] || 0}</span>
      `;
      btn.addEventListener('click', () => { location.hash = c.id; });
      grid.appendChild(btn);
    });

    function showCategory(catId) {
      Array.from(grid.querySelectorAll('.cat-chip')).forEach(b => {
        b.classList.toggle('active', b.dataset.cat === catId);
      });
      results.innerHTML = '';
      if (!catId) {
        results.innerHTML = '<div class="tip">👆 點選上方任一分類，就能看到目前所有天數中屬於該分類的例句。</div>';
        return;
      }
      const info = categoryInfo(catId);
      const matches = all.filter(item => item.category === catId).slice().reverse();
      const heading = document.createElement('div');
      heading.className = 'cat-results-heading';
      heading.textContent = `${info.icon} ${info.zh}・共 ${matches.length} 句`;
      results.appendChild(heading);
      if (!matches.length) {
        const tip = document.createElement('div');
        tip.className = 'tip';
        tip.textContent = '這個分類目前還沒有例句。';
        results.appendChild(tip);
        return;
      }
      matches.forEach(item => {
        const idx = parseInt(item.id.split('-').pop(), 10) - 1;
        const card = buildSentenceCard(item, item.date, idx, { label: item.date, showCategory: false });
        results.appendChild(card);
      });
    }

    function onHashChange() {
      const catId = decodeURIComponent(location.hash.replace('#', ''));
      showCategory(CATEGORIES.some(c => c.id === catId) ? catId : null);
    }
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
  }).catch(() => {
    results.innerHTML = '<div class="tip">讀取例句資料失敗，請重新整理頁面再試一次。</div>';
  });
}

// ---------------- 初始化 ----------------
document.addEventListener('DOMContentLoaded', () => {
  showInAppBanner();
  renderHeader();
  renderControls();
  renderArchiveList();
  renderFavoritesPage();
  renderCategoriesPage();
});
