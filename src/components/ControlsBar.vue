<script setup vapor>
import { rate, speak } from '../lib/speech.js'

// 綁的是 input 而非 change：拖動過程中即時更新數字並存檔（拖到一半離開頁面也已存好）。
// rate 是跨頁共享狀態，所以收藏頁、分類頁的播放也會套用這裡調整的語速。
function onInput(e) {
  rate.value = e.target.value
}
</script>

<template>
  <!--
    .controls 容器無條件渲染。舊版是把 class 寫死在 html、由 JS 填內容，
    所以 JS 執行前就先佔好位；若這裡改成 v-if，下方例句列表會在初始化時上下跳動。
  -->
  <div class="controls">
    <span>🔊 語速：</span>
    <!--
      範圍 0.6~1.2、step 0.05 是為了親子英語情境刻意收窄的，不要「放寬成 0.5~2.0 比較實用」。
      預設 0.88 其實不在 step 網格上（0.6+n×0.05 只會是 x.x0/x.x5），所以首次載入顯示 0.88、
      使用者一拖就會跳到 0.85 或 0.90 且回不去——這是既有行為，不是 bug。
    -->
    <input
      type="range"
      id="rateRange"
      min="0.6"
      max="1.2"
      step="0.05"
      :value="rate"
      @input="onInput"
    >
    <span id="rateVal">{{ rate }}</span>
    <button class="play secondary" @click="speak('Hi there, how does this voice sound to you?')">試聽</button>
  </div>
</template>
