import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'
import { HeartIcon, CommentIcon, EyeIcon } from '@/components/ui/Icons'

export function BookmarksPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const bookmarks = DS.getUserBookmarks(user?.id || '')
  const allPosts = DS.getPosts()
  const posts = bookmarks.map(b => allPosts.find(p => p.id === b.postId)).filter(Boolean).reverse()
  const comments = DS.getComments()
  return (
    <>
      <div className="feed-header"><h2 className="feed-title">저장한 글</h2></div>
      {!posts.length ? <div className="empty-state fade-in"><p>저장한 글이 없습니다.</p></div> :
        posts.map(p => p && (
          <div key={p.id} className="post-card fade-in" onClick={() => navigate(`/post/${p.id}`)}>
            <div className="post-card-header"><span className={`post-category cat-${p.category}`}>{p.category}</span><span className="post-time">{timeAgo(p.createdAt)}</span></div>
            <div className="post-card-title">{p.title}</div>
            <div className="post-card-body">{p.content}</div>
            <div className="post-card-footer">
              <span><HeartIcon/> {p.likes.length}</span>
              <span><CommentIcon/> {comments.filter(c=>c.postId===p.id).length}</span>
              <span><EyeIcon/> {p.views}</span>
            </div>
          </div>
        ))
      }
    </>
  )
}
