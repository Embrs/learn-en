# 📚 每日英文・家庭生活

每天自動產生 20 句「家庭生活」主題的英文例句，附中文翻譯、IPA 音標、單字解析與語音朗讀，方便全家人一起練習英文。

🔗 線上網址：https://embrs.github.io/learn-en/

## 功能

- **每日例句**：每天早上自動生成 20 句家庭生活情境的英文例句，涵蓋 20 種與小孩對話常見分類（生活起居、用餐、洗澡睡前、出遊、公園、上學、功課、玩具分享、情緒安撫、管教規矩、讚美鼓勵、安全提醒、健康就醫、親戚拜訪、朋友社交、禮貌用語、天氣穿著、3C螢幕時間、節慶慶祝、睡前故事），每天每個分類各一句，中英對照 + IPA 音標，句子盡量不重複。
- **分類瀏覽**：「🗂 分類」分頁可依 20 個分類篩選，跨所有日期一次看到某個主題的所有例句，方便針對性複習。
- **語音朗讀**：點擊「▶ 播放整句」或單字旁的「🔊」即可朗讀，固定使用 Samantha 語音，並針對 Safari／Chrome 個別修正過相容性問題（同步播放、GC 導致靜音等）。
- **收藏功能**：點 ☆ 可收藏喜歡的句子或單字，收藏頁可統一複習、播放、取消收藏。
- **歷史例句**：首頁列出所有歷史日期，點整列即可進入當天內容。
- **內建瀏覽器偵測**：偵測到 LINE／Facebook／Instagram／WeChat 等內建瀏覽器（無法使用語音朗讀）時，會提示改用預設瀏覽器開啟。
- **PWA**：可加入主畫面像 App 一樣開啟。

## 技術

Vue 3.6（**Vapor 模式**）+ vue-router 的 SPA，用 Vite 建置，部署於 GitHub Pages。語音朗讀使用瀏覽器內建 Web Speech API（`speechSynthesis`），無後端、無資料庫。

> ⚠️ Vapor 模式目前只存在於 Vue 3.6 beta（npm 的 `latest` 仍是不含 Vapor 的 3.5.x）。
> `package.json` 因此**鎖定精確版本**（不用 `^`），避免 beta 之間的破壞性變更。
> 也因為 prerelease 版號不符合 vue-router／plugin-vue 的 `^3.5.x` peer 範圍，
> 專案根目錄有 `.npmrc` 設定 `legacy-peer-deps=true`，否則 `npm ci` 會直接失敗。
> 等 3.6 正式版發布後，這兩個限制都可以移除。

因為 vue-router 是 vdom 元件，Vapor app 需要 `vaporInteropPlugin` 才能使用它，等於同時載入 Vapor 與 vdom 兩套 runtime（bundle 約 165 KB / gzip 61 KB）。

## 開發

```bash
npm install     # 需要 .npmrc 的 legacy-peer-deps（見上）
npm run dev     # 本機開發
npm run build   # 產生 dist/
```

## 內容如何更新

由排程任務每天自動產生（任務定義在本 repo 之外：`~/Documents/Claude/Scheduled/daily-english-sentences/SKILL.md`）：

1. 讀 `public/data/categories.json` 取得 20 個分類。
2. 用 `grep -h '"en":' public/data/days/*.json` 一次撈出所有已使用的句子，避免重複。
3. **只新增一個檔案** `public/data/days/YYYY-MM-DD.json`，然後 commit + push 到 `main`。
4. GitHub Actions 自動 build 並部署（`.github/workflows/deploy.yml`）。

排程端不需要安裝 node、也不需要跑 build——例句資料是 runtime fetch 的靜態 JSON，不會被打包進 bundle。

## 專案結構

```
index.html                 SPA 進入點（build 時會複製一份成 404.html 給 GitHub Pages 當 fallback）
vite.config.js             base=/learn-en/、SPA fallback
src/
  main.js                  掛載 Vapor app、註冊 service worker
  router.js                路由 + 舊網址相容 redirect
  App.vue
  pages/                   HomePage / CategoriesPage / FavoritesPage / DayPage
  components/              SiteHeader / SentenceCard / ControlsBar / InstallBanner / InAppBanner / ToastHost
  lib/                     speech（語音）/ favorites（收藏）/ data（資料讀取）/ categories / toast / install / platform
  styles/style.css         樣式（沿用改版前的 CSS，未改動）
public/
  data/
    categories.json        20 個分類的定義（id / 中文 / icon）— 分類的唯一來源
    days/YYYY-MM-DD.json   每日 20 句（**唯一的例句真實來源**）
    index.json             ⚙️ 建置產生：日期索引 + 每分類總數（.gitignore，不進版控）
    by-category/<id>.json  ⚙️ 建置產生：某分類跨所有日期的例句（.gitignore，不進版控）
  manifest.json / sw.js / icons/
scripts/
  build-data-index.mjs     從 days/*.json 產生上面兩個索引（dev / build 前自動執行）
  list-used-sentences.mjs  列出所有已使用的句子（給排程任務去重用的備援工具）
.github/workflows/deploy.yml   push 到 main → 自動 build + 部署
```

### 資料設計

`public/data/days/*.json` 是**唯一的真實來源**；`index.json` 與 `by-category/` 都是建置時從日檔推導出來的衍生檔（因此列在 `.gitignore`，不會有「忘記更新索引」或索引與資料不同步的問題）。

`by-category/` 存在的理由：日檔讓「單日頁」只需載入 12 KB（改版前要抓整份 120 KB 的 `sentences.json`），但分類頁要「跨所有天數看某個分類」，沒有這份索引就得抓下每一個日檔（現在 15 個、一年後 365 個）。用建置時間換執行時間，分類頁只抓 1 個檔（約 8 KB）。

### 網址相容

改版前的 `index.html`／`categories.html`／`favorites.html`／`days/day.html?date=YYYY-MM-DD` 都會被 `src/router.js` 的 redirect 導到對應的新路由（`/`／`/categories`／`/favorites`／`/day/:date`），舊書籤不會失效。
