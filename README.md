# 📚 每日英文・家庭生活

一個輕量的靜態網站，每天自動產生 20 句「家庭生活」主題的英文例句，附中文翻譯、IPA 音標、單字解析與語音朗讀，方便全家人一起練習英文。

🔗 線上網址：https://embrs.github.io/learn-en/

## 功能

- **每日例句**：每天早上自動生成 20 句家庭生活情境的英文例句（起床、上學、吃飯、玩耍、睡前等），中英對照 + IPA 音標，句子盡量不重複。
- **語音朗讀**：點擊「▶ 播放整句」或單字旁的「🔊」即可朗讀，固定使用 Samantha 語音，並針對 Safari／Chrome 個別修正過相容性問題（同步播放、GC 導致靜音等）。
- **收藏功能**：點 ☆ 可收藏喜歡的句子或單字，收藏頁可統一複習、播放、取消收藏。
- **歷史例句**：首頁列出所有歷史日期，點整列即可進入當天內容。
- **內建瀏覽器偵測**：偵測到 LINE／Facebook／Instagram／WeChat 等內建瀏覽器（無法使用語音朗讀）時，會提示改用預設瀏覽器開啟。

## 內容如何更新

內容由排程任務每天自動產生：讀取 `history.json` 避免重複句子，寫入新的 `days/YYYY-MM-DD.html` 與更新 `archive.json`，再推送到 `main` 分支，GitHub Pages 會自動部署最新版本。

## 專案結構

```
index.html          首頁，列出歷史例句
favorites.html       收藏頁
days/YYYY-MM-DD.html 各日例句內容
assets/style.css     樣式
assets/app.js        共用邏輯（語音、收藏、導覽列）
archive.json         歷史日期索引
history.json         已出現過的句子，用於去重
```

## 技術

純 HTML／CSS／JavaScript 靜態網站，語音朗讀使用瀏覽器內建 Web Speech API（`speechSynthesis`），無後端、無資料庫，部署於 GitHub Pages。
