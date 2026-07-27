# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm install     # 必須有 .npmrc 的 legacy-peer-deps（見下方「Vue 3.6 Vapor beta」）
npm run dev     # 本機開發（會先跑 data:index）
npm run build   # 產生 dist/（會先跑 data:index）
npm run preview # 預覽 dist/

npm run data:index   # 單獨重建 index.json + by-category/
npm run data:used    # 列出所有已使用的英文句子（排程去重的備援工具）
```

本專案**沒有測試框架**，也沒有 lint 設定。驗證方式是 `npm run dev` 或 `npm run build && npm run preview` 後實際操作頁面。

## 架構重點

### 資料流：日檔是唯一真實來源

```
public/data/days/YYYY-MM-DD.json   ← 唯一真實來源（進版控）
        ↓  scripts/build-data-index.mjs（dev/build 前自動執行）
public/data/index.json             ← 衍生：日期清單 + 每分類總數
public/data/by-category/<id>.json  ← 衍生：某分類跨所有日期的例句
public/data/search.json            ← 衍生：全部例句彙整成一份（新到舊），供搜尋頁
        ↓  原樣複製到 dist（不進 bundle）
src/lib/data.js                    ← runtime fetch
```

`index.json`、`by-category/` 與 `search.json` 都是**建置產生的衍生檔，列在 .gitignore**。不要手動編輯，也不要加進版控——每次 `data:index` 會整個重建（`by-category/` 是先 `rmSync` 再重寫）。

例句資料是 **runtime fetch 的靜態 JSON，不會被打包**（`vite.config.js` 的 `assetsInlineLimit: 0`、資料放 `public/`）。這是「排程任務只丟一個 JSON 就能更新內容、不需裝 node 也不需 build」的關鍵前提，改動時別破壞它。

`by-category/` 是刻意的空間換時間：日檔讓單日頁只載 12 KB，但分類頁要跨所有天數看同一分類，沒有這份索引就得抓下每一個日檔（現在 15 個、一年後 365 個）。例句在 dist 裡存多份是已知取捨。

`search.json` 同理：搜尋頁要跨所有天數、所有分類做中文模糊搜尋，不可能即時抓下每個日檔，所以彙整成一份、搜尋頁只發一次請求，其餘比對都在瀏覽器端完成。為壓低傳輸與解析成本，這份刻意 **compact 輸出（不縮排）**，與 `index`／`by-category` 的可讀性排版不同。搜尋頁（`src/pages/SearchPage.vue`）載入後把每句正規化成一份可搜尋字串（中文整句＋單字中文解釋＋英文），輸入去抖後做多關鍵字 AND 比對，並沿用分類頁的 `IntersectionObserver` 分批渲染，避免大量結果一次塞爆 DOM。這份會隨天數線性成長（一年約 7300 句、~2 MB 未壓縮），若日後嫌大，可改成只放搜尋所需的精簡欄位、點結果再跳日檔看完整內容。

### Vue 3.6 Vapor beta

- `package.json` **鎖定精確版本**（`vue: 3.6.0-beta.17`，不用 `^`）——Vapor 只存在於 3.6 beta，npm 的 `latest` 仍是不含 Vapor 的 3.5.x，用 `^` 會裝到錯的版本。
- 根目錄 `.npmrc` 的 `legacy-peer-deps=true` 不能刪：prerelease 版號不符合 vue-router／plugin-vue 的 `^3.5.x` peer 範圍，沒有它 `npm ci` 會因 ERESOLVE 直接失敗（CI 也會掛）。
- `main.js` 用 `createVaporApp` + `vaporInteropPlugin`。**這個 plugin 不能拿掉**：vue-router 的 `RouterView`／`RouterLink` 是 vdom 元件，少了它整個路由無法運作（代價是同時載入 Vapor 與 vdom 兩套 runtime）。
- 分類清單在 app 掛載**前**載入完成（`main.js` 的 `initCategories()`），因為卡片渲染分類徽章時是同步取用 `categoryInfo()`。

3.6 正式版發布後，鎖版本與 legacy-peer-deps 這兩個限制都可以移除。

### base path `/learn-en/` 要三處同步

網站部署在 `https://embrs.github.io/learn-en/` 子路徑下。`vite.config.js` 的 `base` 與 `router.js` 的 `createWebHistory(import.meta.env.BASE_URL)` 必須一致，否則所有路由連結失效。`src/lib/data.js` 也必須用 `BASE_URL` 組路徑而非相對路徑——SPA 在 `/day/2026-07-15` 這種深層網址下，相對路徑會解析到錯的位置。

GitHub Pages 沒有伺服器端 rewrite，所以 `vite.config.js` 的 `spaFallbackPlugin` 把 `index.html` 複製成 `404.html` 當 fallback。`router.js` 底部那幾條舊網址 redirect（`.html` 檔）也靠這個機制運作——家人手機上存著舊書籤，不要刪。

## 修改時的地雷

### 動資料結構 → 必須同步更新 repo 外的排程定義

每日例句由**桌面版 Claude** 的排程任務（08:30）產生，定義在 repo 之外：
`~/Documents/Claude/Scheduled/daily-english-sentences/SKILL.md`

