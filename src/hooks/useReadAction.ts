import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * 읽기 동작(글 본문 열기 등) 공통 가드 훅. 1단계 게이트(학생증)를 확인한다:
 *   · 비로그인            → 로그인 유도 팝업
 *   · 가입(학생증) 미승인 → 가입 승인 안내 팝업
 *   · 승인 회원 / 관리자  → 동작 실행
 */
export function useReadAction() {
  const openLoginPrompt = useUIStore(s => s.openLoginPrompt)
  const openMembershipPrompt = useUIStore(s => s.openMembershipPrompt)

  return (action: () => void) => () => {
    const { user } = useAuthStore.getState()
    if (!user) { openLoginPrompt(); return }
    if (user.membershipStatus !== 'approved' && user.role !== 'admin') { openMembershipPrompt(); return }
    action()
  }
}
