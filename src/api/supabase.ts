import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // 빌드 시 환경변수 누락이면 throw 하기 전에 화면에 안내 표시
  const msg = 'Supabase 환경변수가 설정되지 않았습니다.\n\nNetlify > Site settings > Environment variables 에서\nVITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 추가하고\nDeploys > Trigger deploy 로 재배포해 주세요.'
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `<pre style="padding:24px;font-family:system-ui;color:#c62828;white-space:pre-wrap;line-height:1.6">${msg}</pre>`
  }
  throw new Error(msg)
}

// ── 자동 로그인(Remember me) ─────────────────────────────────
// true  → localStorage  : 브라우저 닫아도 세션 유지
// false → sessionStorage: 탭/브라우저 닫으면 로그아웃
const REMEMBER_KEY = 'honglind_remember_me'

export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
}
export function getRememberMe(): boolean {
  // 미설정 시 기본 true (자동 로그인)
  return localStorage.getItem(REMEMBER_KEY) !== 'false'
}

const dynamicStorage = {
  getItem: (key: string): string | null => {
    return getRememberMe()
      ? localStorage.getItem(key)
      : sessionStorage.getItem(key)
  },
  setItem: (key: string, value: string): void => {
    if (getRememberMe()) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: dynamicStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
