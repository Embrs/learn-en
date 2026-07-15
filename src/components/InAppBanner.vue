<script setup vapor>
import { detectInApp, IN_APP_LABELS, copyLink } from '../lib/platform.js'
import { toast } from '../lib/toast.js'

// LINE／Facebook／Instagram／WeChat 的內建瀏覽器常常無法使用語音朗讀，提示改用預設瀏覽器開啟
const kind = detectInApp()
const label = kind ? IN_APP_LABELS[kind] : ''

function openExternal() {
  if (kind === 'line') {
    // LINE 認得這個查詢參數，會直接用系統預設瀏覽器重新開啟
    const url = location.href
    location.href = url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1'
  } else {
    // 其他 App 沒有這種機制，只能複製連結請使用者自己貼上
    copyLink()
    toast('已複製連結，請點右上角「⋯」選擇用瀏覽器開啟並貼上')
  }
}
</script>

<template>
  <div v-if="kind" class="inapp-banner">
    <div class="inapp-text">⚠️ 偵測到你正在 {{ label }} 內建瀏覽器中，語音朗讀可能無法使用</div>
    <div class="inapp-actions">
      <button class="primary" id="openExternalBtn" @click="openExternal">用瀏覽器開啟</button>
      <button class="secondary" id="copyLinkBtn" @click="copyLink">複製連結</button>
    </div>
  </div>
</template>
