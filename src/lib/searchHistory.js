// 搜尋歷史（存在瀏覽器 localStorage，換裝置或清除資料會消失）。
// 寫法比照 favorites.js：共享響應式狀態驅動畫面，但真實來源是 localStorage，
// 寫入前一定重讀，避免多分頁互相覆蓋。
import { ref, computed } from 'vue'

// ⚠️ key 名稱不要隨意改（改名等於清空既有歷史）。
const HISTORY_KEY = 'dailyEnglishSearchHistory'
// 最多保留幾筆：夠用就好，太多反而讓下拉選單變長、也佔 localStorage。
const MAX = 12

function load() {
  // try/catch：Safari 無痕模式與部分內建瀏覽器讀 localStorage 會直接 throw
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch (e) { return [] }
}

// 內部一律「新到舊」保存（最近搜尋的在陣列最前面）
const history = ref(load())

function persist() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value)) } catch (e) {}
}

// 別的分頁改了歷史時同步過來（storage 事件只會被「其他分頁」觸發）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === HISTORY_KEY) history.value = load()
  })
}

export const searchHistory = computed(() => history.value)

// 大小寫、前後空白視為同一筆，用來去重
function sameTerm(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

// 記錄一次搜尋：重讀 → 移除既有同詞 → 放到最前 → 截斷 → 存檔
export function addSearchHistory(termRaw) {
  const term = String(termRaw || '').trim()
  if (!term) return
  const list = load().filter(t => !sameTerm(t, term))
  list.unshift(term)
  history.value = list.slice(0, MAX)
  persist()
}

// 刪除單筆
export function removeSearchHistory(termRaw) {
  const term = String(termRaw || '')
  history.value = load().filter(t => !sameTerm(t, term))
  persist()
}

// 清除全部
export function clearSearchHistory() {
  history.value = []
  persist()
}
