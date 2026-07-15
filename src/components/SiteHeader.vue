<script setup vapor>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { favoriteCount } from '../lib/favorites.js'

const root = ref(null)
const route = useRoute()

// 沿用舊版的判斷規則：isHomePage = 不是收藏頁也不是分類頁。
// 所以單日頁（/day/:date）也算「首頁」而會高亮「🏠 首頁」——這是既有行為。
// 不能用 RouterLink 的 active-class：它比對的是路由記錄，/day/:date 與 / 是平行路由，
// 在單日頁時三個分頁會全部沒有高亮。
const isCat = computed(() => route.path.startsWith('/categories'))
const isFav = computed(() => route.path.startsWith('/favorites'))
const isHome = computed(() => !isCat.value && !isFav.value)

// 分類頁的分類選單要 sticky 貼齊在導覽列正下方，靠 CSS 變數 --header-h 定位。
// ⚠️ 量測對象必須是「真正 sticky 在 top:0 的那個元素」，也就是這個元件的根節點。
// CSS 對 --header-h 有 84px 的 fallback，所以量錯不會報錯，只會讓分類選單偏移幾 px，極難察覺。
function measure() {
  if (root.value) {
    document.documentElement.style.setProperty('--header-h', root.value.offsetHeight + 'px')
  }
}

onMounted(() => {
  measure()
  // 轉向或視窗改變時導覽列高度會變（.tabs 會換行），要重新量
  window.addEventListener('resize', measure)
})
onUnmounted(() => window.removeEventListener('resize', measure))
</script>

<template>
  <div ref="root" class="site-header">
    <div class="nav-inner">
      <div class="brand">📚 每日英文<span class="brand-sub">・家庭生活</span></div>
    </div>
    <nav class="tabs">
      <RouterLink to="/" class="tab-link" :class="{ active: isHome }">🏠 首頁</RouterLink>
      <RouterLink to="/categories" class="tab-link" :class="{ active: isCat }">🗂 分類</RouterLink>
      <RouterLink to="/favorites" class="tab-link" :class="{ active: isFav }">
        ⭐ 收藏<!--
        ⚠️ 徽章必須留在 <a> 內部：.tab-link 是 flex + justify-content:center，
        徽章靠 margin-left:6px 貼在文字右側，移到外面會脫離置中而錯位。

        也不能用 v-show：.fav-badge 的 CSS 本身就是 display:none，v-show 只會在
        「該顯示」時把 inline style 拿掉，於是又被 CSS 的 none 蓋回去，徽章永遠不出現。
        所以跟舊版一樣直接指定 inline-flex（flex 系列才會讓 align-items/justify-content 生效，
        11px 字才對得準 17px 的圓點）。
        --><span
          class="fav-badge"
          :style="{ display: favoriteCount > 0 ? 'inline-flex' : 'none' }"
        >{{ favoriteCount > 0 ? favoriteCount : '' }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
