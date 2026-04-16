import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'
import { HeartIcon, CommentIcon, EyeIcon } from '@/components/ui/Icons'

export function MyPostsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const posts = DS.getPosts().filter(p => p.authorId === user?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const comments = DS.getComments()
  return (
    <>
      <div className="feed-header"><h2 className="feed-title">내가 쓴 글</h2></div>
      {!posts.length ? <div className="empty-state fade-in"><p>아직 작성한 글이 없습니다.</p></div> :
        posts.map(p => (
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
