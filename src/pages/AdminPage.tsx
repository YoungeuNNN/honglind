import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/components/ui/Toast'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'

export function AdminPage() {
  const { user } = useAuthStore()
  const toast = useToastStore(s => s.show)
  const [tab, setTab] = useState<'reports'|'users'|'announce'>('reports')
  const [, setTick] = useState(0)
  const rerender = () => setTick(t => t + 1)
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  if (!user || user.role !== 'admin') return null
  const users = DS.getUsers()
  const posts = DS.getPosts()
  const reports = DS.getReports()
  const announcements = DS.getAnnouncements()
  const pendingReports = reports.filter(r => r.status === 'pending')
  const reasonLabels: Record<string,string> = {spam:'스팸',abuse:'욕설',false_info:'허위정보',privacy:'개인정보',inappropriate:'부적절',other:'기타'}
  return (
    <>
      <h2 style={{fontSize:22,fontWeight:800,color:'var(--dark)',marginBottom:20}}>관리자 대시보드</h2>
      <div className="admin-stat">
        <div className="admin-stat-item"><div className="admin-stat-num">{users.length}</div><div className="admin-stat-label">사용자</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{posts.length}</div><div className="admin-stat-label">게시글</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{pendingReports.length}</div><div className="admin-stat-label">미처리 신고</div></div>
        <div className="admin-stat-item"><div className="admin-stat-num">{announcements.length}</div><div className="admin-stat-label">공지</div></div>
      </div>
      <div className="admin-tabs">
        <button className={`admin-tab ${tab==='reports'?'active':''}`} onClick={()=>setTab('reports')}>신고 관리</button>
        <button className={`admin-tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>사용자 관리</button>
        <button className={`admin-tab ${tab==='announce'?'active':''}`} onClick={()=>setTab('announce')}>공지사항</button>
      </div>
      {tab==='reports' && (!reports.length ? <p style={{color:'var(--subtext)',padding:'20px 0'}}>신고 내역이 없습니다.</p> :
        [...reports].sort((a,b)=>a.status==='pending'?-1:1).map(r=>(
          <div key={r.id} className="admin-card fade-in">
            <div className="admin-card-body">
              <div className="label">{r.targetType==='post'?'게시글':'댓글'} 신고 · {reasonLabels[r.reason]||r.reason} · {timeAgo(r.createdAt)}</div>
              <div className="value">{r.detail||'(상세 내용 없음)'}</div>
              <div className="label" style={{marginTop:4}}>상태: {r.status==='pending'?<span style={{color:'var(--danger)',fontWeight:600}}>대기중</span>:r.status==='resolved'?<span style={{color:'var(--success)'}}>처리됨</span>:<span style={{color:'var(--subtext)'}}>기각</span>}</div>
            </div>
            {r.status==='pending'&&<div className="admin-card-actions">
              <button className="btn btn-primary btn-small" onClick={()=>{DS.updateReport(r.id,{status:'resolved'});toast('신고가 처리되었습니다.');rerender()}}>처리</button>
              <button className="btn btn-secondary btn-small" onClick={()=>{DS.updateReport(r.id,{status:'dismissed'});toast('신고가 기각되었습니다.');rerender()}}>기각</button>
            </div>}
          </div>
        ))
      )}
      {tab==='users' && users.filter(u=>u.role!=='admin').map(u=>(
        <div key={u.id} className="admin-card fade-in">
          <div className="admin-card-body">
            <div className="value">{u.nickname} <span style={{color:'var(--subtext)',fontSize:12}}>{u.email}</span></div>
            <div className="label">가입일: {new Date(u.createdAt).toLocaleDateString('ko-KR')} {u.banned&&<span style={{color:'var(--danger)',fontWeight:600}}>· 정지됨</span>}</div>
          </div>
          <div className="admin-card-actions">
            {u.banned?<button className="btn btn-primary btn-small" onClick={()=>{DS.updateUser(u.id,{banned:false});toast('정지가 해제되었습니다.');rerender()}}>정지 해제</button>:
              <button className="btn btn-danger-solid btn-small" onClick={()=>{if(!confirm('이 사용자를 정지하시겠습니까?'))return;DS.updateUser(u.id,{banned:true});toast('사용자가 정지되었습니다.');rerender()}}>정지</button>}
          </div>
        </div>
      ))}
      {tab==='announce' && (
        <>
          <div className="settings-section" style={{marginBottom:16}}>
            <div className="form-group"><label>공지 제목</label><input type="text" className="form-input" value={annTitle} onChange={e=>setAnnTitle(e.target.value)} placeholder="공지 제목"/></div>
            <div className="form-group"><label>공지 내용</label><textarea className="form-input" value={annContent} onChange={e=>setAnnContent(e.target.value)} placeholder="공지 내용" style={{minHeight:80,resize:'vertical'}}/></div>
            <button className="btn btn-primary btn-small" onClick={()=>{if(!annTitle.trim()||!annContent.trim()){toast('제목과 내용을 입력하세요.');return};DS.createAnnouncementItem({authorId:user.id,title:annTitle.trim(),content:annContent.trim()});toast('공지가 등록되었습니다.');setAnnTitle('');setAnnContent('');rerender()}}>공지 등록</button>
          </div>
          {announcements.map(a=>(
            <div key={a.id} className="admin-card fade-in">
              <div className="admin-card-body">
                <div className="value" style={{fontWeight:700}}>{a.title}</div>
                <div className="label" style={{marginTop:4}}>{a.content.substring(0,80)}{a.content.length>80?'...':''}</div>
                <div className="label">{timeAgo(a.createdAt)}</div>
              </div>
              <div className="admin-card-actions"><button className="btn btn-danger btn-small" onClick={()=>{if(!confirm('공지를 삭제하시겠습니까?'))return;DS.deleteAnnouncementItem(a.id);toast('공지가 삭제되었습니다.');rerender()}}>삭제</button></div>
            </div>
          ))}
        </>
      )}
    </>
  )
}
