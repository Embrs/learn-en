<script setup vapor>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { fetchIndex, fetchCategorySentences } from '../lib/data.js'
import { categories } from '../lib/categories.js'
import SentenceCard from '../components/SentenceCard.vue'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

// 每批次渲染幾句，避免分類句數變多時一次塞進大量 DOM 造成卡頓
const CAT_PAGE_SIZE = 20

const route = useRoute()

const counts = ref({})
const indexState = ref('loading') // loading | ready | error

const matches = ref([])
const renderedCount = ref(0)
const resultState = ref('idle') // idle | loading | ready | error

const grid = ref(null)
const sentinel = ref(null)
let observer = null

useDocumentTitle('分類瀏覽・每日英文')

// 分類選擇沿用 hash（/categories#daily-routine），與舊版 categories.html#daily-routine 一致。
// 認不得的 hash 一律當成「沒選分類」。
const activeCat = computed(() => {
  const id = decodeURIComponent((route.hash || '').replace('#', ''))
  return categories.value.some(c => c.id === id) ? id : null
})

const activeInfo = computed(() => categories.value.find(c => c.id === activeCat.value))
const visibleItems = computed(() => matches.value.slice(0, renderedCount.value))

// 分類數量統計改由 index.json 提供（建置時從日檔算好），不必再把所有例句抓下來現算
fetchIndex()
  .then(index => { counts.value = index.categoryCounts || {}; indexState.value = 'ready' })
  .catch(() => { indexState.value = 'error' })

function stopObserving() {
  if (observer) { observer.disconnect(); observer = null }
}

function loadMoreBatch() {
  renderedCount.value = Math.min(renderedCount.value + CAT_PAGE_SIZE, matches.value.length)
  if (renderedCount.value >= matches.value.length) stopObserving()
}

async function startObserving() {
  await nextTick()
  if (!sentinel.value || renderedCount.value >= matches.value.length) return
  stopObserving()
  // rootMargin 400px：捲到接近底部前就先載下一批，使用者不會看到空白等待
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMoreBatch()
  }, { rootMargin: '400px' })
  observer.observe(sentinel.value)
}

watch(activeCat, async (catId) => {
  stopObserving()
  matches.value = []
  renderedCount.value = 0

  if (!catId) {
    resultState.value = 'idle'
    return
  }

  resultState.value = 'loading'
  try {
    const data = await fetchCategorySentences(catId)
    // 最新的在前面（by-category 檔是由舊到新）
    matches.value = (data.sentences || []).slice().reverse()
    renderedCount.value = Math.min(CAT_PAGE_SIZE, matches.value.length)
    resultState.value = 'ready'
    startObserving()
  } catch (e) {
    resultState.value = 'error'
  }

  // 切成一排橫向捲動的版面需要先讓瀏覽器完成排版，才能算出正確的捲動位置，
  // 不然選到後面的分類時，選到的藥丸可能還在看不到的地方。
  await nextTick()
  requestAnimationFrame(() => {
    const el = grid.value?.querySelector('.cat-chip.active')
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  })
}, { immediate: true })

onUnmounted(stopObserving)
</script>

<template>
  <div class="page">
    <h1>🗂 分類瀏覽</h1>
    <div class="tip">選一個分類，就能看到目前所有天數中屬於該分類的例句，方便依主題複習。</div>

    <!--
      還沒選分類：完整格狀方便瀏覽＋比較數量。
      已選分類：加上 compact 收成一排小藥丸，把畫面讓給例句內容。
    -->
    <div ref="grid" class="cat-grid" id="catGrid" :class="{ compact: !!activeCat }">
      <div v-if="indexState === 'loading'" class="tip">載入中...</div>
      <!--
        舊版在讀取失敗時，這裡的「載入中...」會永遠留著，同時下方又顯示「讀取失敗」，
        兩個互相矛盾的狀態並存。這裡明確改成失敗就不顯示「載入中」。
      -->
      <template v-else-if="indexState === 'ready'">
        <!--
          刻意不加 replace：舊版是 location.hash = c.id，會推入一筆瀏覽紀錄，
          所以選了分類後按上一頁能退回上一個分類、再按能退回未選分類的格狀畫面。
          加了 replace 會讓上一頁直接離開分類頁，與舊版不同。
        -->
        <RouterLink
          v-for="c in categories"
          :key="c.id"
          :to="`/categories#${c.id}`"
          class="cat-chip"
          :class="{ active: c.id === activeCat }"
        >
          <span class="cat-chip-icon">{{ c.icon }}</span>
          <span class="cat-chip-label">{{ c.zh }}</span>
          <span class="cat-chip-count">{{ counts[c.id] || 0 }}</span>
        </RouterLink>
      </template>
    </div>

    <div id="catResults">
      <div v-if="indexState === 'error'" class="tip">讀取例句資料失敗，請重新整理頁面再試一次。</div>
      <!-- 分類藥丸還沒載出來之前不要叫使用者「點選上方任一分類」——上面還是空的。
           舊版此時上下兩區也都是「載入中...」。 -->
      <div v-else-if="indexState === 'loading'" class="tip">載入中...</div>
      <div v-else-if="resultState === 'idle'" class="tip">👆 點選上方任一分類，就能看到目前所有天數中屬於該分類的例句。</div>
      <div v-else-if="resultState === 'loading'" class="tip">載入中...</div>
      <div v-else-if="resultState === 'error'" class="tip">讀取例句資料失敗，請重新整理頁面再試一次。</div>
      <template v-else>
        <div class="cat-results-heading">{{ activeInfo?.icon }} {{ activeInfo?.zh }}・共 {{ matches.length }} 句</div>
        <div v-if="!matches.length" class="tip">這個分類目前還沒有例句。</div>
        <template v-else>
          <div>
            <!-- 分類頁已經用分類分組了，卡片上不再重複顯示分類徽章；標籤改用日期 -->
            <SentenceCard
              v-for="item in visibleItems"
              :key="item.id"
              :item="item"
              :label="item.date"
              :show-category="false"
            />
          </div>
          <div v-if="renderedCount < matches.length" ref="sentinel" class="load-more-sentinel"></div>
        </template>
      </template>
    </div>
  </div>
</template>
