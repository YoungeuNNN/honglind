import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'
import { BackIcon } from '@/components/ui/Icons'

export function DMThreadPage() {
  const { userId: otherUserId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const openVerifyPrompt = useUIStore(s => s.openVerifyPrompt)
  const [msgText, setMsgText] = useState('')
  const [, setTick] = useState(0)
  const threadRef = useRef<HTMLDivElement>(null)
  const other = user && otherUserId ? DS.getUserById(otherUserId) : undefined
  const msgs = user && otherUserId ? DS.getThread(user.id, otherUserId) : []
  useEffect(() => {
    if (!user || !otherUserId) return
    DS.markThreadRead(user.id, otherUserId).catch(console.error)
  }, [user, otherUserId])
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight }, [msgs.length])
  if (!user || !otherUserId) return null
  const otherName = other ? other.nickname : '탈퇴한 사용자'
  const send = async () => {
    if (!msgText.trim()) return
    if (user.verificationStatus !== 'verified' && user.role !== 'admin') { openVerifyPrompt(); return }
    try {
      await DS.createMessage({ senderId: user.id, receiverId: otherUserId, content: msgText.trim(), read: false })
      setMsgText(''); setTick(t => t + 1)
    } catch (e) { console.error(e) }
  }
  return (
    <>
      <div className="back-btn" onClick={() => navigate('/dm')}><BackIcon /> 쪽지함으로</div>
      <div className="settings-section fade-in">
        <h3 style={{display:'flex',alignItems:'center',gap:8}}>
          <div className="dm-avatar" style={{width:32,height:32,fontSize:13}}>{otherName[0]}</div>{otherName}
        </h3>
        <div className="dm-thread" ref={threadRef}>
          {msgs.map(m => (<div key={m.id} className={`dm-bubble ${m.senderId===user.id?'sent':'received'}`}>{m.content}<div className="dm-bubble-time">{timeAgo(m.createdAt)}</div></div>))}
          {!msgs.length && <div style={{textAlign:'center',color:'var(--subtext)',fontSize:13,padding:20}}>쪽지가 없습니다. 첫 메시지를 보내보세요.</div>}
        </div>
        <div className="dm-input-area">
          <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="쪽지를 입력하세요..."
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/>
          <button className="btn btn-primary btn-small" onClick={send}>전송</button>
        </div>
      </div>
    </>
  )
}
