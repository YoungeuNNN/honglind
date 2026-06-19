import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * 가입(학생증) 미승인 사용자가 본문 열람/작성을 시도하면 뜨는 안내 모달.
 */
export function MembershipPromptModal() {
  const navigate = useNavigate()
  const { membershipPromptOpen, closeMembershipPrompt } = useUIStore()
  const user = useAuthStore(s => s.user)

  const status = user?.membershipStatus ?? 'pending'
  const close = () => closeMembershipPrompt()
  const goSettings = () => { close(); navigate('/settings') }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close()
  }

  const body = status === 'rejected'
    ? {
        title: '가입이 거절되었습니다',
        desc: '제출하신 학생증이 확인되지 않았습니다. 설정에서 학생증을 다시 제출해 재신청해주세요.',
        cta: '다시 신청하기',
      }
    : {
        title: '학생증 승인 대기 중입니다',
        desc: '홍라인드는 학생증 확인을 마친 회원만 글 본문을 볼 수 있습니다. 관리자가 학생증을 확인하면 알려드릴게요. 그동안 글 제목은 둘러보실 수 있습니다.',
        cta: '신청 상태 보기',
      }

  return (
    <div className={`modal-overlay ${membershipPromptOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ position: 'relative', textAlign: 'center' }}>
        <div className="modal-close" onClick={close}>&times;</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>&#128274;</div>
        <h3 style={{ marginBottom: 6 }}>{body.title}</h3>
        <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 18, lineHeight: 1.6 }}>
          {body.desc}
        </p>
        <button className="btn btn-primary" onClick={goSettings} style={{ width: '100%' }}>
          {body.cta}
        </button>
        <div className="auth-switch" style={{ marginTop: 12 }}>
          <a onClick={close} style={{ cursor: 'pointer' }}>닫기</a>
        </div>
      </div>
    </div>
  )
}
