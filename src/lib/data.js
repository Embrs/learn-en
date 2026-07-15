// 例句資料讀取。
//
// 資料來源是 public/data 底下的靜態 JSON，用 runtime fetch 抓取而非打包進 bundle——
// 這是「排程任務只改 JSON 就能更新內容、完全不需要 build」的關鍵。
//
// import.meta.env.BASE_URL 會是 '/learn-en/'（見 vite.config.js）。
// 不能寫成相對路徑：SPA 在 /day/2026-07-15 這種深層網址下，相對路徑會解析到錯的位置。
const BASE = import.meta.env.BASE_URL

// 每個檔案各自快取一份 Promise（而非資料），這樣同一份檔案同時被要求多次時只會發一次請求
const cache = new Map()

function fetchJson(path) {
  if (cache.has(path)) return cache.get(path)

  const p = fetch(BASE + path)
    .then(r => {
      // 明確檢查狀態碼。舊版直接 .json() 讓解析失敗落進 catch，是繞路的錯誤偵測：
      // 靜態主機對不存在的路徑回傳的是 HTML 錯誤頁，靠 JSON 解析拋 SyntaxError 才被接住。
      // 若主機哪天對 404 回傳合法 JSON，那個寫法會把錯誤內容當成正常資料快取起來。
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .catch(err => {
      // 失敗不留在快取裡，使用者重新整理或重新進入才能重試（舊版也是只在成功時才寫快取）
      cache.delete(path)
      throw err
    })

  cache.set(path, p)
  return p
}

// 日期清單 + 每分類總數（由 scripts/build-data-index.mjs 從日檔推導）
export function fetchIndex() {
  return fetchJson('data/index.json')
}

// 20 個分類的定義（id / 中文 / icon）
export function fetchCategories() {
  return fetchJson('data/categories.json')
}

// 單日的 20 句
export function fetchDay(date) {
  return fetchJson(`data/days/${date}.json`)
}

// 某分類跨所有日期的例句（由建置產生，避免分類頁得抓下每一個日檔）
export function fetchCategorySentences(catId) {
  return fetchJson(`data/by-category/${catId}.json`)
}
