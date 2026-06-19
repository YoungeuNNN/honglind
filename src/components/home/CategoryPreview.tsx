import { useNavigate } from 'react-router-dom'
import { EyeIcon } from '@/components/ui/Icons'
import { useAuthAction } from '@/hooks/useAuthAction'
import type { Post } from '@/types'

interface CategoryPreviewProps {
  category: string
  categoryLabel: string
  emoji: string
  posts: Post[]
  commentCounts: { [postId: string]: number }
  // 지정 시 제목/더보기 클릭이 이동 대신 이 핸들러를 호출 (게스트/미승인 잠금용)
  onLock?: () => void
  // true면 글이 없어도 섹션을 표시(빈 안내). false/미지정이면 글 없을 때 숨김.
  alwaysShow?: boolean
}

export function CategoryPreview({ category, categoryLabel, emoji, posts, onLock, alwaysShow = false }: CategoryPreviewProps) {
  const navigate = useNavigate()
  const guard = useAuthAction()

  if (!posts.length && !alwaysShow) return null

  const displayPosts = posts.slice(0, 5) // 최대 5개까지만 표시

  return (
    <div className="category-preview">
      <div className="category-preview-header">
        <div className="category-preview-title">
          <span className="category-preview-emoji">{emoji}</span>
          <h3>{categoryLabel}</h3>
        </div>
        <button
          className="category-preview-more"
          onClick={onLock ? onLock : () => navigate(category === 'all' ? '/' : `/?category=${category}`)}
        >
          더보기
        </button>
      </div>
      <div className="category-preview-posts">
        {displayPosts.length === 0 ? (
          <div style={{ padding: '12px 4px', fontSize: 13, color: 'var(--subtext)' }}>아직 글이 없습니다. 첫 글을 남겨보세요.</div>
        ) : displayPosts.map((post) => (
          <div
            key={post.id}
            className="category-preview-post"
            onClick={onLock ? onLock : guard(() => navigate(`/post/${post.id}`))}
          >
            <div className="preview-post-row">
              <div className="preview-post-title">{post.title}</div>
              <div className="preview-post-views">
                <EyeIcon size={14} color="var(--subtext)" /> {post.views}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}