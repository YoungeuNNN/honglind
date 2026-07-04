import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthAction } from '@/hooks/useAuthAction'
import * as DS from '@/api/dataService'
import { CATEGORY_LABELS, MARKET_STATUS_LABELS, isCategoryIndexable } from '@/utils/constants'
import { timeAgo } from '@/utils/helpers'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { HeartIcon, CommentIcon, EyeIcon, CategoryIcon } from '@/components/ui/Icons'
import { CategoryPreview } from '@/components/home/CategoryPreview'
import { AdSlot } from '@/components/ui/AdSlot'
import type { Post } from '@/types'

const CATEGORIES = [
  { category: '자유', label: '자유게시판', emoji: '💬' },
  { category: '사역고민', label: '사역 고민', emoji: '🙏' },
  { category: '기도요청', label: '기도 요청', emoji: '🕊️' },
  { category: '사역장터', label: '사역장터', emoji: '🛒' },
  { category: '청빙', label: '청빙 공고', emoji: '📢' },
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

  // 피드(홈/카테고리/검색) 화면 전체를 흰 배경으로 (블라인드식 풀-화이트). 다른 화면은 회색 유지.
  useEffect(() => {
    document.body.classList.add('feed-white')
    return () => document.body.classList.remove('feed-white')
  }, [])

  // SEO: 홈/게시판 목록은 색인 허용. 카테고리별 화면은 라벨을 제목에 반영하고,
  // 민감 보드(CATEGORY_INDEXABLE=false)를 보고 있으면 그 화면은 noindex 로 뺀다.
  const isBoardView = category !== 'all' && category !== '인기' && !search
  useSeoMeta({
    title: isBoardView ? CATEGORY_LABELS[category] : undefined,
    description: '사역자와 신학생을 위한 익명 커뮤니티 홍라인드. 사역 고민, 기도 요청, 청빙, 사례비까지 함께 나눠요.',
    robots: isBoardView && !isCategoryIndexable(category) ? 'noindex, follow' : 'index, follow',
  })

  // 목록/제목/메타는 누구나 본다. 본문은 글 상세에서 승인 회원에게만 노출.
  const blockedIds = user ? DS.getBlockedIds(user.id) : []
  const allPosts = DS.getPosts()

  // 전체 홈페이지 뷰 (카테고리별 미리보기)
  if (category === 'all' && !search) {
    return (
      <div className="home-view">
        <div className="home-main">
        <AnnouncementSection />
        <TrendingSection />

        <div className="home-content">
          {CATEGORIES.map(cat => {
            const categoryPosts = allPosts.filter(p => {
              if (blockedIds.length && blockedIds.includes(p.authorId)) return false
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
                alwaysShow
              />
            )
          })}
        </div>
        </div>
        <aside className="home-rail"><AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_RAIL} /></aside>
      </div>
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
        visiblePosts.map(p => <PostCard key={p.id} post={p} commentCount={p.commentCount} userId={user?.id} showCategory={!!search} onClick={guard(() => navigate(`/post/${p.id}`))} />)
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

function PostCard({ post: p, commentCount, userId, onClick, showCategory = false }: { post: Post; commentCount: number; userId?: string; onClick: () => void; showCategory?: boolean }) {
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
        {showCategory && <span className={`post-category cat-${p.category}`}>{p.category}</span>}
        {p.prayerAnswered &&<span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--warm)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>&#10024; 응답</span>}
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

// 인기글(트렌딩) 산정 기준 — 최근 N일 글만 후보로, "참여도 + 시간 감쇠"로 정렬.
// 숫자만 바꾸면 기준이 조정됩니다.
const TRENDING_WINDOW_DAYS = 7                                   // 최근 며칠 글까지 후보로 볼지
const TRENDING_W = { view: 1, like: 3, comment: 5, prayer: 3 }   // 항목별 가중치
const TRENDING_GRAVITY = 1.7                                     // 클수록 최신글을 더 강하게 밀어줌(오래된 글은 더 빨리 하락)
const TRENDING_FRESH_BONUS = 5                                   // 참여가 적은 갓 올라온 글도 잠깐 노출되게 하는 기본 점수

function engagementScore(p: Post): number {
  return p.views * TRENDING_W.view
    + p.likes.length * TRENDING_W.like
    + p.commentCount * TRENDING_W.comment
    + (p.prayers?.length ?? 0) * TRENDING_W.prayer
}

// 참여도에 시간 감쇠를 적용(Hacker News 방식): 최신일수록 점수↑, 시간이 지나면 같은 참여수라도 점수가 떨어져 자연히 밀려남.
function trendingScore(p: Post, nowMs: number): number {
  const ageHours = Math.max(0, (nowMs - new Date(p.createdAt).getTime()) / 3_600_000)
  return (engagementScore(p) + TRENDING_FRESH_BONUS) / Math.pow(ageHours + 2, TRENDING_GRAVITY)
}

// 최근 N일 내 글만 후보로, 가중 점수 높은 순 상위 10개.
// (Date.now 를 컴포넌트 렌더 밖 일반 함수로 두어 순수성 규칙을 지킴)
function computeTrending(posts: Post[]): Post[] {
  const now = Date.now()
  const windowMs = TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recent = posts.filter(p => now - new Date(p.createdAt).getTime() <= windowMs)
  const pool = recent.length >= 5 ? recent : posts  // 최근 글이 적으면 전체로 폴백(섹션이 비지 않게)
  return [...pool]
    .sort((a, b) =>
      trendingScore(b, now) - trendingScore(a, now) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
}

function TrendingSection() {
  const navigate = useNavigate()
  const guard = useAuthAction()
  const trending = computeTrending(DS.getPosts())
  if (!trending.length) return null
  return (
    <div className="trending-section fade-in">
      <div className="category-preview-header">
        <div className="category-preview-title">
          <h3>전체 인기글</h3>
        </div>
        <button className="category-preview-more" onClick={() => navigate('/?category=인기')}>더보기</button>
      </div>
      {trending.map((p) => (
        <div
          key={p.id}
          className="trending-item"
          onClick={guard(() => navigate(`/post/${p.id}`))}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); guard(() => navigate(`/post/${p.id}`))() } }}
        >
          <span className="trending-icon" title={p.category}><CategoryIcon category={p.category} size={13} /></span>
          <span className="trending-board">{CATEGORY_LABELS[p.category] || p.category}</span>
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
