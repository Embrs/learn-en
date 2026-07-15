import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 網站部署在 https://embrs.github.io/learn-en/ 這個子路徑底下，
// 所以資源路徑與 vue-router 的 history base 都必須帶 /learn-en/ 前綴。
const BASE = '/learn-en/'

// GitHub Pages 沒有伺服器端 rewrite：直接開 /learn-en/day/2026-07-15 這種深層網址時，
// 靜態主機找不到檔案就會回 404.html。把 index.html 複製成 404.html，
// 這些網址就會載入同一份 SPA，再由 vue-router 依網址決定要顯示哪一頁。
function spaFallbackPlugin() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [vue(), spaFallbackPlugin()],
  build: {
    outDir: 'dist',
    // 例句資料放在 public/data，會被原樣複製到 dist，不會進 bundle。
    // 這是排程任務「只改 JSON 就能更新內容」的關鍵。
    assetsInlineLimit: 0,
  },
})
