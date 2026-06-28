import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import type { ReactNode } from 'react'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore()
  const openLoginPrompt = useUIStore(s => s.openLoginPrompt)

  // 비로그인 상태로 보호 라우트에 직접 접근한 경우: 홈으로 보내고 로그인 모달
  useEffect(() => {
    if (initialized && !user) openLoginPrompt()
  }, [initialized, user, openLoginPrompt])

  if (!initialized) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--subtext)' }}>로딩 중...</div>
  if (!user) return <Navigate to="/" replace />

  return <>{children}</>
}
