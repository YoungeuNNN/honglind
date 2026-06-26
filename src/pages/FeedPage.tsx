import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthAction } from '@/hooks/useAuthAction'
import * as DS from '@/api/dataService'
import { CATEGORY_LABELS, MARKET_STATUS_LABELS } from '@/utils/constants'
import { timeAgo } from '@/utils/helpers'
import { HeartIcon, CommentIcon, EyeIcon } from '@/components/ui/Icons'
import { CategoryPreview } from '@/components/home/CategoryPreview'
import type { Post } from '@/types'

const CATEGORIES = [
  { category: '인기', label: '인기글', emoji: '🔥' },
  { category: '자유', label: '자유게시판', emoji: '💬' },
  { category: '사역고민', label: '사역 고민', emoji: '🙏' },
  { category: '신학토론', label: '신학 토론', emoji: '📖' },
  { category: '설교준비', label: '설교 준비', emoji: '🎙️' },
  { category: '기도요청', label: '기도요청', emoji: '🕊️' },
  { category: '연봉', label: '사례비/처우', emoji: '💰' },
  { category: '사역장터', label: '사역장터', emoji: '🛒' },
  // { category: '청빙', label: '청빙 공고', emoji: '📢' },  // 숨김 — 커뮤니티 성장 후 오픈
]

export function FeedPage() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  useUIStore(s => s.dataVersion)  // 데이터 갱신(탭 복귀 새로고침) 시 피드/트렌딩 재렌더 구독
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const category = searchParams.get('category') || 'all'
  const search = searchParams.get('search') || ''

  // 목록/제목/메타는 누구나 본다. 본문은 글 상세에서 승인 회원에게만 노출.
  const blockedIds = user ? DS.getBlockedIds(user.id) : []
  const allPosts = DS.getPosts()

  // 전체 홈페이지 뷰 (카테고리별 미리보기)
  if (category === 'all' && !search) {
    return (
      <>
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
                commentCounts={{}}
                alwaysShow={cat.category !== '인기'}
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
        visiblePosts.map(p => <PostCard key={p.id} post={p} commentCount={p.commentCount} userId={user?.id} onClick={guard(() => navigate(`/post/${p.id}`))} />)
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
  const isMarket = p.category === '사역장터' && p.market
  const isPR = p.category === '기도요청'

  return (
    <div
      className={`post-card ${isCB ? 'cheongbing' : ''} fade-in`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
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
      {isMarket && p.market && (
        <div className="cheongbing-meta">
          <span className="cheongbing-tag">{p.market.type}</span>
          {p.market.price && <span className="cheongbing-tag">{p.market.price}</span>}
          <span className="cheongbing-tag" style={{ color: MARKET_STATUS_LABELS[p.market.status]?.color, fontWeight: 700 }}>{MARKET_STATUS_LABELS[p.market.status]?.label}</span>
        </div>
      )}
      {p.content && <div className="post-card-body">{p.content}</div>}
      <div className="post-card-footer">
        <span><HeartIcon filled={p.likes.includes(userId || '')} color="var(--primary)" /> {p.likes.length}</span>
        <span><CommentIcon /> {commentCount}</span>
        <span><EyeIcon /> {p.views}</span>
        {isPR && p.prayers && <span className="prayer-count">{'\u{1F64F}'} {p.prayers.length}</span>}
      </div>
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
        <div
          key={a.id}
          className="announcement-card fade-in"
          onClick={guard(() => navigate('/admin'))}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); guard(() => navigate('/admin'))() } }}
        >
          <span className="announcement-badge">공지</span>
          <strong>{a.title}</strong>
          <span style={{ fontSize: 12, color: 'var(--subtext)', marginLeft: 8 }}>{timeAgo(a.createdAt)}</span>
        </div>
      ))}
    </>
  )
}

// 실시간 인기(트렌딩) 산정 기준 — 최근 N일 글만 후보로, 참여도 가중 점수로 정렬.
// 숫자만 바꾸면 기준이 조정됩니다.
const TRENDING_WINDOW_DAYS = 7                                   // 최근 며칠 글까지 후보로 볼지
const TRENDING_W = { view: 1, like: 3, comment: 5, prayer: 3 }   // 항목별 가중치

function trendingScore(p: Post): number {
  return p.views * TRENDING_W.view
    + p.likes.length * TRENDING_W.like
    + p.commentCount * TRENDING_W.comment
    + (p.prayers?.length ?? 0) * TRENDING_W.prayer
}

// 최근 N일 내 글만 후보로, 가중 점수 높은 순 상위 5개.
// (Date.now 를 컴포넌트 렌더 밖 일반 함수로 두어 순수성 규칙을 지킴)
function computeTrending(posts: Post[]): Post[] {
  const now = Date.now()
  const windowMs = TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recent = posts.filter(p => now - new Date(p.createdAt).getTime() <= windowMs)
  const pool = recent.length >= 5 ? recent : posts  // 최근 글이 적으면 전체로 폴백(섹션이 비지 않게)
  return [...pool]
    .sort((a, b) =>
      trendingScore(b) - trendingScore(a) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
}

function TrendingSection() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const trending = computeTrending(DS.getPosts())
  if (!trending.length) return null
  return (
    <div className="trending-section fade-in">
      <h3>{'\u{1F525}'} 실시간 인기</h3>
      {trending.map((p, i) => (
        <div
          key={p.id}
          className="trending-item"
          onClick={guard(() => navigate(`/post/${p.id}`))}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); guard(() => navigate(`/post/${p.id}`))() } }}
        >
          <span className="trending-rank">{i + 1}</span>
          <span className={`post-category cat-${p.category}`} style={{ fontSize: 11, padding: '1px 6px' }}>{p.category}</span>
          <span className="trending-title">{p.title}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 12, color: 'var(--subtext)', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><HeartIcon size={13} color="var(--primary)" /> {p.likes.length}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><CommentIcon size={13} /> {p.commentCount}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
