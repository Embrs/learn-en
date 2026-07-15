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
        ↓  原樣複製到 dist（不進 bundle）
src/lib/data.js                    ← runtime fetch
```

`index.json` 與 `by-category/` 是**建置產生的衍生檔，列在 .gitignore**。不要手動編輯，也不要加進版控——每次 `data:index` 會整個重建（`by-category/` 是先 `rmSync` 再重寫）。

例句資料是 **runtime fetch 的靜態 JSON，不會被打包**（`vite.config.js` 的 `assetsInlineLimit: 0`、資料放 `public/`）。這是「排程任務只丟一個 JSON 就能更新內容、不需裝 node 也不需 build」的關鍵前提，改動時別破壞它。

`by-category/` 是刻意的空間換時間：日檔讓單日頁只載 12 KB，但分類頁要跨所有天數看同一分類，沒有這份索引就得抓下每一個日檔（現在 15 個、一年後 365 個）。例句在 dist 裡存兩份是已知取捨。

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

改動資料結構、檔案位置或 JSON 形狀時，**必須同步更新那份 SKILL.md**，否則排程隔天會寫入已不存在的檔案，網站靜默停止更新（它曾寫死 `assets/app.js`、`sentences.json`、`archive.json`）。**搬動整個專案資料夾也算**——SKILL.md 裡的絕對路徑是寫死的。直接編輯 SKILL.md 即可生效，不需要重新註冊。

排程的存取權**不是常駐的**：`scheduled-tasks.json` 裡這個任務的 `userSelectedFolders` 是空陣列，所以它每天早上都要靠 `mcp__cowork__request_cowork_directory` 現場請求授權、等使用者按核准（曾等過 8 分鐘）。人不在電腦前那天就會卡住。要讓它無人值守，得在桌面版把專案資料夾加進**該排程任務**的資料夾清單——注意 `claude_desktop_config.json` 的 `localAgentModeTrustedFolders` 是 local agent mode 用的另一套機制，改它沒有用。

排程只複製當天日檔進乾淨 clone（`cp` 單檔，不是 `rsync` 整包）。這是刻意的：整包同步會把任何未進版控的檔案（`.DS_Store`、openspec 草稿）一起 commit，而 `$SRC` 抓錯時 `--delete` 會清空整個 repo。所以**在專案根目錄新增未進版控的檔案是安全的**，不會干擾排程。

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
