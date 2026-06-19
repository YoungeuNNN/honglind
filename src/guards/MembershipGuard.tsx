import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import type { ReactNode } from 'react'

/**
 * 1단계 게이트: 로그인 + 학생증 승인(approved) 회원만 통과.
 * 미로그인은 로그인 팝업, 미승인은 가입 승인 안내 팝업을 띄우고 홈으로 보낸다.
 */
export function MembershipGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore()
  const openLoginPrompt = useUIStore(s => s.openLoginPrompt)
  const openMembershipPrompt = useUIStore(s => s.openMembershipPrompt)

  const approved = !!user && (user.membershipStatus === 'approved' || user.role === 'admin')

  useEffect(() => {
    if (!initialized) return
    if (!user) openLoginPrompt()
    else if (!approved) openMembershipPrompt()
  }, [initialized, user, approved, openLoginPrompt, openMembershipPrompt])

  if (!initialized) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--subtext)' }}>로딩 중...</div>
  if (!approved) return <Navigate to="/" replace />

  return <>{children}</>
}
