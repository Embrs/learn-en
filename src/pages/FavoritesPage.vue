<script setup vapor>
import { speak } from '../lib/speech.js'
import { favoritesNewestFirst, toggleFavorite } from '../lib/favorites.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

useDocumentTitle('我的收藏・每日英文')

// 取消收藏後清單會自己更新（favorites 是響應式的），不必手動重新渲染整頁
function remove(item) {
  toggleFavorite(item)
}
</script>

<template>
  <div class="page">
    <h1>⭐ 我的收藏</h1>
    <div class="tip">收藏內容儲存在這個瀏覽器裡（本機記錄，換裝置或清除瀏覽器資料會消失）。</div>

    <div id="favList">
      <div v-if="!favoritesNewestFirst.length" class="tip">目前還沒有收藏，去每日例句頁面點 ☆ 收藏喜歡的句子或單字吧！</div>

      <div v-for="item in favoritesNewestFirst" :key="item.id" class="card fav-card">
        <!-- 收藏存的是快照，所以這裡顯示的是「收藏當下」的內容，不會被之後的資料更新改掉 -->
        <template v-if="item.type === 'sentence'">
          <div class="card-top"><span class="tag">句子・{{ item.date }}</span></div>
          <div class="sentence">{{ item.en }}</div>
          <div class="ipa">{{ item.ipa }}</div>
          <div class="zh">{{ item.zh }}</div>
        </template>
        <template v-else>
          <div class="card-top"><span class="tag">單字・{{ item.date }}</span></div>
          <div class="sentence">{{ item.w }} <span class="vocab-pos">{{ item.pos }}</span></div>
          <div class="ipa">{{ item.ipa }}</div>
          <div class="zh">{{ item.zh }}</div>
        </template>

        <div class="fav-actions">
          <button class="play" @click="speak(item.type === 'sentence' ? item.en : item.w)">▶ 播放</button>
          <button class="play secondary" @click="remove(item)">取消收藏</button>
        </div>
      </div>
    </div>
  </div>
</template>
