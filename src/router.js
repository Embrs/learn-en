import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import CategoriesPage from './pages/CategoriesPage.vue'
import FavoritesPage from './pages/FavoritesPage.vue'
import DayPage from './pages/DayPage.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  // 分類選擇沿用 hash（/categories#daily-routine），與舊版 categories.html#daily-routine 的網址語意一致
  { path: '/categories', name: 'categories', component: CategoriesPage },
  { path: '/favorites', name: 'favorites', component: FavoritesPage },
  { path: '/day/:date', name: 'day', component: DayPage, props: true },

  // ---------------- 舊網址相容 ----------------
  // 改版前的網址是實體 .html 檔。這些檔案在新版已不存在，直接開會落到 GitHub Pages 的
  // 404.html（就是同一份 SPA），再由下面的 redirect 導到對應的新路由。
  // 家人手機上很可能存著舊書籤，這幾條不能省。
  { path: '/index.html', redirect: '/' },
  { path: '/categories.html', redirect: to => ({ path: '/categories', hash: to.hash }) },
  { path: '/favorites.html', redirect: to => ({ path: '/favorites' }) },
  {
    path: '/days/day.html',
    redirect: to => {
      const date = to.query.date
      // 日期改用路由參數帶，要明確清掉 query，否則 vue-router 會把原本的 ?date= 一路留在網址上
      // 變成 /day/2026-07-12?date=2026-07-12
      return date ? { path: `/day/${date}`, query: {} } : { path: '/', query: {} }
    },
  },

  // 其他未知路徑一律回首頁（GitHub Pages 的 404.html fallback 會把任何路徑送進 SPA）
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  // BASE_URL 是 '/learn-en/'，與 vite.config.js 的 base 一致；
  // 兩者不同步的話所有路由連結都會失效。
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 上一頁/下一頁還原原本的捲動位置
    if (savedPosition) return savedPosition
    // 分類頁的 hash 是「選了哪個分類」，不是頁面錨點——不能拿去 scrollIntoView，
    // 那裡沒有對應 id 的元素，而且分類切換有自己的捲動處理。
    if (to.name === 'categories') {
      // 只有從別的頁面進來才回到頂端；同頁切換分類（只有 hash 變）不要把畫面拉走
      return from.name === 'categories' ? false : { top: 0 }
    }
    return { top: 0 }
  },
})
