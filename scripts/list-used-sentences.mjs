// 列出目前所有已使用過的英文句子，給每日排程任務做「避免重複」用。
//
// 舊版流程是把整份 sentences.json（120KB）讀進來比對；拆成日檔之後，
// 排程任務不必再逐一開 15+ 個檔案，只要跑這個腳本就能拿到一份純句子清單。
//
// 用法：
//   node scripts/list-used-sentences.mjs            # 一行一句
//   node scripts/list-used-sentences.mjs --json     # JSON 陣列
//   node scripts/list-used-sentences.mjs --stats    # 只看統計（天數/句數/各分類數）
//   node scripts/list-used-sentences.mjs --check <候選檔>
//        # 去重比對「留在程式端」：讀候選檔，只印出與既有語料重複的句子。
//        # 這樣排程任務不必把整份（會逐日成長的）已用句清單載進 context，token 成本
//        # 與累積天數幾乎無關。候選檔可為：
//        #   - 字串陣列          ["Sentence one.", "Sentence two."]
//        #   - 日檔形狀的物件    { "sentences": [ { "en": "..." }, ... ] }
//        #   - 上述句子物件的陣列 [ { "en": "..." }, ... ]
//        # 若候選檔本身就是 days/ 底下的某個日檔（例如剛寫好的 TODAY.json），
//        # 比對時會自動把它排除，不會自己跟自己撞。
//        # 有重複 → 印出 { "duplicates": [...] } 且 exit code = 1；
//        # 無重複 → 印出 { "duplicates": [] } 且 exit code = 0。
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DAYS_DIR = resolve(ROOT, 'public/data/days')

if (!existsSync(DAYS_DIR)) {
  console.error(`找不到資料目錄：${DAYS_DIR}`)
  process.exit(1)
}

// 正規化：去頭尾空白、壓縮中間空白、轉小寫、去尾端標點。
// 去重與相似判斷都以正規化後的字串為準（原句仍保留給輸出用）。
function normalize(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.!?…]+$/, '')
}

// 從候選資料中萃取英文句子字串，支援三種形狀（見檔頭說明）。
function extractSentences(data) {
  if (Array.isArray(data)) {
    return data.map(x => (typeof x === 'string' ? x : x && x.en)).filter(Boolean)
  }
  if (data && Array.isArray(data.sentences)) {
    return data.sentences.map(s => s && s.en).filter(Boolean)
  }
  return []
}

// 讀取 days/ 底下所有日檔；可指定 excludePath 排除某個檔（避免候選檔自己跟自己比對）。
function loadCorpus(excludePath) {
  const files = readdirSync(DAYS_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()

  const sentences = []
  const byCategory = {}

  for (const file of files) {
    const full = resolve(DAYS_DIR, file)
    if (excludePath && full === excludePath) continue
    const day = JSON.parse(readFileSync(full, 'utf8'))
    for (const s of day.sentences || []) {
      sentences.push(s.en)
      if (s.category) byCategory[s.category] = (byCategory[s.category] || 0) + 1
    }
  }
  return { files, sentences, byCategory }
}

// --check <候選檔>：去重比對在程式端完成，只回報衝突。
const checkIdx = process.argv.indexOf('--check')
if (checkIdx !== -1) {
  const candPath = process.argv[checkIdx + 1]
  if (!candPath) {
    console.error('用法：node scripts/list-used-sentences.mjs --check <候選檔>')
    process.exit(2)
  }
  const candFull = resolve(process.cwd(), candPath)
  if (!existsSync(candFull)) {
    console.error(`找不到候選檔：${candFull}`)
    process.exit(2)
  }

  const candidates = extractSentences(JSON.parse(readFileSync(candFull, 'utf8')))
  // 若候選檔就是 days/ 裡的日檔，比對語料時把它排除，避免自我撞句。
  const { sentences: corpus } = loadCorpus(candFull)
  const usedSet = new Set(corpus.map(normalize))

  // 候選內部若彼此重複也要抓出來。
  const seen = new Set()
  const duplicates = []
  for (const en of candidates) {
    const key = normalize(en)
    if (usedSet.has(key)) duplicates.push({ en, reason: '與既有語料重複' })
    else if (seen.has(key)) duplicates.push({ en, reason: '候選清單內部重複' })
    seen.add(key)
  }

  console.log(JSON.stringify({ checked: candidates.length, duplicates }, null, 2))
  process.exit(duplicates.length ? 1 : 0)
}

// 其餘模式：維持原本輸出（會載入全部句子）。
const { files, sentences, byCategory } = loadCorpus()

if (process.argv.includes('--stats')) {
  console.log(JSON.stringify({ days: files.length, sentences: sentences.length, byCategory }, null, 2))
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(sentences, null, 2))
} else {
  console.log(sentences.join('\n'))
}
