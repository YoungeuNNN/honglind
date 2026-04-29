import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/components/ui/Toast'
import { isPasswordValid, getPasswordRules, isValidEmail } from '@/utils/helpers'
import * as DS from '@/api/dataService'
import { supabase, setRememberMe, getRememberMe } from '@/api/supabase'

export function AuthPage() {
  const navigate = useNavigate()
  const { login, register, user } = useAuthStore()
  const toast = useToastStore(s => s.show)
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [error, setError] = useState('')

  // login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [rememberMe, setRememberMeState] = useState<boolean>(getRememberMe())

  // register state
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [regPwConfirm, setRegPwConfirm] = useState('')
  const [regNickname, setRegNickname] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // reset state
  const [resetEmail, setResetEmail] = useState('')
  const [resetStep, setResetStep] = useState(1)
  const [resetPw, setResetPw] = useState('')
  const [resetPwConfirm, setResetPwConfirm] = useState('')

  if (user) { navigate('/'); return null }

  const handleLogin = async () => {
    setError('')
    if (!loginEmail || !loginPw) { setError('이메일과 비밀번호를 입력하세요.'); return }
    setRememberMe(rememberMe)  // 로그인 전에 storage 정책 결정
    const result = await login(loginEmail, loginPw)
    if (!result.ok) { setError(result.error || '로그인 실패'); return }
    navigate('/')
  }

  const checkEmailDuplicate = () => {
    if (!regEmail) { setEmailMsg({ text: '이메일을 입력하세요.', ok: false }); setEmailChecked(false); return }
    if (!isValidEmail(regEmail)) { setEmailMsg({ text: '올바른 이메일 형식이 아닙니다.', ok: false }); setEmailChecked(false); return }
    if (DS.findUserByEmail(regEmail)) { setEmailMsg({ text: '이미 사용 중인 이메일입니다.', ok: false }); setEmailChecked(false); return }
    setEmailMsg({ text: '\u2713 사용 가능한 이메일입니다.', ok: true })
    setEmailChecked(true)
  }

  const handleRegister = async () => {
    setError('')
    if (!emailChecked) { setError('이메일 중복확인을 해주세요.'); return }
    if (!isPasswordValid(regPw)) { setError('비밀번호 조건을 모두 충족해야 합니다.'); return }
    if (regPw !== regPwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!regNickname.trim()) { setError('닉네임을 입력하세요.'); return }
    setRememberMe(true)  // 가입 시는 자동 로그인 기본값
    try {
      await register({ nickname: regNickname.trim(), email: regEmail, password: regPw })
      toast('가입을 환영합니다! 은혜 가운데 교제하세요.')
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입에 실패했습니다.')
    }
  }

  const verifyResetEmail = async () => {
    if (!resetEmail) { setError('이메일을 입력하세요.'); return }
    setError('')
    // Supabase 표준 — 비밀번호 재설정 메일 발송
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/auth',
    })
    if (rErr) { setError(rErr.message); return }
    toast('비밀번호 재설정 링크를 메일로 보냈습니다.')
    setMode('login')
  }

  const handlePasswordReset = async () => {
    // 사용자가 메일 링크를 통해 들어왔을 때 (recovery session) 활용
    if (!isPasswordValid(resetPw)) { setError('비밀번호 조건을 충족해야 합니다.'); return }
    if (resetPw !== resetPwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    const { error: uErr } = await supabase.auth.updateUser({ password: resetPw })
    if (uErr) { setError(uErr.message); return }
    toast('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.')
    setMode('login')
    setError('')
  }

  const pwRules = getPasswordRules(mode === 'register' ? regPw : resetPw)
  const canRegister = emailChecked && isPasswordValid(regPw) && regPw === regPwConfirm && regNickname.trim().length > 0
  const canReset = isPasswordValid(resetPw) && resetPw === resetPwConfirm
  const pwMatch = mode === 'register' ? regPwConfirm && regPw === regPwConfirm : resetPwConfirm && resetPw === resetPwConfirm
  const pwMismatch = mode === 'register' ? regPwConfirm && regPw !== regPwConfirm : resetPwConfirm && resetPw !== resetPwConfirm

  const subtitle = mode === 'login' ? '사역자 & 신학생을 위한 익명 커뮤니티'
    : mode === 'register' ? '홍라인드에 가입하고 함께 나누세요'
    : '비밀번호 재설정'

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo-area">
          <div className="auth-logo-big"><span className="auth-cross">&#10013;</span></div>
        </div>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <span className="logo-text"><span>홍</span>라인드</span>
        </div>
        <p className="auth-subtitle">{subtitle}</p>
        <p className="auth-verse">
          "두세 사람이 내 이름으로 모인 곳에 나도 그들 중에 있느니라"<br/>- 마태복음 18:20
        </p>

        {error && <div className="auth-error">{error}</div>}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={e => { e.preventDefault(); handleLogin() }}>
            <div className="form-group">
              <label>이메일</label>
              <input type="email" className="form-input" placeholder="example@seminary.ac.kr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input type="password" className="form-input" placeholder="비밀번호를 입력하세요" value={loginPw} onChange={e => setLoginPw(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--subtext)', cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMeState(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
              />
              자동 로그인
            </label>
            <button type="submit" className="auth-btn">로그인</button>
            <div className="auth-switch">계정이 없으신가요? <a onClick={() => { setMode('register'); setError('') }}>회원가입</a></div>
            <div className="auth-switch" style={{ marginTop: 8 }}><a onClick={() => { setMode('reset'); setError(''); setResetStep(1) }}>비밀번호를 잊으셨나요?</a></div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={e => { e.preventDefault(); handleRegister() }}>
            <div className="form-group">
              <label>이메일 (아이디)</label>
              <div className="form-row">
                <input type="email" className="form-input" placeholder="example@seminary.ac.kr"
                  value={regEmail} onChange={e => { setRegEmail(e.target.value); setEmailChecked(false); setEmailMsg(null) }} />
                <button type="button" className="btn btn-secondary" onClick={checkEmailDuplicate} style={{ whiteSpace: 'nowrap' }}>중복확인</button>
              </div>
              {emailMsg && <div className={`email-check-msg ${emailMsg.ok ? 'ok' : 'err'}`}>{emailMsg.text}</div>}
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input type="password" className="form-input" placeholder="비밀번호를 입력하세요" value={regPw} onChange={e => setRegPw(e.target.value)} />
              <ul className="validation-list">
                {pwRules.map(r => (
                  <li key={r.key} className={r.pass ? 'pass' : 'fail'}>
                    <span className="vicon">{r.pass ? '\u2713' : '\u2717'}</span> {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input type="password" className="form-input" placeholder="비밀번호를 다시 입력"
                value={regPwConfirm} onChange={e => setRegPwConfirm(e.target.value)} />
              {pwMatch && <div className="email-check-msg ok">{'\u2713'} 비밀번호가 일치합니다.</div>}
              {pwMismatch && <div className="email-check-msg err">비밀번호가 일치하지 않습니다.</div>}
            </div>
            <div className="form-group">
              <label>닉네임</label>
              <input type="text" className="form-input" placeholder="커뮤니티에서 사용할 닉네임" maxLength={20}
                value={regNickname} onChange={e => setRegNickname(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={!canRegister}>가입하기</button>
            <div className="auth-switch">이미 계정이 있으신가요? <a onClick={() => { setMode('login'); setError('') }}>로그인</a></div>
          </form>
        )}

        {/* Reset Form */}
        {mode === 'reset' && (
          <form onSubmit={e => e.preventDefault()}>
            {resetStep === 1 && (
              <>
                <div className="form-group">
                  <label>가입한 이메일</label>
                  <input type="email" className="form-input" placeholder="example@seminary.ac.kr" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                </div>
                <button className="auth-btn" onClick={verifyResetEmail}>다음</button>
              </>
            )}
            {resetStep === 2 && (
              <>
                <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 16, fontWeight: 600 }}>이메일이 확인되었습니다. 새 비밀번호를 설정하세요.</p>
                <div className="form-group">
                  <label>새 비밀번호</label>
                  <input type="password" className="form-input" placeholder="새 비밀번호" value={resetPw} onChange={e => setResetPw(e.target.value)} />
                  <ul className="validation-list">
                    {pwRules.map(r => (
                      <li key={r.key} className={r.pass ? 'pass' : 'fail'}>
                        <span className="vicon">{r.pass ? '\u2713' : '\u2717'}</span> {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-group">
                  <label>새 비밀번호 확인</label>
                  <input type="password" className="form-input" placeholder="비밀번호 확인" value={resetPwConfirm} onChange={e => setResetPwConfirm(e.target.value)} />
                  {pwMatch && <div className="email-check-msg ok">{'\u2713'} 비밀번호가 일치합니다.</div>}
                  {pwMismatch && <div className="email-check-msg err">비밀번호가 일치하지 않습니다.</div>}
                </div>
                <button className="auth-btn" onClick={handlePasswordReset} disabled={!canReset}>비밀번호 변경</button>
              </>
            )}
            <div className="auth-switch">기억나셨나요? <a onClick={() => { setMode('login'); setError('') }}>로그인</a></div>
          </form>
        )}
      </div>
    </div>
  )
}
