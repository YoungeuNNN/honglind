import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthAction } from '@/hooks/useAuthAction'
import * as DS from '@/api/dataService'
import { CATEGORY_LABELS } from '@/utils/constants'
import { timeAgo, getDailyVerse } from '@/utils/helpers'
import { HeartIcon, CommentIcon, EyeIcon } from '@/components/ui/Icons'
import { CategoryPreview } from '@/components/home/CategoryPreview'
import type { Post } from '@/types'

const CATEGORIES = [
  { category: '인기', label: '인기글', emoji: '🔥' },
  { category: '자유', label: '자유게시판', emoji: '💬' },
  { category: '사역고민', label: '사역 고민', emoji: '🙏' },
  { category: '교회생활', label: '교회생활', emoji: '⛪' },
  { category: '신학교', label: '신학교생활', emoji: '🎓' },
  { category: '신학토론', label: '신학 토론', emoji: '📖' },
  { category: '설교나눔', label: '설교 나눔', emoji: '⛳' },
  { category: '기도요청', label: '기도요청', emoji: '🕊️' },
  { category: '연봉', label: '사례비/처우', emoji: '💰' },
  { category: '청빙', label: '청빙 공고', emoji: '📢' },
]

export function FeedPage() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const category = searchParams.get('category') || 'all'
  const search = searchParams.get('search') || ''

  const blockedIds = user ? DS.getBlockedIds(user.id) : []
  const allPosts = DS.getPosts()
  const allComments = DS.getComments()
  
  // 댓글 수 미리 계산
  const commentCounts: { [postId: string]: number } = {}
  allComments.forEach(comment => {
    commentCounts[comment.postId] = (commentCounts[comment.postId] || 0) + 1
  })

  // 전체 홈페이지 뷰 (카테고리별 미리보기)
  if (category === 'all' && !search) {
    return (
      <>
        <DailyVerseSection />
        <AnnouncementSection />
        <TrendingSection />
        
        <div className="home-content">
          {CATEGORIES.map(cat => {
            const categoryPosts = allPosts.filter(p => {
              if (blockedIds.length && blockedIds.includes(p.authorId)) return false
              if (cat.category === '인기') return p.likes.length >= 3
              return p.category === cat.category
            })
            
            categoryPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            
            return (
              <CategoryPreview
                key={cat.category}
                category={cat.category}
                categoryLabel={cat.label}
                emoji={cat.emoji}
                posts={categoryPosts}
                commentCounts={commentCounts}
              />
            )
          })}
        </div>
      </>
    )
  }

  // 기존 카테고리별 상세 뷰
  let posts = allPosts
  if (blockedIds.length) posts = posts.filter(p => !blockedIds.includes(p.authorId))
  if (search) {
    const q = search.toLowerCase()
    posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
  } else if (category === '인기') {
    posts = posts.filter(p => p.likes.length >= 3)
  } else if (category !== 'all') {
    posts = posts.filter(p => p.category === category)
  }

  if (sort === 'popular') posts.sort((a, b) => b.likes.length - a.likes.length)
  else posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalPosts = posts.length
  const showCount = (page + 1) * pageSize
  const hasMore = totalPosts > showCount
  const visiblePosts = posts.slice(0, showCount)

  const catTitle = category === 'all' ? '전체 피드' : category === '인기' ? '인기글' : (CATEGORY_LABELS[category] || category)

  return (
    <>
      {/* Header */}
      <div className="feed-header">
        <h2 className="feed-title">{search ? `"${search}" 검색 결과` : catTitle}</h2>
        <div className="feed-sort">
          <button className={sort === 'latest' ? 'active' : ''} onClick={() => { setSort('latest'); setPage(0) }}>최신순</button>
          <button className={sort === 'popular' ? 'active' : ''} onClick={() => { setSort('popular'); setPage(0) }}>인기순</button>
        </div>
      </div>

      {/* Post List */}
      {!visiblePosts.length ? (
        <div className="empty-state fade-in"><p>{search ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}</p></div>
      ) : (
        visiblePosts.map(p => <PostCard key={p.id} post={p} commentCount={commentCounts[p.id] || 0} userId={user?.id} onClick={guard(() => navigate(`/post/${p.id}`))} />)
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} style={{ minWidth: 200 }}>
            더 보기 ({totalPosts - showCount}개 남음)
          </button>
        </div>
      )}
    </>
  )
}

function PostCard({ post: p, commentCount, userId, onClick }: { post: Post; commentCount: number; userId?: string; onClick: () => void }) {
  const isCB = p.category === '청빙' && p.cheongbing
  const isPR = p.category === '기도요청'

  return (
    <div className={`post-card ${isCB ? 'cheongbing' : ''} fade-in`} onClick={onClick}>
      <div className="post-card-header">
        <span className={`post-category cat-${p.category}`}>{p.category}</span>
        {p.prayerAnswered && <span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--warm)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>&#10024; 응답</span>}
        <span className="post-time">{timeAgo(p.createdAt)}</span>
      </div>
      <div className="post-card-title">{p.title}</div>
      {isCB && p.cheongbing && (
        <div className="cheongbing-meta">
          <span className="cheongbing-tag">{p.cheongbing.position}</span>
          <span className="cheongbing-tag">{p.cheongbing.region}</span>
          <span className="cheongbing-tag">{p.cheongbing.denomination}</span>
          <span className="cheongbing-tag">마감: {p.cheongbing.deadline}</span>
        </div>
      )}
      <div className="post-card-body">{p.content}</div>
      <div className="post-card-footer">
        <span><HeartIcon filled={p.likes.includes(userId || '')} color="var(--primary)" /> {p.likes.length}</span>
        <span><CommentIcon /> {commentCount}</span>
        <span><EyeIcon /> {p.views}</span>
        {isPR && p.prayers && <span className="prayer-count">{'\u{1F64F}'} {p.prayers.length}</span>}
      </div>
    </div>
  )
}

function DailyVerseSection() {
  const v = getDailyVerse()
  return (
    <div className="daily-verse fade-in">
      <h3>{'\u{1F4D6}'} 오늘의 말씀</h3>
      <div className="vt">"{v.text}"</div>
      <div className="vr">- {v.ref} -</div>
    </div>
  )
}

function AnnouncementSection() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const anns = DS.getAnnouncements()
  if (!anns.length) return null
  return (
    <>
      {anns.map(a => (
        <div key={a.id} className="announcement-card fade-in" onClick={guard(() => navigate('/admin'))}>
          <span className="announcement-badge">공지</span>
          <strong>{a.title}</strong>
          <span style={{ fontSize: 12, color: 'var(--subtext)', marginLeft: 8 }}>{timeAgo(a.createdAt)}</span>
        </div>
      ))}
    </>
  )
}

function TrendingSection() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const trending = [...DS.getPosts()].sort((a, b) => b.views - a.views).slice(0, 5)
  return (
    <div className="trending-section fade-in">
      <h3>{'\u{1F525}'} 실시간 인기</h3>
      {trending.map((p, i) => (
        <div key={p.id} className="trending-item" onClick={guard(() => navigate(`/post/${p.id}`))}>
          <span className="trending-rank">{i + 1}</span>
          <span className={`post-category cat-${p.category}`} style={{ fontSize: 11, padding: '1px 6px' }}>{p.category}</span>
          <span className="trending-title">{p.title}</span>
        </div>
      ))}
    </div>
  )
}
