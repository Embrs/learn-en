import { createVaporApp, vaporInteropPlugin } from 'vue'
import { router } from './router.js'
import App from './App.vue'
import { initCategories } from './lib/categories.js'
import { initInstallBanner } from './lib/install.js'
import './styles/style.css'

// ---------------- Service Worker（讓「加入主畫面／安裝」可以運作） ----------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // BASE_URL 是 '/learn-en/'。sw.js 放在 public/ 會被複製到網站根目錄底下的這個路徑，
    // scope 也因此涵蓋整個站台。
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}

// 分類清單要在掛載前載入完成：例句卡片渲染分類徽章時是同步取用的。
// 失敗也照樣掛載——只是徽章會退回顯示分類 id，不要因為缺一份定義就整站白畫面。
initCategories()
  .catch(() => {})
  .then(() => {
    initInstallBanner()

    // vaporInteropPlugin 讓 Vapor app 能使用 vdom 元件——vue-router 的
    // RouterView / RouterLink 就是 vdom 元件，少了這個外掛整個路由都無法運作。
    createVaporApp(App)
      .use(vaporInteropPlugin)
      .use(router)
      .mount('#app')
  })
