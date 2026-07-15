// 掃描 public/data/days/*.json，產生三份索引：
//   public/data/index.json          日期清單 + 每分類總數
//   public/data/by-category/<id>.json  某分類跨所有日期的例句
//   public/data/search.json         全部例句彙整成一份，供搜尋頁做中文模糊搜尋
//
// 在 dev / build 前自動執行（見 package.json 的 scripts）。
//
// 為什麼這幾份都是「產生的」而不是手動維護：
// 排程任務每天只要丟一個 days/YYYY-MM-DD.json 進來就好，索引由建置流程自己算出來，
// 不會發生「忘記更新索引」或「索引與實際資料對不上」這種問題。
// 三者都列在 .gitignore，不進版控、不會造成 commit 雜訊。
//
// by-category 的存在理由：日檔是唯一真實來源，但分類頁要「跨所有天數看某個分類」，
// 若沒有這份索引，分類頁就得抓下每一個日檔（現在 15 個、一年後 365 個）才能組出畫面。
// search.json 同理：搜尋頁要「跨所有天數、所有分類」比對，不可能即時抓下每個日檔；
// 彙整成一份讓搜尋頁只發一次請求、其餘比對都在瀏覽器端完成。為了壓低傳輸量與解析負擔，
// 這份刻意不做縮排（compact），與 index / by-category 的可讀性排版不同。
// 用建置時間換取執行時間：例句資料在 dist 裡存了多份是刻意的取捨。
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DAYS_DIR = resolve(ROOT, 'public/data/days')
const OUT = resolve(ROOT, 'public/data/index.json')
const CAT_DIR = resolve(ROOT, 'public/data/by-category')
const SEARCH_OUT = resolve(ROOT, 'public/data/search.json')

mkdirSync(DAYS_DIR, { recursive: true })
// 整個重建，避免分類被移除後留下永遠不會更新的孤兒檔
rmSync(CAT_DIR, { recursive: true, force: true })
mkdirSync(CAT_DIR, { recursive: true })

const files = readdirSync(DAYS_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()

const days = []
const categoryCounts = {}
const byCategory = {}
// files 由舊到新。dayGroups 依相同順序保存每天的句子，最後反轉即可得到「新到舊」的搜尋清單。
const dayGroups = []
let total = 0

for (const file of files) {
  const day = JSON.parse(readFileSync(resolve(DAYS_DIR, file), 'utf8'))
  const sentences = day.sentences || []

  days.push({
    date: day.date,
    theme: day.theme,
    // 用實際句數，不用檔案裡宣告的 count，避免兩者不一致時索引說謊
    count: sentences.length,
  })

  for (const s of sentences) {
    if (!s.category) continue
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1
    ;(byCategory[s.category] ||= []).push(s)
  }
  dayGroups.push(sentences)
  total += sentences.length
}

// days 由舊到新；前端要顯示最新在前時自行反轉，與舊版 archive.json 的處理方式一致
const index = { days, categoryCounts, total }

writeFileSync(OUT, JSON.stringify(index, null, 2) + '\n')

// 每個分類一份，句子維持與日檔完全相同的形狀（含 id / date），
// 分類頁才能沿用同一個卡片元件、收藏 id 也才會一致
for (const [catId, sentences] of Object.entries(byCategory)) {
  writeFileSync(
    resolve(CAT_DIR, `${catId}.json`),
    JSON.stringify({ category: catId, count: sentences.length, sentences }, null, 2) + '\n'
  )
}

// 搜尋索引：全部例句彙整成一份，新到舊排列（搜尋結果預設也是新的在前）。
// 句子維持與日檔完全相同的形狀，搜尋頁才能沿用同一個 SentenceCard、收藏 id 也一致。
// compact 輸出（不縮排）：這份會隨天數線性成長，壓低傳輸與解析成本。
const searchSentences = dayGroups.slice().reverse().flat()
writeFileSync(
  SEARCH_OUT,
  JSON.stringify({ count: searchSentences.length, sentences: searchSentences }) + '\n'
)

console.log(`索引已產生：${days.length} 天 / ${total} 句 → public/data/index.json`)
console.log(`分類索引已產生：${Object.keys(byCategory).length} 個分類 → public/data/by-category/`)
console.log(`搜尋索引已產生：${searchSentences.length} 句 → public/data/search.json`)
