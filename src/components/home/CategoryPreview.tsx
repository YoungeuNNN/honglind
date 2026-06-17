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
}

export function CategoryPreview({ category, categoryLabel, emoji, posts }: CategoryPreviewProps) {
  const navigate = useNavigate()
  const guard = useAuthAction()

  if (!posts.length) return null

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
          onClick={() => navigate(category === 'all' ? '/' : `/?category=${category}`)}
        >
          더보기
        </button>
      </div>
      <div className="category-preview-posts">
        {displayPosts.map((post) => (
          <div
            key={post.id}
            className="category-preview-post"
            onClick={guard(() => navigate(`/post/${post.id}`))}
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