改動資料結構、檔案位置或 JSON 形狀時，**必須同步更新那份 SKILL.md**，否則排程隔天會寫入已不存在的檔案，網站靜默停止更新（它曾寫死 `assets/app.js`、`sentences.json`、`archive.json`）。SKILL.md 用檔案工具是唯讀的，要改請用 `mcp__scheduled-tasks__update_scheduled_task`（taskId `daily-english-sentences`）覆寫 prompt，改完即刻生效、不需重新註冊。

**排程完全不碰本機磁碟。** 它 clone repo 到沙箱暫存目錄、在裡面產生日檔、push 回 GitHub，全程只靠網路。這是刻意的：舊版每天早上要靠 `mcp__cowork__request_cowork_directory` 現場請求資料夾授權、等使用者按核准（曾等過 8 分鐘），人不在電腦前那天就整個卡住——2026 年 7 月的 25～27 日就是這樣連續三天沒產生。現在推送 token 直接寫在排程 prompt 裡，不再讀專案資料夾的 `.deploy-token`。

兩個後果要記得：

- **本機工作區的日檔會持續落後遠端**（排程不再複製回來）。要看最新內容請 `git pull`。這也表示判斷「哪幾天缺」時，本機資料不可信。
- **token 輪替時要同步更新排程 prompt**，否則 push 會 401／403。SKILL.md 有寫遇到 401/403 就停下來明講需要換 token，不要靜默失敗。

回補範圍是**滾動的「今天＋前 7 天」**，每天都檢查。這是為了讓漏跑能自我修復：若只看前 3 天，週一補完週末就沒了，而週一本身也漏跑的話上週缺口就永遠補不回來。缺的那幾天才會真的生成內容，所以多檢查幾天幾乎沒成本。MISSING 超過 3 天時 SKILL.md 要求分批生成（一次 2–3 天），避免 context 撐爆導致中途失敗。

排程算日期**必須用 `date -d "-N day" +%F`**，不能用 `new Date(x + "T00:00:00")` 搭 `toISOString().slice(0,10)`。後者把本地時間當 UTC 輸出，在台北（UTC+8）整串日期會往前偏一天——「今天」的日檔於是永遠不在候選清單裡。舊版 SKILL.md 就是這個寫法，已修掉。

### GitHub Pages 必須維持 build_type=workflow

Pages 來源**必須**是 GitHub Actions，不能退回 legacy 的「Deploy from a branch」——legacy 會把 repo 根目錄當靜態站直接送出未編譯的 `<script src="/src/main.js">`，整頁白畫面（build 其實成功，只是產物沒被採用），還會公開 `/package.json`、`/src/*`。

白畫面時的判別：`curl -s https://embrs.github.io/learn-en/ | grep script`，看到 `/src/main.js` 就是退回 legacy 了。修法（`.deploy-token` 權限足夠）：
```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" .../repos/Embrs/learn-en/pages -d '{"build_type":"workflow"}'
```
改完要再觸發一次 `deploy.yml`，舊模式下跑的那次產物不會被採用。

### `src/lib/speech.js` 的「看似多餘」程式碼不要清理

這個檔案幾乎每一行看起來冗餘的程式碼都是修過的瀏覽器 bug，檔內註解逐條說明了刪掉的症狀。特別是：

- **`currentUtterance` 只寫不讀不是死碼**：它的作用就是保持強引用，避免 Chrome 中途 GC 掉 utterance（症狀：`speaking=true` 但沒聲音）。
- **沒有配對 `pause()` 的 `resume()` 不是死碼**：解 Chrome/iOS 進入 paused 狀態的問題（症狀：用一陣子突然全部沒聲音）。
- **Safari 要求 `speak()` 在使用者點擊當下同步呼叫**：從進入 `playViaBrowserTTS` 到 `speak(u)` 之間不能插入 `setTimeout`／`await`／`nextTick`，呼叫端的事件處理器也必須是同步函式，否則靜音且不報錯。
- **`onvoiceschanged` 掛在模組層而非 `onMounted`**：它是屬性指派（獨佔 handler），放進元件會互相覆蓋、卸載時設回 null 會讓語音挑選整個失效。

### `src/lib/favorites.js` 的三個約束

- **`FAV_KEY = 'dailyEnglishFavorites'` 不能改名**（例如加版號），使用者既有收藏會全部消失。
- **收藏存的是快照而非 id 參照**：排程同一天重跑會就地覆寫句子但保留 id，用 id 回查會讓收藏內容無聲變成另一句。
- **`toggleFavorite` 寫入前一定重讀 localStorage**：直接覆寫記憶體中那份，會讓多分頁互相蓋掉對方的收藏。SPA 下分頁可以開著好幾天不重載，這個風險比舊版多頁式更大；`storage` 事件只同步畫面，擋不住寫入競態，兩者都要留。

### localStorage 一律包 try/catch

Safari 無痕模式與 LINE／IG 等內建瀏覽器讀 localStorage 會直接 throw，沒有這層保護整個功能會在那些環境整段崩掉。

## 語言慣例

所有註解、commit message、對話一律**繁體中文**；變數與函式名稱維持英文。專案現有註解密度偏高且多在解釋「為什麼」（尤其是瀏覽器 bug 的來龍去脈），新增程式碼時比照辦理。
