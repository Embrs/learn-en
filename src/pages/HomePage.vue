<script setup vapor>
import { ref, computed, onMounted } from 'vue'
import { fetchIndex } from '../lib/data.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

const days = ref([])
const state = ref('loading') // loading | ready | error

// index.json 的 days 是由舊到新，首頁要最新的在最上面
const daysNewestFirst = computed(() => days.value.slice().reverse())

useDocumentTitle('每日英文・家庭生活')

onMounted(async () => {
  try {
    const index = await fetchIndex()
    days.value = index.days || []
    state.value = 'ready'
  } catch (e) {
    state.value = 'error'
  }
})
</script>

<template>
  <div class="page">
    <h1>每日英文・家庭生活</h1>
    <div class="tip">每天早上自動產生20句新的家庭生活英文例句（涵蓋20種常見情境），附中文翻譯、IPA音標、單字解析，並可點擊播放語音朗讀。點句子或單字旁的 ☆ 可以收藏；也可以到「🗂 分類」依主題瀏覽例句。</div>

    <!-- 這個 h2 的樣式在舊版是 inline style，CSS 檔裡沒有任何 h2 規則。
         照抄是刻意的：拿掉會退回瀏覽器預設（約 24px）而比 h1(21px) 還大，標題階層會反過來；
         搬進 CSS 檔又會讓其他頁面的 h2 意外吃到 16px。 -->
    <h2 style="font-size:16px;margin:20px 0 10px;">歷史例句</h2>

    <ul class="day-list" id="dayList">
      <li v-if="state === 'loading'">載入中...</li>
      <li v-else-if="state === 'error'">讀取歸檔失敗</li>
      <li v-else-if="!daysNewestFirst.length">尚無資料</li>
      <template v-else>
        <li v-for="d in daysNewestFirst" :key="d.date">
          <RouterLink :to="`/day/${d.date}`">
            <span class="day-info">
              <span class="date">{{ d.date }}</span>
              <span class="theme">{{ d.theme }}・{{ d.count }}句</span>
            </span>
            <span class="chevron">›</span>
          </RouterLink>
        </li>
      </template>
    </ul>
  </div>
</template>
