// 「加入主畫面／安裝」提示的狀態。
//
// beforeinstallprompt 可能在 Vue 掛載前就觸發，所以監聽器必須在模組載入時（而非元件 onMounted）
// 就註冊，否則會錯過事件、安裝按鈕永遠不出現。
import { ref } from 'vue'
import { isStandaloneApp, isIOSDevice, detectInApp } from './platform.js'

// 「之後再說／知道了」只記住 14 天（避免每次都跳出來，但也不會永久消失）。
const INSTALL_DISMISS_KEY = 'installBannerDismissedAt'
const INSTALL_DISMISS_DAYS = 14

let deferredInstallPrompt = null

export const canPrompt = ref(false)
export const bannerVisible = ref(false)

function shouldShow() {
  // 注意：瀏覽器沒有「使用者解除安裝了 PWA」這種事件可以監聽，所以「已安裝」這件事
  // 完全不寫進 localStorage，只靠 isStandaloneApp() 每次即時判斷——這樣如果之後把
  // App 從主畫面刪除，下次用一般瀏覽器打開網站時會自動再顯示提示，不會被卡住。
  if (isStandaloneApp()) return false
  if (detectInApp()) return false // 內建瀏覽器已經有自己的提示了，避免疊加

  let dismissedAt = 0
  try { dismissedAt = parseInt(localStorage.getItem(INSTALL_DISMISS_KEY) || '0', 10) || 0 } catch (e) {}
  const daysSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  if (dismissedAt && daysSinceDismiss < INSTALL_DISMISS_DAYS) return false

  // 其他瀏覽器沒有明確的安裝路徑，不特別提示避免誤導
  return canPrompt.value || isIOSDevice()
}

function refresh() {
  bannerVisible.value = shouldShow()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
    canPrompt.value = true
    refresh()
  })
  window.addEventListener('appinstalled', () => {
    bannerVisible.value = false
  })
}

// iOS 不會觸發 beforeinstallprompt，所以要在 app 啟動時主動判斷一次
export function initInstallBanner() {
  refresh()
}

export function dismissInstallBanner() {
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())) } catch (e) {}
  bannerVisible.value = false
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  try { await deferredInstallPrompt.userChoice } catch (e) {}
  deferredInstallPrompt = null
  canPrompt.value = false
  // 不記錄「之後再說」的冷卻時間：如果使用者按了安裝，appinstalled 會自動把 banner
  // 收掉；如果使用者在系統彈窗裡取消，也直接收掉這次的 banner 就好，不用額外懲罰。
  bannerVisible.value = false
}
