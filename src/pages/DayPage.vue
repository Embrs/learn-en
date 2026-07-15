<script setup vapor>
import { ref, computed, watch } from 'vue'
import { fetchDay } from '../lib/data.js'
import SentenceCard from '../components/SentenceCard.vue'
import ControlsBar from '../components/ControlsBar.vue'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

const props = defineProps({ date: { type: String, required: true } })

const items = ref([])
const state = ref('loading') // loading | ready | notfound | error

// 2026-07-15 → 2026年7月15日（月份/日期不補零，與舊版一致）
const dateLabel = computed(() => {
  const parts = props.date.split('-').map(n => parseInt(n, 10))
  return (parts.length === 3 && parts.every(n => !isNaN(n)))
    ? `${parts[0]}年${parts[1]}月${parts[2]}日`
    : props.date
})

const fullTitle = computed(() => `${dateLabel.value}・今日英文 20 句（家庭生活）`)
useDocumentTitle(() => fullTitle.value)

// 用 watch + immediate 而非 onMounted：SPA 裡從某一天切到另一天時元件會被重用，
// 只有 date 這個 prop 改變，onMounted 不會再跑一次。
watch(() => props.date, async (date) => {
  state.value = 'loading'
  try {
    const day = await fetchDay(date)
    const list = day.sentences || []
    if (!list.length) {
      state.value = 'notfound'
      return
    }
    items.value = list
    state.value = 'ready'
  } catch (e) {
    // 日檔不存在時靜態主機回 404，會落到這裡。舊版對「找不到這一天」與「讀取失敗」
    // 是兩段不同的文案，但拆成日檔之後這兩件事在網路層是同一個結果（抓不到檔案），
    // 所以統一顯示「找不到這一天」——日期打錯是遠比伺服器出錯更可能的原因。
    state.value = 'notfound'
  }
}, { immediate: true })
</script>

<template>
  <div class="page">
    <RouterLink class="back-link" to="/">← 回歷史列表</RouterLink>
    <h1 id="dayTitle">{{ fullTitle }}</h1>
    <div class="tip">點擊「▶ 播放整句」或單字旁的「🔊」朗讀，點 ☆ 可收藏喜歡的句子或單字。每句都標有分類，也可以到「🗂 分類」分頁依主題複習。</div>

    <ControlsBar />

    <div id="list">
      <div v-if="state === 'loading'" class="tip">載入中...</div>
      <div v-else-if="state === 'notfound'" class="tip">找不到這一天的例句，可能日期輸入有誤。</div>
      <div v-else-if="state === 'error'" class="tip">讀取例句資料失敗，請重新整理頁面再試一次。</div>
      <template v-else>
        <SentenceCard
          v-for="(item, i) in items"
          :key="item.id"
          :item="item"
          :label="`第 ${i + 1} 句`"
        />
      </template>
    </div>
  </div>
</template>
