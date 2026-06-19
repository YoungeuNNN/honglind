import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { isPasswordValid, getPasswordRules, isValidEmail } from '@/utils/helpers'
import * as DS from '@/api/dataService'
import { supabase, setRememberMe, getRememberMe } from '@/api/supabase'

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { from?: { pathname?: string; search?: string }; mode?: 'login' | 'register' } | null
  const redirectTo = navState?.from
  const goAfterAuth = () => navigate(redirectTo?.pathname ? `${redirectTo.pathname}${redirectTo.search || ''}` : '/', { replace: true })
  const { login, register, user } = useAuthStore()
  const toast = useToastStore(s => s.show)
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'verify-sent'>(navState?.mode === 'register' ? 'register' : 'login')
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
  const [regStudentIdFile, setRegStudentIdFile] = useState<File | null>(null)
  const [regMembershipNote, setRegMembershipNote] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // verify-sent state
  const [sentToEmail, setSentToEmail] = useState('')
  const [resending, setResending] = useState(false)

  // reset state
  const [resetEmail, setResetEmail] = useState('')
  const [resetStep, setResetStep] = useState(1)
  const [resetPw, setResetPw] = useState('')
  const [resetPwConfirm, setResetPwConfirm] = useState('')

  // 로그인 상태면 원래 가려던 곳(또는 홈)으로
  useEffect(() => {
    if (user) goAfterAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
  if (user) return null

  const handleLogin = async () => {
    setError('')
    if (!loginEmail || !loginPw) { setError('이메일과 비밀번호를 입력하세요.'); return }
    setRememberMe(rememberMe)
    const result = await login(loginEmail, loginPw)
    if (!result.ok) { setError(result.error || '로그인 실패'); return }
    goAfterAuth()
  }

  const checkEmailDuplicate = () => {
    if (!regEmail.trim()) { setEmailMsg({ text: '이메일을 입력하세요.', ok: false }); setEmailChecked(false); return }
    if (!isValidEmail(regEmail)) { setEmailMsg({ text: '올바른 이메일 형식이 아닙니다.', ok: false }); setEmailChecked(false); return }
    if (DS.findUserByEmail(regEmail)) { setEmailMsg({ text: '이미 사용 중인 이메일입니다.', ok: false }); setEmailChecked(false); return }
    setEmailMsg({ text: '✓ 사용 가능한 이메일입니다.', ok: true })
    setEmailChecked(true)
  }

  const handleRegister = async () => {
    setError('')
    if (!isValidEmail(regEmail)) { setError('올바른 이메일을 입력하세요.'); return }
    if (!emailChecked) { setError('이메일 중복확인을 해주세요.'); return }
    if (!isPasswordValid(regPw)) { setError('비밀번호 조건을 모두 충족해야 합니다.'); return }
    if (regPw !== regPwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!regNickname.trim()) { setError('닉네임을 입력하세요.'); return }
    if (!regStudentIdFile) { setError('학생증 이미지를 첨부하세요.'); return }
    setRememberMe(true)
    try {
      const result = await register({
        nickname: regNickname.trim(),
        email: regEmail,
        password: regPw,
        membershipNote: regMembershipNote.trim() || undefined,
        studentIdFile: regStudentIdFile,
      })
      if (result.requiresEmailConfirmation) {
        setSentToEmail(regEmail)
        setMode('verify-sent')
        toast('인증 메일을 발송했습니다. 메일함을 확인하세요.')
        return
      }
      // 가입 = 신청. 학생증 승인 전까지는 제목만 열람 가능. 홈(제목 목록 + 대기 안내)으로 이동.
      toast('가입 신청이 접수되었습니다. 학생증 확인 후 승인되면 글을 볼 수 있어요.')
      goAfterAuth()
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입에 실패했습니다.')
    }
  }

  const handleResend = async () => {
    if (!sentToEmail) return
    setResending(true)
    try {
      await DS.resendConfirmationEmail(sentToEmail)
      toast('인증 메일을 다시 발송했습니다.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '재전송에 실패했습니다.')
    } finally {
      setResending(false)
    }
  }

  const verifyResetEmail = async () => {
    if (!resetEmail) { setError('이메일을 입력하세요.'); return }
    setError('')
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/auth',
    })
    if (rErr) { setError(rErr.message); return }
    toast('비밀번호 재설정 링크를 메일로 보냈습니다.')
    setMode('login')
  }

  const handlePasswordReset = async () => {
    if (!isPasswordValid(resetPw)) { setError('비밀번호 조건을 충족해야 합니다.'); return }
    if (resetPw !== resetPwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    const { error: uErr } = await supabase.auth.updateUser({ password: resetPw })
    if (uErr) { setError(uErr.message); return }
    toast('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.')
    setMode('login')
    setError('')
  }

  const pwRules = getPasswordRules(mode === 'register' ? regPw : resetPw)
  const canRegister = emailChecked && isPasswordValid(regPw) && regPw === regPwConfirm && regNickname.trim().length > 0 && !!regStudentIdFile
  const canReset = isPasswordValid(resetPw) && resetPw === resetPwConfirm
  const pwMatch = mode === 'register' ? regPwConfirm && regPw === regPwConfirm : resetPwConfirm && resetPw === resetPwConfirm
  const pwMismatch = mode === 'register' ? regPwConfirm && regPw !== regPwConfirm : resetPwConfirm && resetPw !== resetPwConfirm

  const subtitle = mode === 'login' ? '사역자 & 신학생을 위한 익명 커뮤니티'
    : mode === 'register' ? '홍라인드에 가입하고 함께 나누세요'
    : mode === 'verify-sent' ? '이메일 인증을 완료해주세요'
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
              <label>이메일</label>
              <div className="form-row">
                <input
                  type="email"
                  className="form-input"
                  placeholder="example@email.com"
                  value={regEmail}
                  onChange={e => { setRegEmail(e.target.value); setEmailChecked(false); setEmailMsg(null) }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-secondary" onClick={checkEmailDuplicate} style={{ whiteSpace: 'nowrap' }}>중복확인</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
                사용하시는 이메일로 가입할 수 있습니다. 신학대학원 재학 여부는 가입 후 학생증 확인으로 인증됩니다.
              </div>
              {emailMsg && <div className={`email-check-msg ${emailMsg.ok ? 'ok' : 'err'}`}>{emailMsg.text}</div>}
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input type="password" className="form-input" placeholder="비밀번호를 입력하세요" value={regPw} onChange={e => setRegPw(e.target.value)} />
              <ul className="validation-list">
                {pwRules.map(r => (
                  <li key={r.key} className={r.pass ? 'pass' : 'fail'}>
                    <span className="vicon">{r.pass ? '✓' : '✗'}</span> {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input type="password" className="form-input" placeholder="비밀번호를 다시 입력"
                value={regPwConfirm} onChange={e => setRegPwConfirm(e.target.value)} />
              {pwMatch && <div className="email-check-msg ok">{'✓'} 비밀번호가 일치합니다.</div>}
              {pwMismatch && <div className="email-check-msg err">비밀번호가 일치하지 않습니다.</div>}
            </div>
            <div className="form-group">
              <label>닉네임</label>
              <input type="text" className="form-input" placeholder="커뮤니티에서 사용할 닉네임" maxLength={20}
                value={regNickname} onChange={e => setRegNickname(e.target.value)} />
            </div>
            <div className="form-group">
              <label>학생증 인증 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="file"
                className="form-input"
                accept="image/*"
                onChange={e => setRegStudentIdFile(e.target.files?.[0] ?? null)}
              />
              <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4, lineHeight: 1.5 }}>
                학생증 사진을 첨부해주세요. 관리자가 확인 후 가입을 승인하며, 승인 전에는 글 제목만 볼 수 있습니다.<br/>
                제출하신 학생증은 인증 용도로만 사용되며 안전하게 보관됩니다.
              </div>
              {regStudentIdFile && <div className="email-check-msg ok">{'✓'} {regStudentIdFile.name}</div>}
            </div>
            <div className="form-group">
              <label>인증 참고 메모 (선택)</label>
              <input type="text" className="form-input" placeholder="예: OO신학대학원 재학 중 / 학번 등"
                value={regMembershipNote} onChange={e => setRegMembershipNote(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={!canRegister}>가입 신청하기</button>
            <div className="auth-switch">이미 계정이 있으신가요? <a onClick={() => { setMode('login'); setError('') }}>로그인</a></div>
          </form>
        )}

        {/* Email Verification Sent */}
        {mode === 'verify-sent' && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
              <strong>{sentToEmail}</strong> 으로 인증 메일을 보냈습니다.<br/>
              메일함을 확인하고 인증 링크를 클릭한 뒤 로그인해주세요.
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 16 }}>
              메일이 오지 않았다면 스팸함을 확인해주세요. 일정 시간 후 재전송할 수 있습니다.
            </div>
            <button type="button" className="auth-btn" onClick={handleResend} disabled={resending}>
              {resending ? '발송 중...' : '인증 메일 재전송'}
            </button>
            <div className="auth-switch" style={{ marginTop: 12 }}>
              <a onClick={() => { setMode('login'); setError(''); setSentToEmail('') }}>로그인 화면으로</a>
            </div>
          </div>
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
                        <span className="vicon">{r.pass ? '✓' : '✗'}</span> {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-group">
                  <label>새 비밀번호 확인</label>
                  <input type="password" className="form-input" placeholder="비밀번호 확인" value={resetPwConfirm} onChange={e => setResetPwConfirm(e.target.value)} />
                  {pwMatch && <div className="email-check-msg ok">{'✓'} 비밀번호가 일치합니다.</div>}
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
