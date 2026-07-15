<script setup vapor>
import SiteHeader from './components/SiteHeader.vue'
import InAppBanner from './components/InAppBanner.vue'
import InstallBanner from './components/InstallBanner.vue'
import ToastHost from './components/ToastHost.vue'
</script>

<template>
  <!-- 內建瀏覽器提示放在最上面（舊版是 document.body.prepend） -->
  <InAppBanner />
  <SiteHeader />
  <RouterView />
  <!-- 安裝提示是 fixed 在畫面底部，toast 也是浮層，兩者都不參與版面 -->
  <InstallBanner />
  <ToastHost />
</template>
