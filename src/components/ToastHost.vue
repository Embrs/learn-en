<script setup vapor>
import { toastMessage, toastVisible } from '../lib/toast.js'
</script>

<template>
  <!--
    元素常駐、只切換 .show class——與舊版行為一致。
    刻意不用 v-if / <Transition>：舊版的 #toast 建立後永不移除，連續 toast 時只換文字、
    不重播淡入動畫；用 v-if 重建元素或包 <Transition> 都會變成每次重播。
  -->
  <div id="toast" class="toast" :class="{ show: toastVisible }">{{ toastMessage }}</div>
</template>
