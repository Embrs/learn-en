// ---- 語音設定：固定使用 Samantha，找不到才 fallback ----
let allVoices = [];
let pickedVoice = null;

function scoreVoice(v) {
  const name = v.name.toLowerCase();
  let score = 0;
  if (v.lang === 'en-US') score += 5;
  else if (v.lang.startsWith('en')) score += 3;
  if (/enhanced|premium|natural|neural/.test(name)) score += 10;
  if (/ava|allison|susan|zoe|nicky|evan|tom|alex/.test(name)) score += 6;
  if (/google/.test(name)) score += 4;
  if (v.localService) score += 1;
  if (/compact|espeak|robot/.test(name)) score -= 8;
  return score;
}

function pickVoice() {
  allVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const samantha = allVoices.find(v => v.name.toLowerCase().includes('samantha'));
  if (samantha) {
    pickedVoice = samantha;
    return;
  }
  const english = allVoices.filter(v => v.lang.startsWith('en'));
  const pool = english.length ? english : allVoices;
  pickedVoice = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;

  const hint = document.getElementById('voiceHint');
  if (hint) {
    hint.style.display = 'block';
    hint.textContent = pickedVoice
      ? `找不到 Samantha，暫時改用「${pickedVoice.name}」。Mac 可到「系統設定 > 輔助使用 > 講述內容 > 系統語音 > 管理語音」安裝 Samantha。`
      : '此瀏覽器沒有可用的語音，請改用 Safari 或 Chrome。';
  }
}

if ('speechSynthesis' in window) {
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
  if (!('speechSynthesis' in window)) {
    alert('您的瀏覽器不支援語音朗讀功能');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = pickedVoice ? pickedVoice.lang : 'en-US';
  if (pickedVoice) u.voice = pickedVoice;
  const rateRange = document.getElementById('rateRange');
  u.rate = rateRange ? (parseFloat(rateRange.value) || 0.88) : loadRate();
  window.speechSynthesis.speak(u);
}

function initRateControl() {
  const rateRange = document.getElementById('rateRange');
  const rateVal = document.getElementById('rateVal');
  if (!rateRange) return;
  const saved = loadRate();
  rateRange.value = saved;
  rateVal.textContent = saved;
  rateRange.addEventListener('input', (e) => {
    rateVal.textContent = e.target.value;
    saveRate(e.target.value);
  });
  const testBtn = document.getElementById('testBtn');
  if (testBtn) testBtn.addEventListener('click', () => speak('Hi there, how does this voice sound to you?'));
}

// ---- 渲染句卡 ----
function renderSentences(data) {
  const list = document.getElementById('list');
  if (!list) return;
  data.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    const vocabHtml = item.vocab.map(v => `
      <div class="vocab-item">
        <button class="mini" onclick="speak('${v.w.replace(/'/g, "\\'")}')">🔊</button>
        <span class="vocab-word">${v.w}</span>
        <span class="vocab-pos">${v.pos}</span>
        <span class="vocab-ipa">${v.ipa}</span>
        <span class="vocab-zh">${v.zh}</span>
      </div>
    `).join('');
    card.innerHTML = `
      <div class="num">第 ${i + 1} 句</div>
      <div class="sentence">${item.en}</div>
      <div class="ipa">${item.ipa}</div>
      <div class="zh">${item.zh}</div>
      <button class="play" onclick="speak('${item.en.replace(/'/g, "\\'")}')">▶ 播放整句</button>
      <div class="vocab-list">${vocabHtml}</div>
    `;
    list.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', initRateControl);
