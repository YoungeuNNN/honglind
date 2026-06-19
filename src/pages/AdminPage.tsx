import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'
import { VERIFICATION_LABELS, MEMBERSHIP_LABELS } from '@/utils/constants'

export function AdminPage() {
  const { user } = useAuthStore()
  const toast = useToastStore(s => s.show)
  const [tab, setTab] = useState<'reports'|'membership'|'verify'|'users'|'announce'|'domains'>('reports')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [mRejectingId, setMRejectingId] = useState<string | null>(null)
  const [mRejectReason, setMRejectReason] = useState('')

  const viewDoc = async (path?: string | null) => {
    if (!path) { toast('첨부된 서류가 없습니다.'); return }
    const url = await DS.getVerificationDocUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
    else toast('서류를 불러오지 못했습니다.')
  }
  const [, setTick] = useState(0)
  const rerender = () => setTick(t => t + 1)
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [newDomainDesc, setNewDomainDesc] = useState('')
  if (!user || user.role !== 'admin') return null
  const users = DS.getUsers()
  const posts = DS.getPosts()
  const reports = DS.getReports()
  const announcements = DS.getAnnouncements()
  const allowedDomains = DS.getAllowedDomains()
  const pendingReports = reports.filter(r => r.status === 'pending')
  const pendingMembership = users.filter(u => u.membershipStatus === 'pending')
  const pendingVerify = users.filter(u => u.verificationStatus === 'pending')
  const reasonLabels: Record<string,string> = {spam:'스팸',abuse:'욕설',false_info:'허위정보',privacy:'개인정보',inappropriate:'부적절',other:'기타'}
  return (
    <>
      <h2 style={{fontSize:22,fontWeight:800,color:'var(--dark)',marginBottom:20}}>관리자 대시보드</h2>
      <div className="admin-stat">
        <div className="admin-stat-item"><div className="admin-stat-num">{users.length}</div><div className="admin-stat-label">사용자</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{posts.length}</div><div className="admin-stat-label">게시글</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{pendingReports.length}</div><div className="admin-stat-label">미처리 신고</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{pendingMembership.length}</div><div className="admin-stat-label">가입 대기</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{pendingVerify.length}</div><div className="admin-stat-label">인증 대기</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{announcements.length}</div><div className="admin-stat-label">공지</div></div>
      </div>
      <div className="admin-tabs">
        <button className={`admin-tab ${tab==='reports'?'active':''}`} onClick={()=>setTab('reports')}>신고 관리</button>
        <button className={`admin-tab ${tab==='membership'?'active':''}`} onClick={()=>setTab('membership')}>가입 승인{pendingMembership.length>0?` (${pendingMembership.length})`:''}</button>
        <button className={`admin-tab ${tab==='verify'?'active':''}`} onClick={()=>setTab('verify')}>재학생 인증{pendingVerify.length>0?` (${pendingVerify.length})`:''}</button>
        <button className={`admin-tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>사용자 관리</button>
        <button className={`admin-tab ${tab==='announce'?'active':''}`} onClick={()=>setTab('announce')}>공지사항</button>
        <button className={`admin-tab ${tab==='domains'?'active':''}`} onClick={()=>setTab('domains')}>허용 도메인</button>
      </div>
      {tab==='reports' && (!reports.length ? <p style={{color:'var(--subtext)',padding:'20px 0'}}>신고 내역이 없습니다.</p> :
        [...reports].sort((a)=>a.status==='pending'?-1:1).map(r=>(
          <div key={r.id} className="admin-card fade-in">
            <div className="admin-card-body">
              <div className="label">{r.targetType==='post'?'게시글':'댓글'} 신고 · {reasonLabels[r.reason]||r.reason} · {timeAgo(r.createdAt)}</div>
              <div className="value">{r.detail||'(상세 내용 없음)'}</div>
              <div className="label" style={{marginTop:4}}>상태: {r.status==='pending'?<span style={{color:'var(--danger)',fontWeight:600}}>대기중</span>:r.status==='resolved'?<span style={{color:'var(--success)'}}>처리됨</span>:<span style={{color:'var(--subtext)'}}>기각</span>}</div>
            </div>
            {r.status==='pending'&&<div className="admin-card-actions">
              <button className="btn btn-primary btn-small" onClick={async ()=>{await DS.updateReport(r.id,{status:'resolved'});toast('신고가 처리되었습니다.');rerender()}}>처리</button>
              <button className="btn btn-secondary btn-small" onClick={async ()=>{await DS.updateReport(r.id,{status:'dismissed'});toast('신고가 기각되었습니다.');rerender()}}>기각</button>
            </div>}
          </div>
        ))
      )}
      {tab==='membership' && (!pendingMembership.length ? <p style={{color:'var(--subtext)',padding:'20px 0'}}>가입 승인 대기 중인 신청이 없습니다.</p> :
        pendingMembership.map(u=>(
          <div key={u.id} className="admin-card fade-in">
            <div className="admin-card-body">
              <div className="value">{u.nickname} <span style={{color:'var(--subtext)',fontSize:12}}>{u.email}</span></div>
              {u.membershipNote && <div className="value" style={{whiteSpace:'pre-wrap',fontSize:13,marginTop:4}}>메모: {u.membershipNote}</div>}
              <div className="label" style={{marginTop:4}}>신청일: {new Date(u.createdAt).toLocaleDateString('ko-KR')}</div>
              <button className="btn btn-text btn-small" style={{marginTop:4,padding:0}} onClick={()=>viewDoc(u.studentIdDoc)}>🪪 학생증 보기</button>
              {mRejectingId===u.id && (
                <div className="form-group" style={{marginTop:8}}>
                  <input type="text" className="form-input" value={mRejectReason} onChange={e=>setMRejectReason(e.target.value)} placeholder="거절 사유 (신청자에게 표시됩니다)"/>
                </div>
              )}
            </div>
            <div className="admin-card-actions">
              <button className="btn btn-primary btn-small" onClick={async ()=>{await DS.setMembership(u.id,'approved');toast(`${u.nickname} 님의 가입을 승인했습니다.`);setMRejectingId(null);rerender()}}>승인</button>
              {mRejectingId===u.id ? (
                <>
                  <button className="btn btn-danger-solid btn-small" onClick={async ()=>{await DS.setMembership(u.id,'rejected',mRejectReason.trim()||'학생증이 확인되지 않았습니다.');toast('가입을 거절했습니다.');setMRejectingId(null);setMRejectReason('');rerender()}}>거절 확정</button>
                  <button className="btn btn-secondary btn-small" onClick={()=>{setMRejectingId(null);setMRejectReason('')}}>취소</button>
                </>
              ) : (
                <button className="btn btn-danger btn-small" onClick={()=>{setMRejectingId(u.id);setMRejectReason('')}}>거절</button>
              )}
            </div>
          </div>
        ))
      )}
      {tab==='verify' && (!pendingVerify.length ? <p style={{color:'var(--subtext)',padding:'20px 0'}}>인증 대기 중인 신청이 없습니다.</p> :
        pendingVerify.map(u=>(
          <div key={u.id} className="admin-card fade-in">
            <div className="admin-card-body">
              <div className="value">{u.nickname} <span style={{color:'var(--subtext)',fontSize:12}}>{u.email}</span></div>
              <div className="label" style={{marginTop:4}}>제출 정보</div>
              <div className="value" style={{whiteSpace:'pre-wrap',fontSize:13}}>{u.verificationNote || '(제출 메모 없음)'}</div>
              <button className="btn btn-text btn-small" style={{marginTop:4,padding:0}} onClick={()=>viewDoc(u.enrollmentDoc)}>📄 재학증명서 보기</button>
              <div className="label" style={{marginTop:4}}>신청일: {new Date(u.createdAt).toLocaleDateString('ko-KR')}</div>
              {rejectingId===u.id && (
                <div className="form-group" style={{marginTop:8}}>
                  <input type="text" className="form-input" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="거절 사유 (신청자에게 표시됩니다)"/>
                </div>
              )}
            </div>
            <div className="admin-card-actions">
              <button className="btn btn-primary btn-small" onClick={async ()=>{await DS.setVerification(u.id,'verified');toast(`${u.nickname} 님을 인증했습니다.`);setRejectingId(null);rerender()}}>승인</button>
              {rejectingId===u.id ? (
                <>
                  <button className="btn btn-danger-solid btn-small" onClick={async ()=>{await DS.setVerification(u.id,'rejected',rejectReason.trim()||'재학 정보가 확인되지 않았습니다.');toast('인증을 거절했습니다.');setRejectingId(null);setRejectReason('');rerender()}}>거절 확정</button>
                  <button className="btn btn-secondary btn-small" onClick={()=>{setRejectingId(null);setRejectReason('')}}>취소</button>
                </>
              ) : (
                <button className="btn btn-danger btn-small" onClick={()=>{setRejectingId(u.id);setRejectReason('')}}>거절</button>
              )}
            </div>
          </div>
        ))
      )}
      {tab==='users' && users.filter(u=>u.role!=='admin').map(u=>(
        <div key={u.id} className="admin-card fade-in">
          <div className="admin-card-body">
            <div className="value">{u.nickname} <span style={{color:'var(--subtext)',fontSize:12}}>{u.email}</span></div>
            <div className="label">가입일: {new Date(u.createdAt).toLocaleDateString('ko-KR')} · 가입: <span style={{color:(MEMBERSHIP_LABELS[u.membershipStatus]??MEMBERSHIP_LABELS.pending).color,fontWeight:600}}>{(MEMBERSHIP_LABELS[u.membershipStatus]??MEMBERSHIP_LABELS.pending).label}</span> · 인증: <span style={{color:(VERIFICATION_LABELS[u.verificationStatus]??VERIFICATION_LABELS.unverified).color,fontWeight:600}}>{(VERIFICATION_LABELS[u.verificationStatus]??VERIFICATION_LABELS.unverified).label}</span> {u.banned&&<span style={{color:'var(--danger)',fontWeight:600}}>· 정지됨</span>}</div>
          </div>
          <div className="admin-card-actions">
            {u.banned?<button className="btn btn-primary btn-small" onClick={async ()=>{await DS.updateUser(u.id,{banned:false});toast('정지가 해제되었습니다.');rerender()}}>정지 해제</button>:
              <button className="btn btn-danger-solid btn-small" onClick={async ()=>{if(!confirm('이 사용자를 정지하시겠습니까?'))return;await DS.updateUser(u.id,{banned:true});toast('사용자가 정지되었습니다.');rerender()}}>정지</button>}
          </div>
        </div>
      ))}
      {tab==='announce' && (
        <>
          <div className="settings-section" style={{marginBottom:16}}>
            <div className="form-group"><label>공지 제목</label><input type="text" className="form-input" value={annTitle} onChange={e=>setAnnTitle(e.target.value)} placeholder="공지 제목"/></div>
            <div className="form-group"><label>공지 내용</label><textarea className="form-input" value={annContent} onChange={e=>setAnnContent(e.target.value)} placeholder="공지 내용" style={{minHeight:80,resize:'vertical'}}/></div>
            <button className="btn btn-primary btn-small" onClick={async ()=>{if(!annTitle.trim()||!annContent.trim()){toast('제목과 내용을 입력하세요.');return}await DS.createAnnouncementItem({authorId:user.id,title:annTitle.trim(),content:annContent.trim()});toast('공지가 등록되었습니다.');setAnnTitle('');setAnnContent('');rerender()}}>공지 등록</button>
          </div>
          {announcements.map(a=>(
            <div key={a.id} className="admin-card fade-in">
              <div className="admin-card-body">
                <div className="value" style={{fontWeight:700}}>{a.title}</div>
                <div className="label" style={{marginTop:4}}>{a.content.substring(0,80)}{a.content.length>80?'...':''}</div>
                <div className="label">{timeAgo(a.createdAt)}</div>
              </div>
              <div className="admin-card-actions"><button className="btn btn-danger btn-small" onClick={async ()=>{if(!confirm('공지를 삭제하시겠습니까?'))return;await DS.deleteAnnouncementItem(a.id);toast('공지가 삭제되었습니다.');rerender()}}>삭제</button></div>
            </div>
          ))}
        </>
      )}
      {tab==='domains' && (
        <>
          <div className="settings-section" style={{marginBottom:16}}>
            <div style={{fontSize:13,color:'var(--subtext)',marginBottom:12,lineHeight:1.6}}>
              가입 가능한 이메일 도메인 목록. 등록된 도메인을 가진 이메일만 회원가입할 수 있습니다.
            </div>
            <div className="form-group">
              <label>도메인</label>
              <input type="text" className="form-input" value={newDomain} onChange={e=>setNewDomain(e.target.value)} placeholder="예: puts.ac.kr"/>
            </div>
            <div className="form-group">
              <label>설명 (선택)</label>
              <input type="text" className="form-input" value={newDomainDesc} onChange={e=>setNewDomainDesc(e.target.value)} placeholder="예: 평택대학교 신학대학원"/>
            </div>
            <button className="btn btn-primary btn-small" onClick={async ()=>{
              if(!newDomain.trim()){toast('도메인을 입력하세요.');return}
              try {
                await DS.addAllowedDomain(newDomain, newDomainDesc)
                toast('도메인이 추가되었습니다.')
                setNewDomain('')
                setNewDomainDesc('')
                rerender()
              } catch (e) {
                toast(e instanceof Error ? e.message : '추가 실패')
              }
            }}>도메인 추가</button>
          </div>
          {!allowedDomains.length ? <p style={{color:'var(--subtext)',padding:'20px 0'}}>등록된 도메인이 없습니다.</p> :
            allowedDomains.map(d => (
              <div key={d.id} className="admin-card fade-in">
                <div className="admin-card-body">
                  <div className="value" style={{fontWeight:700}}>{d.domain}</div>
                  {d.description && <div className="label" style={{marginTop:4}}>{d.description}</div>}
                  <div className="label">등록일: {new Date(d.createdAt).toLocaleDateString('ko-KR')}</div>
                </div>
                <div className="admin-card-actions">
                  <button className="btn btn-danger btn-small" onClick={async ()=>{
                    if(!confirm(`도메인 '${d.domain}' 을 삭제하시겠습니까?\n해당 도메인의 신규 가입이 차단됩니다.`))return
                    try {
                      await DS.removeAllowedDomain(d.id)
                      toast('도메인이 삭제되었습니다.')
                      rerender()
                    } catch (e) {
                      toast(e instanceof Error ? e.message : '삭제 실패')
                    }
                  }}>삭제</button>
                </div>
              </div>
            ))
          }
        </>
      )}
    </>
  )
}
