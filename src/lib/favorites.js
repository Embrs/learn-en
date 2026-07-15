// 收藏功能（存在瀏覽器 localStorage，換裝置或清除資料會消失）。
import { ref, computed } from 'vue'
import { toast } from './toast.js'

// ⚠️ key 名稱不能改：一旦改名（例如加版本號），使用者既有的收藏會全部消失。
const FAV_KEY = 'dailyEnglishFavorites'

function load() {
  // try/catch：Safari 無痕模式與部分內建瀏覽器讀 localStorage 會直接 throw
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') }
  catch (e) { return [] }
}

// 用一份共享的響應式狀態驅動畫面（徽章、各處星號會自動同步）。
// 但真實來源仍然是 localStorage：寫入前一定重讀，理由見 toggleFavorite。
const favorites = ref(load())

function persist() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites.value)) } catch (e) {}
}

// 其他分頁改了收藏時同步過來。storage 事件只會在「別的分頁」觸發，不會被自己的寫入叫到。
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FAV_KEY) favorites.value = load()
  })
}

export const favoriteCount = computed(() => favorites.value.length)

// 收藏頁顯示用：最新收藏的在最前面（舊版是 getFavorites().slice().reverse()）
export const favoritesNewestFirst = computed(() => favorites.value.slice().reverse())

export function isFavorited(id) {
  return favorites.value.some(f => f.id === id)
}

// ⚠️ item 存的是「快照」而不是句子 id 的參照，這是刻意的設計。
// 排程任務同一天重跑時會就地覆寫句子內容但保留 id（例如 2026-07-15-1 的英文句子被換掉），
// 若改成用 id 回查資料，使用者收藏的內容就會無聲變成另一句。存快照才能凍住當下收藏的東西。
export function toggleFavorite(item) {
  // ⚠️ 寫入前先重讀 localStorage，不要直接改記憶體裡那份。
  // 這是舊版的作法（每次 toggle 都 getFavorites() 重讀），必須保留：
  // 如果拿記憶體中可能過期的陣列整份覆寫回去，同時開兩個分頁時
  // 「B 分頁用它開啟當下的舊清單覆寫掉 A 分頁剛加的收藏」，使用者的收藏會無聲消失且救不回來。
  // 舊版是多頁式（每次換頁都重讀，過期視窗很短），改成 SPA 之後分頁可以開著好幾天不重載，
  // 這個風險反而變大。上面的 storage 監聽器只能同步「畫面」，擋不住寫入競態，兩者都需要。
  const list = load()
  const idx = list.findIndex(f => f.id === item.id)
  if (idx >= 0) {
    list.splice(idx, 1)
    toast('已取消收藏')
  } else {
    list.push(item)
    toast('已加入收藏 ⭐')
  }
  favorites.value = list
  persist()
}
