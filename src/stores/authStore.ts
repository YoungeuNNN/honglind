import { create } from 'zustand'
import type { User, SignUpResult } from '@/types'
import * as DS from '@/api/dataService'
import * as MockDS from '@/api/mockDataService'
import { supabase } from '@/api/supabase'

// 환경 변수에 따라 mock 서비스 사용 여부 결정
const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const dataService = useMock ? MockDS : DS

// 모듈 레벨 가드 — Strict Mode/HMR 로 init() 가 다회 호출되어도 리스너는 1번만
let _authListenerInitialized = false

interface AuthState {
  user: User | null
  initialized: boolean

  init: () => Promise<void>
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (data: { nickname: string; email: string; password: string }) => Promise<SignUpResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  deleteAccount: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,

  init: async () => {
    try {
      await dataService.loadAll()
      const user = await dataService.syncSessionFromAuth()
      set({ user, initialized: true })

      if (!_authListenerInitialized && !useMock) {
        _authListenerInitialized = true
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            dataService.setSession(null)
            set({ user: null })
            return
          }
          // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED 등
          dataService.syncSessionFromAuth().then(u => set({ user: u })).catch(console.error)
        })
      }
    } catch (e) {
      console.error('Init failed:', e)
      set({ user: null, initialized: true })
    }
  },

  login: async (email, password) => {
    try {
      const user = await dataService.signIn(email, password)
      set({ user })
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '로그인 실패'
      return { ok: false, error: msg }
    }
  },

  register: async (data) => {
    const result = await dataService.signUp(data.email, data.password, data.nickname)
    if (result.user) set({ user: result.user })
    return result
  },

  logout: async () => {
    await dataService.signOut()
    set({ user: null })
  },

  refresh: async () => {
    const current = get().user
    if (!current) return
    await dataService.refreshSession()
    const fresh = dataService.getUserById(current.id) ?? dataService.currentUser()
    if (fresh) set({ user: fresh })
  },

  updateProfile: async (updates) => {
    const current = get().user
    if (!current) return
    const fresh = await dataService.updateUser(current.id, updates)
    if (fresh) set({ user: fresh })
  },

  deleteAccount: async () => {
    const current = get().user
    if (!current) return
    await dataService.deleteUser(current.id)
    set({ user: null })
  },
}))
