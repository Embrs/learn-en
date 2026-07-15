import { watchEffect } from 'vue'

// 多頁面時期每個 html 有自己的 <title>，改成 SPA 之後切換路由不會自動更新，要各頁自己設。
// 接受字串或 getter，讓標題可以跟著資料變化（例如單日頁要等日期算出來）。
export function useDocumentTitle(title) {
  watchEffect(() => {
    document.title = typeof title === 'function' ? title() : title
  })
}
