<script setup vapor>
import { computed } from 'vue'
import { speak } from '../lib/speech.js'
import { isFavorited, toggleFavorite } from '../lib/favorites.js'
import { categoryInfo } from '../lib/categories.js'

const props = defineProps({
  item: { type: Object, required: true },
  // 卡片左上角的標籤：單日頁是「第 N 句」，分類頁是日期
  label: { type: String, required: true },
  // 分類頁已經用分類分組了，那裡會關掉分類徽章
  showCategory: { type: Boolean, default: true },
})

// 收藏 id 直接用句子自己的 id。
// 舊版是用 `${dateId}-${index + 1}` 現算，結果永遠等於 item.id——因為每天固定 20 句、
// 尾碼剛好等於陣列位置 +1。改用 item.id 產生的值完全相同（既有收藏不受影響），
// 但不再依賴那個巧合：哪天某日的句數不是 20，舊寫法的 id 會悄悄錯位、收藏跟著錯亂。
const sentId = computed(() => props.item.id)

const cat = computed(() => categoryInfo(props.item.category))

// ⚠️ 事件處理器必須是同步的，中間不能有 await／nextTick：
// Safari 要求 speechSynthesis.speak() 在使用者手勢的同一個同步呼叫堆疊中發生，
// 否則會靜默擋掉（不報錯、不發聲）。
function playSentence() {
  speak(props.item.en)
}

function toggleSentence() {
  toggleFavorite({
    id: sentId.value,
    type: 'sentence',
    en: props.item.en,
    zh: props.item.zh,
    ipa: props.item.ipa,
    date: props.item.date,
  })
}

function vocabId(vi) {
  return `${sentId.value}-v${vi + 1}`
}

function toggleVocab(v, vi) {
  toggleFavorite({
    id: vocabId(vi),
    type: 'vocab',
    w: v.w,
    pos: v.pos,
    ipa: v.ipa,
    zh: v.zh,
    date: props.item.date,
    sentenceEn: props.item.en,
  })
}
</script>

<template>
  <div class="card">
    <div class="card-top">
      <div class="card-top-labels">
        <span class="num">{{ label }}</span>
        <span v-if="showCategory && item.category" class="cat-badge">{{ cat.icon }} {{ cat.zh }}</span>
      </div>
      <button
        class="star"
        :class="{ active: isFavorited(sentId) }"
        @click="toggleSentence"
      >{{ isFavorited(sentId) ? '★' : '☆' }}</button>
    </div>

    <div class="sentence">{{ item.en }}</div>
    <div class="ipa">{{ item.ipa }}</div>
    <div class="zh">{{ item.zh }}</div>

    <button class="play" @click="playSentence">▶ 播放整句</button>

    <div class="vocab-list">
      <div v-for="(v, vi) in item.vocab || []" :key="vocabId(vi)" class="vocab-item">
        <button class="mini play-mini" @click="speak(v.w)">🔊</button>
        <div class="vocab-text">
          <div class="vocab-word-row">
            <span class="vocab-word">{{ v.w }}</span>
            <span class="vocab-pos">{{ v.pos }}</span>
          </div>
          <div class="vocab-meta-row">
            <span class="vocab-ipa">{{ v.ipa }}</span>
            <span class="vocab-zh">{{ v.zh }}</span>
          </div>
        </div>
        <button
          class="star mini"
          :class="{ active: isFavorited(vocabId(vi)) }"
          @click="toggleVocab(v, vi)"
        >{{ isFavorited(vocabId(vi)) ? '★' : '☆' }}</button>
      </div>
    </div>
  </div>
</template>
