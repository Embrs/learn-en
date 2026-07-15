<script setup vapor>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { fetchSearchIndex } from '../lib/data.js'
import SentenceCard from '../components/SentenceCard.vue'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import {
  searchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
} from '../lib/searchHistory.js'

// 每批次渲染幾句：搜尋可能命中大量結果，一次塞進整個列表會讓 DOM 過重而卡頓。
// 跟分類頁一樣用 IntersectionObserver 捲到底才續載。
const PAGE_SIZE = 20
// 輸入去抖：避免每打一個字就跑一次全量比對。中文輸入法組字期間也靠這個緩衝。
const DEBOUNCE_MS = 180
// 下拉選單最多列幾個常用關鍵字
const COMMON_LIMIT = 24
// 少數雖是片語、但不適合當關鍵字的功能詞，直接排除
const KEYWORD_STOP = new Set(['而不是', '你自己', '我自己'])

useDocumentTitle('搜尋例句・每日英文')

// index：[{ item, hay }]。hay 是「正規化後的可搜尋字串」，載入時算一次，
// 之後每次比對直接用，不必每個 keystroke 重算整份資料。
const index = ref([])
const loadState = ref('loading') // loading | ready | error
// 常用關鍵字：載入資料後從最常出現的單字中文解釋統計出來（資料驅動，不寫死）。
const commonKeywords = ref([])

const rawQuery = ref('')
const query = ref('') // 去抖後才更新，實際拿來比對的字串
let debounceTimer = null

const matches = ref([])
const renderedCount = ref(0)

const sentinel = ref(null)
let observer = null

// 下拉選單是否顯示（輸入框聚焦時顯示歷史與常用關鍵字）
const focused = ref(false)
let blurTimer = null

// 正規化：轉小寫、去掉空白與常見中英標點，讓「拉開 窗簾」「拉開窗簾」都能命中。
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。、！？；：「」『』（）〈〉《》,.!?;:()[\]{}'"~\-—…·／/]/g, '')
}

// 一句的可搜尋內容 = 中文整句 + 每個單字的中文解釋與英文詞 + 英文整句。
// 對應需求：中文模糊搜尋，順便也能用英文字或單字命中。
function haystack(s) {
  const vocab = (s.vocab || []).map(v => `${v.zh || ''}${v.w || ''}`).join('')
  return normalize(`${s.zh || ''}${vocab}${s.en || ''}`)
}

// 從資料統計常用關鍵字：以單字的中文解釋為來源，依出現次數排序取前幾名。
// 只留「比較可能被拿來搜尋」的實詞——名詞／動詞／片語，並排除：
//   - 形容詞／副詞等虛詞解釋（如「溫柔的」「大聲地」不適合當關鍵字）
//   - 含標點／括號的複合解釋（如「遠離、避開」「（遊戲）關卡」）
//   - 少數功能性片語（KEYWORD_STOP）
// pos 欄位是最直接的「常用度」訊號：具體名詞、動詞遠比形容詞好用來搜尋。
function buildCommonKeywords(sentences) {
  const freq = new Map()
  for (const s of sentences) {
    for (const v of s.vocab || []) {
      const zh = String(v.zh || '').trim()
      const pos = String(v.pos || '')
      if (zh.length < 2) continue
      if (KEYWORD_STOP.has(zh)) continue
      if (/[、，,。.／/（）()【】[\]「」『』〈〉《》~\-—・：:；;！!？?]/.test(zh)) continue
      if (/的$|地$/.test(zh)) continue
      if (/adj|adv|pron|int|prep|conj|num/.test(pos)) continue // 濾掉虛詞
      if (!/n\.|v\.|phr\./.test(pos)) continue                // 只留名詞／動詞／片語
      freq.set(zh, (freq.get(zh) || 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, COMMON_LIMIT)
    .map(([word]) => word)
}

fetchSearchIndex()
  .then(data => {
    const sentences = data.sentences || []
    index.value = sentences.map(item => ({ item, hay: haystack(item) }))
    commonKeywords.value = buildCommonKeywords(sentences)
    loadState.value = 'ready'
    runSearch(query.value)
  })
  .catch(() => { loadState.value = 'error' })

// 命中規則：查詢字串以空白切成多個詞，全部詞都要出現（AND），順序不拘。
function runSearch(q) {
  stopObserving()
  const terms = String(q || '').trim().split(/\s+/).map(normalize).filter(Boolean)
  if (!terms.length) {
    matches.value = []
    renderedCount.value = 0
    return
  }
  const res = []
  for (const entry of index.value) {
    if (terms.every(t => entry.hay.includes(t))) res.push(entry.item)
  }
  matches.value = res
  renderedCount.value = Math.min(PAGE_SIZE, res.length)
  startObserving()
}

// 輸入去抖
watch(rawQuery, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { query.value = v }, DEBOUNCE_MS)
})
// 去抖後的 query 變動才真正跑比對
watch(query, (q) => { if (loadState.value === 'ready') runSearch(q) })

const visibleItems = computed(() => matches.value.slice(0, renderedCount.value))
const hasQuery = computed(() => query.value.trim().length > 0)

// ---- 下拉選單（autocomplete）----
// 有輸入時，歷史與常用關鍵字都只留「包含目前輸入」的項目（輸入法組字期間也適用）。
function suggestFilter(list) {
  const q = normalize(rawQuery.value)
  if (!q) return list
  return list.filter(t => normalize(t).includes(q))
}
const filteredHistory = computed(() => suggestFilter(searchHistory.value))
// 常用關鍵字不重複顯示已在歷史裡的詞
const filteredCommon = computed(() => {
  const hist = new Set(searchHistory.value.map(t => t.trim().toLowerCase()))
  return suggestFilter(commonKeywords.value).filter(t => !hist.has(t.trim().toLowerCase()))
})
const showDropdown = computed(() =>
  focused.value && (filteredHistory.value.length > 0 || filteredCommon.value.length > 0)
)

// 立即套用某個關鍵字（點歷史／常用，或按 Enter）：略過去抖、記錄歷史、關閉下拉
function commit(term) {
  const q = String(term ?? rawQuery.value).trim()
  rawQuery.value = q
  if (debounceTimer) clearTimeout(debounceTimer)
  query.value = q
  if (q && loadState.value === 'ready') runSearch(q)
  if (q) addSearchHistory(q)
  focused.value = false
  inputEl.value?.blur()
}

// 刪除按鈕用 mousedown.prevent：避免點擊時輸入框先 blur 把下拉關掉，刪完仍停在下拉
function onDeleteHistory(term) {
  removeSearchHistory(term)
}
function onClearHistory() {
  clearSearchHistory()
}

function stopObserving() {
  if (observer) { observer.disconnect(); observer = null }
}
function loadMoreBatch() {
  renderedCount.value = Math.min(renderedCount.value + PAGE_SIZE, matches.value.length)
  if (renderedCount.value >= matches.value.length) stopObserving()
}
async function startObserving() {
  await nextTick()
  if (!sentinel.value || renderedCount.value >= matches.value.length) return
  stopObserving()
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMoreBatch()
  }, { rootMargin: '400px' })
  observer.observe(sentinel.value)
}

