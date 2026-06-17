import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/components/ui/Toast'
import { setRememberMe, getRememberMe } from '@/api/supabase'

export function LoginPromptModal() {
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
    toast('은혜 가운데 교제하세요.')
    close()
  }

  const goRegister = () => {
    closeLoginPrompt()
    reset()
    navigate('/auth', { state: { mode: 'register' } })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close()
  }

  return (
    <div className={`modal-overlay ${loginPromptOpen ? 'show' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ position: 'relative', textAlign: 'center' }}>
        <div className="modal-close" onClick={close}>&times;</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>&#10013;</div>
        <h3 style={{ marginBottom: 6 }}>로그인이 필요합니다</h3>
        <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 18 }}>
          홍라인드의 모든 내용을 보려면 로그인해주세요.
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={e => { e.preventDefault(); handleLogin() }} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>이메일</label>
            <input type="email" className="form-input" placeholder="example@seminary.ac.kr"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input type="password" className="form-input" placeholder="비밀번호를 입력하세요"
              value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--subtext)', cursor: 'pointer', marginBottom: 14 }}>
            <input type="checkbox" checked={rememberMe}
              onChange={e => setRememberMeState(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            자동 로그인
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop: 14 }}>
          계정이 없으신가요? <a onClick={goRegister} style={{ cursor: 'pointer' }}>회원가입</a>
        </div>
      </div>
    </div>
  )
}
