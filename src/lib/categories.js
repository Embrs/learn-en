// 20 個分類的定義。
//
// 舊版把這份清單同時寫在 assets/app.js 的 CATEGORIES 常數與 categories.json 兩個地方，
// 兩者必須手動保持一致（排程任務的說明還特別交代「以 app.js 為準」）。
// 現在統一以 public/data/categories.json 為唯一來源，在 app 掛載前載入。
import { shallowRef } from 'vue'
import { fetchCategories } from './data.js'

export const categories = shallowRef([])

export async function initCategories() {
  categories.value = await fetchCategories()
}

// 卡片渲染時需要同步取用，所以分類清單在 app 掛載前就要載入完成（見 main.js）。
// 查不到就退回顯示 id 本身，不讓畫面因為缺一個分類定義而整個壞掉。
export function categoryInfo(id) {
  return categories.value.find(c => c.id === id) || { id, zh: id, icon: '🏷️' }
}
