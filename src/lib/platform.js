// 執行環境偵測與工具函式（內建瀏覽器、PWA 安裝狀態、複製連結）。
import { toast } from './toast.js'

// ---------------- LINE / FB / IG / WeChat 內建瀏覽器偵測 ----------------
// 這些 App 的內建瀏覽器常常無法使用語音朗讀，偵測到就提示改用預設瀏覽器開啟。
export function detectInApp() {
  const ua = navigator.userAgent || ''
  if (/Line\//i.test(ua)) return 'line'
  if (/FBAN|FBAV/i.test(ua)) return 'fb'
  if (/Instagram/i.test(ua)) return 'ig'
  if (/MicroMessenger/i.test(ua)) return 'wechat'
  return null
}

export const IN_APP_LABELS = { line: 'LINE', fb: 'Facebook', ig: 'Instagram', wechat: 'WeChat' }

// ---------------- PWA 安裝狀態 ----------------
export function isStandaloneApp() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true
}

export function isIOSDevice() {
  // !window.MSStream 是排除舊版 IE/Edge on Windows Phone 的偽裝 UA，不是多餘的判斷
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

// ---------------- 複製連結 ----------------
export function copyLink() {
  const url = location.href
  const done = () => toast('已複製連結')
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done))
  } else {
    fallbackCopy(url, done)
  }
}

// navigator.clipboard 在非 HTTPS 或內建瀏覽器裡可能不存在或被拒絕，退回舊的 execCommand 作法
function fallbackCopy(url, done) {
  const ta = document.createElement('textarea')
  ta.value = url
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy'); done() } catch (e) {}
  document.body.removeChild(ta)
}
