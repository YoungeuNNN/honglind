import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'

export function DMListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  if (!user) return null
  const convos = DS.getConversations(user.id)
  return (
    <>
      <div className="feed-header"><h2 className="feed-title">쪽지함</h2></div>
      {!convos.length ? <div className="empty-state fade-in"><p>쪽지가 없습니다.</p></div> : (
        <div className="settings-section fade-in">
          {convos.map(c => {
            const other = DS.getUserById(c.otherUserId)
            const name = other ? other.nickname : '탈퇴한 사용자'
            const hasUnread = c.lastMsg && !c.lastMsg.read && c.lastMsg.receiverId === user.id
            return (
              <div key={c.otherUserId} className="dm-list-item" onClick={() => navigate(`/dm/${c.otherUserId}`)}>
                <div className="dm-avatar">{name[0]}</div>
                <div className="dm-info"><div className="dm-name">{name}</div><div className="dm-preview">{c.lastMsg?.content||''}</div></div>
                <div className="dm-meta"><div className="dm-time">{c.lastMsg?timeAgo(c.lastMsg.createdAt):''}</div>{hasUnread&&<div className="dm-unread-dot"/>}</div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
