# 📚 每日英文・家庭生活

一個輕量的靜態網站，每天自動產生 20 句「家庭生活」主題的英文例句，附中文翻譯、IPA 音標、單字解析與語音朗讀，方便全家人一起練習英文。

🔗 線上網址：https://embrs.github.io/learn-en/

## 功能

- **每日例句**：每天早上自動生成 20 句家庭生活情境的英文例句，涵蓋 20 種與小孩對話常見分類（生活起居、用餐、洗澡睡前、出遊、公園、上學、功課、玩具分享、情緒安撫、管教規矩、讚美鼓勵、安全提醒、健康就醫、親戚拜訪、朋友社交、禮貌用語、天氣穿著、3C螢幕時間、節慶慶祝、睡前故事），每天每個分類各一句，中英對照 + IPA 音標，句子盡量不重複。
- **分類瀏覽**：「🗂 分類」分頁可依 20 個分類篩選，跨所有日期一次看到某個主題的所有例句，方便針對性複習。
- **語音朗讀**：點擊「▶ 播放整句」或單字旁的「🔊」即可朗讀，固定使用 Samantha 語音，並針對 Safari／Chrome 個別修正過相容性問題（同步播放、GC 導致靜音等）。
- **收藏功能**：點 ☆ 可收藏喜歡的句子或單字，收藏頁可統一複習、播放、取消收藏。
- **歷史例句**：首頁列出所有歷史日期，點整列即可進入當天內容。
- **內建瀏覽器偵測**：偵測到 LINE／Facebook／Instagram／WeChat 等內建瀏覽器（無法使用語音朗讀）時，會提示改用預設瀏覽器開啟。

## 內容如何更新

內容由排程任務每天自動產生：讀取 `history.json` 避免重複句子，寫入新的 `days/YYYY-MM-DD.html` 與更新 `archive.json`，再推送到 `main` 分支，GitHub Pages 會自動部署最新版本。

## 專案結構

```
index.html           首頁，列出歷史例句
categories.html       分類瀏覽頁
favorites.html        收藏頁
days/YYYY-MM-DD.html  各日例句內容（20分類各一句）
assets/style.css      樣式
assets/app.js         共用邏輯（語音、收藏、分類、導覽列）
archive.json          歷史日期索引
sentences.json        所有例句彙總（含分類），供分類頁跨日期篩選用
categories.json       20個分類的定義（id / 中文 / icon）
history.json          已出現過的句子，用於去重
```

## 技術

純 HTML／CSS／JavaScript 靜態網站，語音朗讀使用瀏覽器內建 Web Speech API（`speechSynthesis`），無後端、無資料庫，部署於 GitHub Pages。
