<script setup vapor>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { bannerVisible, canPrompt, dismissInstallBanner, promptInstall } from '../lib/install.js'

const root = ref(null)

// 橫幅是 fixed 在畫面底部的，會蓋住頁面最後一段內容，所以要把 body 底部墊高一個橫幅的高度。
//
// ⚠️ 一定要 immediate：iOS 不會觸發 beforeinstallprompt，bannerVisible 是在 main.js 的
// initInstallBanner() 裡（掛載前）就被設成 true 的。少了 immediate，watch 等不到 false→true
// 的變化就永遠不會執行，iOS 上橫幅會直接蓋住最後一張例句卡。
// （Chrome 因為是掛載後才觸發事件而剛好會動，所以這個 bug 只在 iOS 上出現。）
watch(bannerVisible, async (visible) => {
  if (visible) {
    await nextTick()
    document.body.style.paddingBottom = (root.value?.offsetHeight || 0) + 'px'
  } else {
    document.body.style.paddingBottom = ''
  }
}, { immediate: true })

onUnmounted(() => { document.body.style.paddingBottom = '' })
</script>

<template>
  <div v-if="bannerVisible" ref="root" id="installBanner" class="install-banner">
    <!-- 支援 beforeinstallprompt 的瀏覽器（Chrome／Edge 等）：直接給一個安裝按鈕 -->
    <div v-if="canPrompt" class="install-inner">
      <div class="install-text">📲 把「每日英文」加到主畫面，像 App 一樣一鍵開啟</div>
      <div class="install-actions">
        <button class="primary" id="installNowBtn" @click="promptInstall">加入主畫面</button>
        <button class="secondary" id="installDismissBtn" @click="dismissInstallBanner">之後再說</button>
      </div>
    </div>
    <!-- iOS Safari 沒有安裝 API，只能教使用者手動操作 -->
    <div v-else class="install-inner">
      <div class="install-text">📲 把「每日英文」加到主畫面：點分享鈕 <span class="install-icon">⬆️</span> → 「加入主畫面」</div>
      <div class="install-actions">
        <button class="secondary" id="installDismissBtn" @click="dismissInstallBanner">知道了</button>
      </div>
    </div>
  </div>
</template>
