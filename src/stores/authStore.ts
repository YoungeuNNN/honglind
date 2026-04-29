import { create } from 'zustand'
import type { User } from '@/types'
import * as DS from '@/api/dataService'
import { supabase } from '@/api/supabase'

// 모듈 레벨 가드 — Strict Mode/HMR 로 init() 가 다회 호출되어도 리스너는 1번만
let _authListenerInitialized = false

interface AuthState {
  user: User | null
  initialized: boolean

  init: () => Promise<void>
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (data: { nickname: string; email: string; password: string }) => Promise<User>
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
      await DS.loadAll()
      const user = await DS.syncSessionFromAuth()
      set({ user, initialized: true })

      if (!_authListenerInitialized) {
        _authListenerInitialized = true
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            DS.setSession(null)
            set({ user: null })
            return
          }
          // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED 등
          DS.syncSessionFromAuth().then(u => set({ user: u })).catch(console.error)
        })
      }
    } catch (e) {
      console.error('Init failed:', e)
      set({ user: null, initialized: true })
    }
  },

  login: async (email, password) => {
    try {
      const user = await DS.signIn(email, password)
      set({ user })
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '로그인 실패'
      return { ok: false, error: msg }
    }
  },

  register: async (data) => {
    const user = await DS.signUp(data.email, data.password, data.nickname)
    set({ user })
    return user
  },

  logout: async () => {
    await DS.signOut()
    set({ user: null })
  },

  refresh: async () => {
    const current = get().user
    if (!current) return
    await DS.refreshSession()
    const fresh = DS.getUserById(current.id) ?? DS.currentUser()
    if (fresh) set({ user: fresh })
  },

  updateProfile: async (updates) => {
    const current = get().user
    if (!current) return
    const fresh = await DS.updateUser(current.id, updates)
    if (fresh) set({ user: fresh })
  },

  deleteAccount: async () => {
    const current = get().user
    if (!current) return
    await DS.deleteUser(current.id)
    set({ user: null })
  },
}))
