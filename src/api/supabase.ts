import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
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
