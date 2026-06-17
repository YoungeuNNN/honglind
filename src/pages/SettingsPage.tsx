import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import * as DS from '@/api/dataService'
import { supabase } from '@/api/supabase'
import { BackIcon } from '@/components/ui/Icons'
import { isPasswordValid, getPasswordRules, isValidEmail } from '@/utils/helpers'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateProfile, deleteAccount } = useAuthStore()
  const toast = useToastStore(s => s.show)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [newEmail, setNewEmail] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{text:string;ok:boolean}|null>(null)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPwC, setNewPwC] = useState('')
  const [deletePw, setDeletePw] = useState('')
  const [, setTick] = useState(0)
  if (!user) return null
  const fresh = DS.getUserById(user.id) || user
  const blockedIds = DS.getBlockedIds(user.id)
  const pwRules = getPasswordRules(newPw)

  const saveNickname = async () => {
    if (!nickname.trim()) { toast('닉네임을 입력하세요.'); return }
    try { await updateProfile({ nickname: nickname.trim() }); setEditingNickname(false); toast('닉네임이 변경되었습니다.') }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const checkEmail = () => {
    if (!newEmail) { setEmailMsg({text:'이메일을 입력하세요.',ok:false}); setEmailChecked(false); return }
    if (!isValidEmail(newEmail)) { setEmailMsg({text:'올바른 이메일 형식이 아닙니다.',ok:false}); setEmailChecked(false); return }
    if (DS.findUserByEmail(newEmail)) { setEmailMsg({text:'이미 사용 중인 이메일입니다.',ok:false}); setEmailChecked(false); return }
    setEmailMsg({text:'✓ 사용 가능한 이메일입니다.',ok:true}); setEmailChecked(true)
  }

  const saveEmail = async () => {
    if (!emailChecked) { toast('이메일 중복확인을 해주세요.'); return }
    try {
      // Supabase Auth 의 이메일 변경 — 확인 메일이 발송됨
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) { toast(error.message); return }
      toast('확인 메일을 보냈습니다. 새 이메일에서 확인해 주세요.')
      setNewEmail(''); setEmailChecked(false); setEmailMsg(null)
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const savePw = async () => {
    if (!curPw) { toast('현재 비밀번호를 입력하세요.'); return }
    if (!isPasswordValid(newPw)) { toast('새 비밀번호가 조건을 충족하지 않습니다.'); return }
    if (newPw !== newPwC) { toast('새 비밀번호가 일치하지 않습니다.'); return }
    // 현재 비밀번호 재인증
    const { error: reErr } = await supabase.auth.signInWithPassword({ email: fresh.email, password: curPw })
    if (reErr) { toast('현재 비밀번호가 올바르지 않습니다.'); return }
    try {
      await updateProfile({ password: newPw })
      toast('비밀번호가 변경되었습니다.'); setCurPw(''); setNewPw(''); setNewPwC('')
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const handleDelete = async () => {
    if (!deletePw) { toast('비밀번호를 입력하세요.'); return }
    const { error: reErr } = await supabase.auth.signInWithPassword({ email: fresh.email, password: deletePw })
    if (reErr) { toast('비밀번호가 올바르지 않습니다.'); return }
    if (!confirm('정말로 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) return
    try { await deleteAccount(); toast('계정이 삭제되었습니다.'); navigate('/auth') }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const unblock = async (blockedId: string) => {
    try { await DS.unblockUser(user.id, blockedId); toast('차단이 해제되었습니다.'); setTick(t=>t+1) }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  return (
    <>
      <div className="back-btn" onClick={()=>navigate('/')}><BackIcon/> 돌아가기</div>
      <h2 style={{fontSize:22,fontWeight:800,color:'var(--dark)',marginBottom:20}}>계정 설정</h2>
      <div className="settings-section fade-in">
        <h3>프로필 정보</h3>
        {!editingNickname ? (
          <div className="settings-row"><label>닉네임</label><span className="val">{fresh.nickname}</span><button className="btn btn-text btn-small" onClick={()=>setEditingNickname(true)}>수정</button></div>
        ) : (
          <div className="form-row" style={{maxWidth:340,marginTop:8}}>
            <input className="form-input" value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} style={{fontSize:13,padding:'10px 14px'}}/>
            <button className="btn btn-primary btn-small" onClick={saveNickname}>저장</button>
            <button className="btn btn-secondary btn-small" onClick={()=>setEditingNickname(false)}>취소</button>
          </div>
        )}
        <div className="settings-row"><label>이메일</label><span className="val">{fresh.email}</span></div>
        <div className="settings-row"><label>가입일</label><span className="val">{new Date(fresh.createdAt).toLocaleDateString('ko-KR')}</span></div>
      </div>
      <div className="settings-section fade-in">
        <h3>이메일 변경</h3>
        <div className="form-group"><label>새 이메일</label>
          <div className="form-row" style={{maxWidth:400}}>
            <input type="email" className="form-input" placeholder="새 이메일을 입력하세요" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setEmailChecked(false);setEmailMsg(null)}} style={{fontSize:13,padding:'10px 14px'}}/>
            <button className="btn btn-secondary btn-small" onClick={checkEmail} style={{whiteSpace:'nowrap'}}>중복확인</button>
          </div>
          {emailMsg && <div className={`email-check-msg ${emailMsg.ok?'ok':'err'}`}>{emailMsg.text}</div>}
        </div>
        <button className="btn btn-primary btn-small" onClick={saveEmail}>변경하기</button>
      </div>
      <div className="settings-section fade-in">
        <h3>비밀번호 변경</h3>
        <div className="form-group"><label>현재 비밀번호</label><input type="password" className="form-input" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="현재 비밀번호" style={{maxWidth:340,fontSize:13,padding:'10px 14px'}}/></div>
        <div className="form-group"><label>새 비밀번호</label><input type="password" className="form-input" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호" style={{maxWidth:340,fontSize:13,padding:'10px 14px'}}/>
          <ul className="validation-list">{pwRules.map(r=><li key={r.key} className={r.pass?'pass':'fail'}><span className="vicon">{r.pass?'✓':'✗'}</span> {r.label}</li>)}</ul></div>
        <div className="form-group"><label>새 비밀번호 확인</label><input type="password" className="form-input" value={newPwC} onChange={e=>setNewPwC(e.target.value)} placeholder="새 비밀번호 확인" style={{maxWidth:340,fontSize:13,padding:'10px 14px'}}/>
          {newPwC&&newPw===newPwC&&<div className="email-check-msg ok">{'✓'} 비밀번호가 일치합니다.</div>}
          {newPwC&&newPw!==newPwC&&<div className="email-check-msg err">비밀번호가 일치하지 않습니다.</div>}</div>
        <button className="btn btn-primary btn-small" onClick={savePw}>변경하기</button>
      </div>
      <div className="settings-section danger-zone fade-in">
        <h3>계정 삭제</h3>
        <p style={{fontSize:13,color:'var(--subtext)',marginBottom:12}}>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.<br/>작성한 글과 댓글은 "탈퇴한 사용자"로 표시됩니다.</p>
        <div className="form-group"><label>비밀번호 확인</label><input type="password" className="form-input" value={deletePw} onChange={e=>setDeletePw(e.target.value)} placeholder="비밀번호를 입력하세요" style={{maxWidth:340,fontSize:13,padding:'10px 14px'}}/></div>
        <button className="btn btn-danger-solid btn-small" onClick={handleDelete}>계정 삭제하기</button>
      </div>
      <div className="settings-section fade-in">
        <h3>차단 관리</h3>
        {!blockedIds.length ? <p style={{fontSize:13,color:'var(--subtext)'}}>차단한 사용자가 없습니다.</p> :
          blockedIds.map(bid=>{const bu=DS.getUserById(bid);return(
            <div key={bid} className="settings-row"><span className="val">{bu?bu.nickname:'탈퇴한 사용자'}</span><button className="btn btn-secondary btn-small" onClick={()=>unblock(bid)}>차단 해제</button></div>
          )})}
      </div>
    </>
  )
}
