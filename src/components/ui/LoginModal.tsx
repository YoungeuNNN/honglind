import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { setRememberMe, getRememberMe } from '@/api/supabase'

/**
 * 로그인 모달. 글 클릭 / 로그인 버튼 등 비로그인 진입점에서 배경(메인 화면)을 유지한 채 팝업으로 뜬다.
 * 회원가입·비밀번호 찾기 같은 긴 흐름은 /auth 페이지로 이동한다.
 * 로그인 성공 시 uiStore에 담긴 pendingAction(예: 클릭했던 글로 이동)을 이어서 실행한다.
 */
export function LoginModal() {
  const navigate = useNavigate()
  const { loginPromptOpen, closeLoginPrompt } = useUIStore()
  const login = useAuthStore(s => s.login)
  const toast = useToastStore(s => s.show)

  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [rememberMe, setRememberMeState] = useState<boolean>(getRememberMe())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setEmail(''); setPw(''); setError(''); setLoading(false) }
  const close = () => { reset(); closeLoginPrompt() }

  const handleLogin = async () => {
    setError('')
    if (!email || !pw) { setError('이메일과 비밀번호를 입력하세요.'); return }
    setRememberMe(rememberMe)
    setLoading(true)
    const result = await login(email, pw)
    setLoading(false)
    if (!result.ok) { setError(result.error || '로그인 실패'); return }
    const next = useUIStore.getState().pendingAction
    reset()
    closeLoginPrompt()
    toast('은혜 가운데 교제하세요.')
    if (next) next()
  }

  const goAuth = (mode: 'register' | 'reset') => {
    close()
    navigate('/auth', { state: { mode } })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close()
  }

  return (
    <div className={`modal-overlay ${loginPromptOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ position: 'relative' }}>
        <div className="modal-close" onClick={close}>&times;</div>

        <div className="auth-logo-area">
          <div className="auth-logo-big"><span className="auth-cross">&#10013;</span></div>
        </div>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <span className="logo-text"><span>홍</span>라인드</span>
        </div>
        <p className="auth-subtitle">사역자 &amp; 신학생을 위한 익명 커뮤니티</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={e => { e.preventDefault(); handleLogin() }}>
          <div className="form-group">
            <label htmlFor="modal-login-email">이메일</label>
            <input id="modal-login-email" type="email" autoComplete="email" className="form-input" placeholder="example@seminary.ac.kr"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="modal-login-pw">비밀번호</label>
            <input id="modal-login-pw" type="password" autoComplete="current-password" className="form-input" placeholder="비밀번호를 입력하세요"
              value={pw} onChange={e => setPw(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--subtext)', cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMeState(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            자동 로그인
          </label>
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>

        <div className="auth-switch">계정이 없으신가요? <button type="button" className="link-btn" onClick={() => goAuth('register')}>회원가입</button></div>
        <div className="auth-switch" style={{ marginTop: 8 }}><button type="button" className="link-btn" onClick={() => goAuth('reset')}>비밀번호를 잊으셨나요?</button></div>
      </div>
    </div>
  )
}
