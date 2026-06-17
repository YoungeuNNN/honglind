import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * 로그인 라우트 체크 공통화 훅.
 * 보호된 동작(글 보기/쓰기/내 정보 등)을 감싸면, 로그인 상태에서는 그대로 실행하고
 * 비로그인 상태에서는 로그인 유도 팝업을 띄운다.
 *
 *   const guard = useAuthAction()
 *   <div onClick={guard(() => navigate(`/post/${id}`))} />
 */
export function useAuthAction() {
  const openLoginPrompt = useUIStore(s => s.openLoginPrompt)

  return (action: () => void) => () => {
    const { user } = useAuthStore.getState()
    if (user) {
      action()
    } else {
      openLoginPrompt()
    }
  }
}
