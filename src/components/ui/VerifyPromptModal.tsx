import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * 미인증 사용자가 글쓰기/댓글/DM 등 작성 동작을 시도하면 뜨는 안내 모달.
 * 인증 신청 화면(설정)으로 안내한다.
 */
export function VerifyPromptModal() {
  const navigate = useNavigate()
  const { verifyPromptOpen, closeVerifyPrompt } = useUIStore()
  const user = useAuthStore(s => s.user)

  const status = user?.verificationStatus ?? 'unverified'

  const close = () => closeVerifyPrompt()
  const goVerify = () => { close(); navigate('/settings') }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close()
  }

  const body = status === 'pending'
    ? {
        title: '인증 검토 중입니다',
        desc: '제출하신 재학 정보를 관리자가 확인하고 있습니다. 승인되면 글쓰기·댓글·쪽지를 이용하실 수 있습니다.',
        cta: '신청 내역 보기',
      }
    : status === 'rejected'
    ? {
        title: '인증이 거절되었습니다',
        desc: '제출 정보가 확인되지 않았습니다. 재학증명서 정보를 다시 확인하여 재신청해주세요.',
        cta: '다시 인증하기',
      }
    : {
        title: '재학생 인증이 필요합니다',
        desc: '홍라인드는 신학대학원 재학생만 글을 쓸 수 있는 커뮤니티입니다. 둘러보기는 자유롭게 하실 수 있어요. 글쓰기·댓글·쪽지는 재학생 인증 후 이용 가능합니다.',
        cta: '인증하러 가기',
      }

  return (
    <div className={`modal-overlay ${verifyPromptOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ position: 'relative', textAlign: 'center' }}>
        <div className="modal-close" onClick={close}>&times;</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>&#127891;</div>
        <h3 style={{ marginBottom: 6 }}>{body.title}</h3>
        <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 18, lineHeight: 1.6 }}>
          {body.desc}
        </p>
        <button className="btn btn-primary" onClick={goVerify} style={{ width: '100%' }}>
          {body.cta}
        </button>
        <div className="auth-switch" style={{ marginTop: 12 }}>
          <a onClick={close} style={{ cursor: 'pointer' }}>나중에 하기</a>
        </div>
      </div>
    </div>
  )
}