function clearQuery() {
  rawQuery.value = ''
  query.value = ''
  runSearch('')
  inputEl.value?.focus()
}

function onFocus() {
  if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
  focused.value = true
}
// 失焦稍等再關，讓下拉項目的點擊有時間觸發（行動裝置 tap 尤其需要）
function onBlur() {
  blurTimer = setTimeout(() => { focused.value = false }, 150)
}

const inputEl = ref(null)
onMounted(() => { inputEl.value?.focus() })
onUnmounted(() => {
  stopObserving()
  if (debounceTimer) clearTimeout(debounceTimer)
  if (blurTimer) clearTimeout(blurTimer)
})
</script>

<template>
  <div class="page">
    <h1>🔍 搜尋例句</h1>

    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input
          ref="inputEl"
          v-model="rawQuery"
          class="search-input"
          type="search"
          inputmode="search"
          enterkeyhint="search"
          placeholder="輸入中文關鍵字，例如：窗簾、刷牙、陽光"
          aria-label="搜尋例句"
          autocomplete="off"
          @focus="onFocus"
          @blur="onBlur"
          @keyup.enter="commit()"
        >
        <button
          v-if="rawQuery"
          class="search-clear"
          type="button"
          aria-label="清除"
          @mousedown.prevent
          @click="clearQuery"
        >✕</button>

        <!-- autocomplete 下拉：最近搜尋（可刪）＋ 常用關鍵字 -->
        <div v-if="showDropdown" class="suggest">
          <div v-if="filteredHistory.length" class="suggest-group">
            <div class="suggest-head">
              <span>最近搜尋</span>
              <button class="suggest-clear-all" type="button" @mousedown.prevent="onClearHistory">清除全部</button>
            </div>
            <div
              v-for="term in filteredHistory"
              :key="'h-' + term"
              class="suggest-row"
              @mousedown.prevent="commit(term)"
            >
              <span class="suggest-ico" aria-hidden="true">🕘</span>
              <span class="suggest-text">{{ term }}</span>
              <button
                class="suggest-del"
                type="button"
                aria-label="刪除這筆搜尋紀錄"
                @mousedown.prevent.stop="onDeleteHistory(term)"
              >✕</button>
            </div>
          </div>

          <div v-if="filteredCommon.length" class="suggest-group">
            <div class="suggest-head"><span>常用關鍵字</span></div>
            <div class="suggest-chips">
              <button
                v-for="kw in filteredCommon"
                :key="'c-' + kw"
                class="suggest-chip"
                type="button"
                @mousedown.prevent="commit(kw)"
              >{{ kw }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="searchResults">
      <div v-if="loadState === 'loading'" class="tip">載入例句資料中...</div>
      <div v-else-if="loadState === 'error'" class="tip">讀取例句資料失敗，請重新整理頁面再試一次。</div>

      <template v-else>
        <div v-if="!hasQuery" class="tip">
          輸入中文關鍵字就能搜尋目前所有天數的例句，會比對中文翻譯、單字解釋，也能用英文字搜尋。可用空白分隔多個關鍵字（例如「洗澡 水」）。
        </div>
        <template v-else>
          <div class="cat-results-heading">搜尋「{{ query.trim() }}」・共 {{ matches.length }} 句</div>
          <div v-if="!matches.length" class="tip">找不到符合的例句，換個關鍵字或用更短的詞試試看。</div>
          <template v-else>
            <div>
              <SentenceCard
                v-for="item in visibleItems"
                :key="item.id"
                :item="item"
                :label="item.date"
                :show-category="true"
              />
            </div>
            <div v-if="renderedCount < matches.length" ref="sentinel" class="load-more-sentinel"></div>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>
