// =========================================================
// 語音朗讀（只用 Samantha）
//
// ⚠️ 這個檔案裡幾乎每一行「看起來多餘」的程式碼都是修過的瀏覽器 bug，不要清理。
// 它刻意寫成模組層單例而非 Vue 元件邏輯，原因見下方各段註解。
// =========================================================
import { ref, watch } from 'vue'
import { toast } from './toast.js'

// ---------------- 語音挑選 ----------------
let pickedVoice = null

// 只找 Samantha，找不到就「不指定語音」（交給瀏覽器用該裝置的預設英文語音）。
// 注意 fallback 是 null 而不是「挑一個備用英文語音」——這是刻意的。
function pickVoice() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  // 用 includes 而非 ===，才吃得下 'Samantha (Enhanced)'、'com.apple.voice.compact.en-US.Samantha' 等變體
  pickedVoice = voices.find(v => v.name.toLowerCase().includes('samantha')) || null
}

// 同步呼叫一次 + 掛 onvoiceschanged 再挑一次，兩段都不能少：
// Chrome 首次載入時 getVoices() 幾乎必定回傳空陣列，要等 onvoiceschanged 才有清單；
// Safari 則是一開始就備妥、可能永遠不觸發 onvoiceschanged。
//
// 這段放在模組層（載入時執行一次、永不解除），不放進元件的 onMounted：
// onvoiceschanged 是屬性指派而非 addEventListener，等於獨佔 handler，
// 多個元件掛載會互相覆蓋，而元件卸載時把它設回 null 會讓語音挑選整個失效。
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

// ---------------- 語速 ----------------
const RATE_KEY = 'dailyEnglishRate'
const DEFAULT_RATE = 0.88

function loadRate() {
  // parseFloat(null) 是 NaN，NaN || 0.88 → 0.88；順帶把 0 與空字串這種不合法值也擋掉。
  // try/catch 是為了 Safari 無痕模式與 LINE/IG 內建瀏覽器——那些環境讀 localStorage 會直接 throw，
  // 沒有這層保護整個語音功能會在那裡整段崩掉。
  try { return parseFloat(localStorage.getItem(RATE_KEY)) || DEFAULT_RATE }
  catch (e) { return DEFAULT_RATE }
}

// 語速是跨頁共享狀態，不是單日頁的區域狀態。
// 舊版靠「playViaBrowserTTS 每次播放都去 document 撈 #rateRange，撈不到才讀 localStorage」達成這件事：
// 語速列只存在於單日頁，所以收藏頁與分類頁的播放是靠那條 localStorage fallback 才套用到使用者設定。
// 這裡改用共享的 ref + 寫回 localStorage，效果等價但不必依賴全域 DOM 查詢。
export const rate = ref(loadRate())

watch(rate, (r) => {
  try { localStorage.setItem(RATE_KEY, r) } catch (e) {}
})

// ---------------- 播放 ----------------
// Chrome 有個知名 bug：SpeechSynthesisUtterance 如果只存在函式內的區域變數，
// 講到一半就可能被瀏覽器記憶體回收（GC），導致「API 顯示 speaking=true 但完全沒聲音」。
// 解法是把目前正在講的 utterance 存在外層變數，保持強引用，播完才釋放。
// （這個變數「只寫不讀」是正常的——它的作用就是「存在」，不要當死碼刪掉。）
let currentUtterance = null
let speakWatchdogTimer = null

function playViaBrowserTTS(text, _isRetry) {
  if (!('speechSynthesis' in window)) {
    toast('此瀏覽器不支援語音朗讀')
    return
  }
  clearTimeout(speakWatchdogTimer)

  // ⚠️ Safari 對 speechSynthesis 的規定很嚴格：一定要在使用者點擊的當下「同步」呼叫 speak()，
  // 中間不能有 setTimeout／await／nextTick 等非同步延遲，否則會被直接靜音擋掉（不報錯、不發聲）。
  // 所以從進入這個函式到 speak(u) 之間全部同步執行，呼叫端的事件處理器也必須是同步函式。
  //
  // 沒有配對的 pause()，這行 resume() 也不是死碼：它是用來解掉 Chrome/iOS 上 speechSynthesis
  // 會莫名進入 paused 狀態、導致之後所有 speak() 都無聲的問題。刪掉的症狀是「用一陣子突然全部沒聲音」。
  window.speechSynthesis.resume()

  // Chrome 另一個已知 bug：明明沒有東西在播放，卻呼叫 cancel() 再馬上 speak()，
  // 新的這句反而會立刻收到 "canceled" 錯誤而放不出聲音。所以只有「真的有東西在播放/排隊」時才 cancel()。
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel()
  }

  const u = new SpeechSynthesisUtterance(text)
  // 先設 lang 再設 voice；lang 跟著 voice 自己回報的值走，兩者不一致時
  // 部分瀏覽器會忽略 voice 或改用系統預設語音發音。
  u.lang = pickedVoice ? pickedVoice.lang : 'en-US'
  // 有條件賦值：把 u.voice 設成 null 在部分瀏覽器會失效或報錯，留空才是交給裝置預設英文語音
  if (pickedVoice) u.voice = pickedVoice
  u.rate = rate.value

  let started = false
  u.onstart = () => { started = true }
  u.onerror = (e) => {
    // "canceled"/"interrupted" 是使用者快速切換播放時的正常現象，不用跳錯誤提示
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      toast('播放失敗：' + (e.error || '未知錯誤'))
    }
    currentUtterance = null
  }
  u.onend = () => { currentUtterance = null }

  currentUtterance = u // 保持強引用，避免 Chrome 中途把物件回收掉
  window.speechSynthesis.speak(u)

  // Chrome 偶爾會出現 speak() 呼叫後完全沒反應（API 顯示 speaking=true 但沒有聲音、
  // 也不會觸發 onstart）的怪異狀況。這裡加一個保險：350ms 內沒開始播放，就強制重來一次。
  // 註冊在 speak() 之後，才不會擋住上面那條必須同步的路徑。
  if (!_isRetry) {
    speakWatchdogTimer = setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel()
        setTimeout(() => playViaBrowserTTS(text, true), 50)
      }
    }, 350)
  }
}

// 對外只暴露 speak()，內部的 _isRetry 旗標不外流：
// 外部呼叫一律 _isRetry=undefined，才會裝上 watchdog；只有內部重試會傳 true。
// 這層包裝看起來多餘，其實是「對外 API」與「含重試旗標的內部實作」的分界，別合併。
export function speak(text) {
  playViaBrowserTTS(text)
}
