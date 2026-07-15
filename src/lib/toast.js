// 全站單例 toast。
//
// 刻意不用 <Transition> 也不用 v-if：舊版的 #toast 元素是 lazy 建立且永不移除，
// 連續呼叫時只換 textContent、不重播淡入動畫，並用 clearTimeout 把 1600ms 重新計時
// （所以連續 toast 時訊息會一直顯示，不會中途閃掉）。這裡用一組共享狀態重現同樣行為：
// 元素常駐、只切換 .show class。
import { ref } from 'vue'

export const toastMessage = ref('')
export const toastVisible = ref(false)

let timer = null

export function toast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  // 重設計時器：連續呼叫時只有最後一次的 1600ms 生效
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 1600)
}
