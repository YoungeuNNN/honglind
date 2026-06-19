import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * 작성 동작(글쓰기/댓글/DM 등) 공통 가드 훅. 2단계 게이트를 순서대로 확인한다:
 *   · 비로그인              → 로그인 유도 팝업
 *   · 가입(학생증) 미승인   → 가입 승인 안내 팝업
 *   · 재학증명서 미인증     → 재학생 인증 안내 팝업
 *   · 모두 통과 / 관리자    → 동작 실행
 */
export function useVerifiedAction() {
  const openLoginPrompt = useUIStore(s => s.openLoginPrompt)
  const openVerifyPrompt = useUIStore(s => s.openVerifyPrompt)
  const openMembershipPrompt = useUIStore(s => s.openMembershipPrompt)

  return (action: () => void) => () => {
    const { user } = useAuthStore.getState()
    if (!user) { openLoginPrompt(); return }
    if (user.role === 'admin') { action(); return }
    if (user.membershipStatus !== 'approved') { openMembershipPrompt(); return }
    if (user.verificationStatus !== 'verified') { openVerifyPrompt(); return }
    action()
  }
}
