// 列出目前所有已使用過的英文句子，給每日排程任務做「避免重複」用。
//
// 舊版流程是把整份 sentences.json（120KB）讀進來比對；拆成日檔之後，
// 排程任務不必再逐一開 15+ 個檔案，只要跑這個腳本就能拿到一份純句子清單。
//
// 用法：
//   node scripts/list-used-sentences.mjs            # 一行一句
//   node scripts/list-used-sentences.mjs --json     # JSON 陣列
//   node scripts/list-used-sentences.mjs --stats    # 只看統計（天數/句數/各分類數）
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DAYS_DIR = resolve(ROOT, 'public/data/days')

if (!existsSync(DAYS_DIR)) {
  console.error(`找不到資料目錄：${DAYS_DIR}`)
  process.exit(1)
}

const files = readdirSync(DAYS_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()

const sentences = []
const byCategory = {}

for (const file of files) {
  const day = JSON.parse(readFileSync(resolve(DAYS_DIR, file), 'utf8'))
  for (const s of day.sentences || []) {
    sentences.push(s.en)
    if (s.category) byCategory[s.category] = (byCategory[s.category] || 0) + 1
  }
}

if (process.argv.includes('--stats')) {
  console.log(JSON.stringify({ days: files.length, sentences: sentences.length, byCategory }, null, 2))
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(sentences, null, 2))
} else {
  console.log(sentences.join('\n'))
}
