import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useToastStore } from '@/stores/toastStore'
import * as DS from '@/api/dataService'
import { timeAgo } from '@/utils/helpers'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { MARKET_STATUS_LABELS, CATEGORY_LABELS, isCategoryIndexable } from '@/utils/constants'
import { HeartIcon, BackIcon, FlagIcon, ShareIcon, BookmarkIcon } from '@/components/ui/Icons'
import { ChurchSalaryPanel } from '@/components/salary/ChurchSalaryPanel'
import type { Comment as CommentType, Post } from '@/types'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { openReportModal, openVerifyPrompt } = useUIStore()
  const toast = useToastStore(s => s.show)
  const [, setTick] = useState(0)
  const rerender = () => setTick(t => t + 1)
  const [commentText, setCommentText] = useState('')

  const post = id ? DS.getPostById(id) : undefined
  const isOwner = !!user && post?.authorId === user.id
  const isAdmin = user?.role === 'admin'

  // 조회수 증가 — 진입 시 1회만. 본인 글은 제외(관리자는 카운트함),
  // 같은 브라우저 세션에서 같은 글은 한 번만 집계(새로고침·재방문 중복 방지).
  useEffect(() => {
    if (!id || isOwner) return
    const KEY = 'viewed_posts'
    let viewed: string[] = []
    try { viewed = JSON.parse(sessionStorage.getItem(KEY) || '[]') } catch { /* ignore */ }
    if (viewed.includes(id)) return
    try { sessionStorage.setItem(KEY, JSON.stringify([...viewed, id])) } catch { /* ignore */ }
    DS.incrementViews(id).then(rerender).catch(console.error)
  }, [id, isOwner])

  // SEO: 제목·카테고리는 색인, 본문은 게이트되므로 설명은 일반 안내문으로(본문 유출 방지).
  // 보드별 색인 정책(CATEGORY_INDEXABLE)에 따라 민감 보드는 noindex 로 빠짐.
  useSeoMeta({
    title: post?.title,
    description: post
      ? `[${CATEGORY_LABELS[post.category] || post.category}] 사역자·신학생 익명 커뮤니티 홍라인드. 로그인하면 전문과 댓글을 볼 수 있어요.`
      : undefined,
    robots: post && !isCategoryIndexable(post.category) ? 'noindex, follow' : 'index, follow',
  })

  if (!post) { navigate('/'); return null }

  const allComments = DS.getComments().filter(c => c.postId === post.id)
  const topComments = allComments.filter(c => !c.parentId)
  const isLiked = user ? post.likes.includes(user.id) : false
  const isPR = post.category === '기도요청'
  const hasPrayed = user ? post.prayers?.includes(user.id) : false
  const isCB = post.category === '청빙' && post.cheongbing
  const isMarket = post.category === '사역장터' && post.market
  // 본문/댓글 등 '내용'은 학생증 승인 회원에게만
  const canSeeContent = !!user && (user.membershipStatus === 'approved' || user.role === 'admin')
  const reported = user ? DS.hasReported(user.id, 'post', post.id) : false
  const bookmarked = user ? DS.isBookmarked(user.id, post.id) : false
  const authorLabel = isOwner ? '나' : (post.authorId === 'deleted' ? '탈퇴한 사용자' : (DS.getUserById(post.authorId)?.nickname ?? '익명'))

  const toggleLike = async () => {
    if (!user) return
    try {
      const liked = await DS.togglePostLike(post.id)
      if (liked && post.authorId !== 'deleted' && post.authorId !== user.id) {
        await DS.createNotification({ userId: post.authorId, type: 'like', postId: post.id, message: '누군가 회원님의 글을 좋아합니다.', read: false })
      }
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  // 관리자 전용: 가산 좋아요 ±1
  const adjustLikeBoost = async (delta: number) => {
    try { await DS.adminAdjustPostLikeBoost(post.id, delta); rerender() }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const togglePrayer = async () => {
    if (!user) return
    try {
      const prayed = await DS.togglePostPrayer(post.id)
      if (prayed) {
        toast('함께 기도합니다.')
        if (post.authorId !== 'deleted' && post.authorId !== user.id) {
          await DS.createNotification({ userId: post.authorId, type: 'prayer', postId: post.id, message: '누군가 회원님의 기도요청에 함께 기도합니다.', read: false })
        }
      }
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await DS.deletePost(post.id)
      toast('게시글이 삭제되었습니다.')
      navigate('/')
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const handleBookmark = async () => {
    if (!user) return
    try {
      const added = await DS.toggleBookmark(user.id, post.id)
      toast(added ? '게시글을 저장했습니다.' : '저장을 취소했습니다.')
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const handleShare = () => {
    const url = `${location.origin}/post/${post.id}`
    navigator.clipboard?.writeText(url).then(() => toast('링크가 복사되었습니다.'))
  }

  const handleBlock = async (blockedId: string) => {
    if (!user || !confirm('이 사용자를 차단하시겠습니까?\n\n차단하면 해당 사용자의 글과 댓글이 보이지 않습니다.')) return
    try {
      await DS.blockUser(user.id, blockedId)
      toast('사용자를 차단했습니다.')
      navigate('/')
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const addComment = async () => {
    if (!user || !commentText.trim()) return
    if (user.verificationStatus !== 'verified' && user.role !== 'admin') { openVerifyPrompt(); return }
    try {
      await DS.createComment({ postId: post.id, authorId: user.id, parentId: null, content: commentText.trim() })
      if (post.authorId !== 'deleted' && post.authorId !== user.id) {
        await DS.createNotification({ userId: post.authorId, type: 'comment', postId: post.id, message: '누군가 회원님의 글에 댓글을 남겼습니다.', read: false })
      }
      setCommentText('')
      toast('댓글이 등록되었습니다.')
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const togglePrayerAnswered = async () => {
    if (!user) return
    try {
      await DS.updatePost(post.id, { prayerAnswered: !post.prayerAnswered })
      toast(!post.prayerAnswered ? '기도 응답을 표시했습니다.' : '기도 응답 표시를 취소했습니다.')
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const setMarketStatus = async (status: 'available' | 'reserved' | 'done') => {
    if (!user || !post.market) return
    try {
      await DS.updatePost(post.id, { market: { ...post.market, status } })
      toast('거래 상태를 변경했습니다.')
      rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  return (
    <>
      <div className="back-btn" onClick={() => navigate('/')} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/') } }}><BackIcon /> 목록으로</div>
      <div className="post-detail fade-in">
        <div className="post-detail-header">
          <span className={`post-category cat-${post.category}`}>{post.category}</span>
          <h1 className="post-detail-title">{post.title}</h1>
          <div className="post-detail-meta">
            <span className="author">{authorLabel}</span>
            <span>&middot;</span><span>{timeAgo(post.createdAt)}</span>
            <span>&middot;</span><span>조회 {post.views}</span>
            {post.updatedAt && <span>&middot; 수정됨</span>}
          </div>
        </div>

        {canSeeContent && isCB && post.cheongbing && (
          <div className="cheongbing-fields" style={{ margin: '16px 0' }}>
            <h4>{'\u{1F4E3}'} 청빙 정보</h4>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <tbody>
                {[['직분', post.cheongbing.position], ['교단', post.cheongbing.denomination], ['지역', post.cheongbing.region],
                  ['교회 규모', post.cheongbing.churchSize], ['사례비', post.cheongbing.salary],
                  ['마감일', post.cheongbing.deadline], ['연락처', post.cheongbing.contact]
                ].map(([label, val]) => (
                  <tr key={label}><td style={{ padding: '6px 0', fontWeight: 600, width: 100, color: '#555' }}>{label}</td><td>{val || '-'}</td></tr>
                ))}
              </tbody>
            </table>
            {post.cheongbing.sourceUrl && (
              <a href={post.cheongbing.sourceUrl} target="_blank" rel="noopener nofollow"
                style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                원문 공고 보기 &#8599;
              </a>
            )}
          </div>
        )}

        {canSeeContent && isCB && post.cheongbing && (
          <ChurchSalaryPanel churchKey={post.cheongbing.churchKey} churchName={post.cheongbing.region} />
        )}

        {canSeeContent && isMarket && post.market && (
          <div className="cheongbing-fields" style={{ margin: '16px 0', background: '#FFF8E1', borderColor: '#FFE0B2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h4 style={{ color: '#E65100', margin: 0 }}>{'\u{1F6D2}'} 거래 정보</h4>
              <span className="post-category" style={{ background: 'var(--bg)', color: (MARKET_STATUS_LABELS[post.market.status]?.color), fontWeight: 700 }}>
                {MARKET_STATUS_LABELS[post.market.status]?.label}
              </span>
            </div>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <tbody>
                {[['거래 유형', post.market.type], ['가격', post.market.price], ['연락 방법', post.market.contact]].map(([label, val]) => (
                  <tr key={label}><td style={{ padding: '6px 0', fontWeight: 600, width: 100, color: '#555' }}>{label}</td><td>{val || '-'}</td></tr>
                ))}
              </tbody>
            </table>
            {!!post.attachments.length && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>첨부 자료</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {post.attachments.map(a => (
                    a.kind === 'image'
                      ? <a key={a.path} href={DS.getMarketFileUrl(a.path)} target="_blank" rel="noopener noreferrer">
                          <img src={DS.getMarketFileUrl(a.path)} alt={a.name} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                        </a>
                      : <a key={a.path} href={DS.getMarketFileUrl(a.path)} target="_blank" rel="noopener noreferrer" className="cheongbing-tag" style={{ textDecoration: 'none' }}>{'\u{1F4CE}'} {a.name}</a>
                  ))}
                </div>
              </div>
            )}
            {isOwner && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {(['available', 'reserved', 'done'] as const).map(s => (
                  <button key={s} className={`btn btn-small ${post.market!.status === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMarketStatus(s)}>
                    {MARKET_STATUS_LABELS[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {canSeeContent && post.sermonVerse && (
          <div style={{ background: 'linear-gradient(135deg,#4A148C,#7B1FA2)', borderRadius: 'var(--radius-md)', padding: '16px 20px', margin: '16px 0', color: '#fff' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{'\u{1F4D6}'} 본문 말씀</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{post.sermonVerse}</div>
          </div>
        )}

        {isPR && post.prayerAnswered && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '12px 16px', margin: '16px 0', fontSize: 14, color: 'var(--warm)', fontWeight: 600 }}>
            &#10024; 이 기도요청은 응답을 받았습니다. 감사합니다!
          </div>
        )}

        {canSeeContent ? (
          <div className="post-detail-body">{post.content}</div>
        ) : !user ? (
          <div className="cheongbing-fields" style={{ margin: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F512}'}</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>이 글의 본문은 로그인 후 볼 수 있습니다</div>
            <div style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 10 }}>좋아요 {post.likes.length} · 댓글 {post.commentCount}</div>
            <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 14, lineHeight: 1.6 }}>홍라인드는 사역자·신학생을 위한 익명 커뮤니티예요. 로그인하면 본문과 댓글을 모두 보실 수 있어요.</p>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>로그인하고 본문 보기</button>
          </div>
        ) : (
          <div className="cheongbing-fields" style={{ margin: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F512}'}</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>이 글의 내용은 학생증 승인 후 볼 수 있습니다</div>
            <div style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 10 }}>좋아요 {post.likes.length} · 댓글 {post.commentCount}</div>
            <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 14, lineHeight: 1.6 }}>학생증 인증을 마치면 본문과 댓글을 모두 보실 수 있어요.</p>
            <button className="btn btn-primary" onClick={() => navigate('/settings')}>학생증 인증하러 가기</button>
          </div>
        )}

        {/* Poll */}
        {canSeeContent && post.poll && <PollSection post={post} userId={user?.id} rerender={rerender} />}

        {canSeeContent && (
        <div className="post-detail-actions">
          <button className={`btn-like ${isLiked ? 'active' : ''}`} onClick={toggleLike}>
            <HeartIcon filled={isLiked} /> 좋아요 {post.likes.length}
          </button>
          {user?.role === 'admin' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={`가산 좋아요 ${post.likeBoost ?? 0}`}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => adjustLikeBoost(-1)} aria-label="좋아요 1 감소">−</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => adjustLikeBoost(1)} aria-label="좋아요 1 증가">+</button>
            </span>
          )}
          {isPR && (
            <>
              <button className={`btn-pray ${hasPrayed ? 'active' : ''}`} onClick={togglePrayer}>
                {'\u{1F64F}'} 기도합니다 {post.prayers?.length || 0}
              </button>
              {isOwner && (
                <button className={`btn ${post.prayerAnswered ? 'btn-primary' : 'btn-secondary'} btn-small`} onClick={togglePrayerAnswered}>
                  {post.prayerAnswered ? '✓ 응답 받았습니다' : '응답 받음 표시'}
                </button>
              )}
            </>
          )}
          <button className={`btn-like ${bookmarked ? 'active' : ''}`} onClick={handleBookmark}>
            <BookmarkIcon filled={bookmarked} /> 저장
          </button>
          <button className="btn-text btn-small" onClick={handleShare}><ShareIcon /> 공유</button>
          {!isOwner && post.authorId !== 'deleted' && (
            <>
              <button className="btn-text btn-small" onClick={() => openReportModal('post', post.id)} disabled={reported} style={reported ? { opacity: 0.4 } : {}}>
                <FlagIcon /> {reported ? '신고완료' : '신고'}
              </button>
              <button className="btn-text btn-small" onClick={() => navigate(`/dm/${post.authorId}`)}>쪽지</button>
              <button className="btn-text btn-small" onClick={() => handleBlock(post.authorId)}>차단</button>
            </>
          )}
          {(isOwner || isAdmin) && (
            <div className="post-owner-actions">
              <button className="btn btn-secondary btn-small" onClick={() => navigate(`/write/${post.id}`)}>수정{!isOwner && isAdmin ? ' (관리자)' : ''}</button>
              <button className="btn btn-danger btn-small" onClick={handleDelete}>삭제</button>
            </div>
          )}
        </div>
        )}

        {/* Comments */}
        {canSeeContent && (
        <div className="comments-section">
          <div className="comments-title">댓글 <span>{allComments.length}</span></div>
          <div>
            {topComments.length === 0
              ? <div className="comments-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</div>
              : topComments.map(c => (
                  <CommentItem key={c.id} comment={c} allComments={allComments} postAuthorId={post.authorId} postId={post.id} rerender={rerender} />
                ))}
          </div>
          <div className="comment-input-area">
            <textarea placeholder="댓글을 입력하세요..." value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }} />
            <button className="btn btn-primary btn-small" onClick={addComment}>등록</button>
          </div>
        </div>
        )}
      </div>
    </>
  )
}

function CommentItem({ comment: c, allComments, postAuthorId, postId, rerender }: { comment: CommentType; allComments: CommentType[]; postAuthorId: string; postId: string; rerender: () => void }) {
  const { user } = useAuthStore()
  const { openReportModal, openVerifyPrompt } = useUIStore()
  const toast = useToastStore(s => s.show)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(c.content)

  const isOwner = c.authorId === user?.id
  const isAdmin = user?.role === 'admin'
  const blocked = user && !isOwner && DS.isBlocked(user.id, c.authorId)
  const isLiked = user ? c.likes.includes(user.id) : false
  const replies = allComments.filter(x => x.parentId === c.id)
  const isOP = c.authorId === postAuthorId
  const reported = user ? DS.hasReported(user.id, 'comment', c.id) : false
  const displayName = c.authorId === 'deleted' ? '탈퇴한 사용자' : isOwner ? '나' : (DS.getUserById(c.authorId)?.nickname ?? '익명')

  if (blocked) {
    return (
      <>
        <div className={`comment-item ${c.parentId ? 'reply' : ''}`} style={{ opacity: 0.5 }}>
          <div className="comment-body" style={{ fontStyle: 'italic', color: 'var(--subtext)', fontSize: 13 }}>차단된 사용자의 댓글입니다.</div>
        </div>
        {replies.map(r => <CommentItem key={r.id} comment={r} allComments={allComments} postAuthorId={postAuthorId} postId={postId} rerender={rerender} />)}
      </>
    )
  }

  const toggleLike = async () => {
    if (!user) return
    try { await DS.toggleCommentLike(c.id); rerender() }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const addReply = async () => {
    if (!user || !replyText.trim()) return
    if (user.verificationStatus !== 'verified' && user.role !== 'admin') { openVerifyPrompt(); return }
    try {
      await DS.createComment({ postId, authorId: user.id, parentId: c.id, content: replyText.trim() })
      if (c.authorId !== 'deleted' && c.authorId !== user.id) {
        await DS.createNotification({ userId: c.authorId, type: 'reply', postId, message: '누군가 회원님의 댓글에 답글을 남겼습니다.', read: false })
      }
      setReplyText(''); setShowReply(false); toast('답글이 등록되었습니다.'); rerender()
    } catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    try { await DS.deleteComment(c.id); toast('댓글이 삭제되었습니다.'); rerender() }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  const saveEdit = async () => {
    if (!editText.trim()) { toast('댓글 내용을 입력하세요.'); return }
    try { await DS.updateComment(c.id, { content: editText.trim() }); setEditing(false); toast('댓글이 수정되었습니다.'); rerender() }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  return (
    <>
      <div className={`comment-item ${c.parentId ? 'reply' : ''}`}>
        <div className="comment-header">
          <span className={`comment-author ${isOP ? 'is-op' : ''}`}>{displayName}</span>
          {isOP && !isOwner && <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4 }}>글쓴이</span>}
          <span className="comment-time">{timeAgo(c.createdAt)}{c.updatedAt ? ' (수정됨)' : ''}</span>
        </div>
        {editing ? (
          <>
            <textarea className="form-input" value={editText} onChange={e => setEditText(e.target.value)} style={{ fontSize: 13, minHeight: 60, resize: 'vertical' }} />
            <div className="comment-actions">
              <button className="btn btn-primary btn-small" onClick={saveEdit}>저장</button>
              <button className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>취소</button>
            </div>
          </>
        ) : (
          <>
            <div className="comment-body">{c.content}</div>
            <div className="comment-actions">
              <button className="btn-text btn-small" onClick={toggleLike} aria-label="댓글 좋아요" aria-pressed={isLiked} style={isLiked ? { color: 'var(--primary)' } : {}}>
                &#9829; {c.likes.length || ''}
              </button>
              {!c.parentId && <button className="btn-text btn-small" onClick={() => setShowReply(!showReply)}>답글</button>}
              {!isOwner && c.authorId !== 'deleted' && (
                <button className="btn-text btn-small" onClick={() => openReportModal('comment', c.id)} disabled={reported}>
                  {reported ? '신고완료' : '신고'}
                </button>
              )}
              {(isOwner || isAdmin) && <button className="btn-text btn-small" onClick={() => { setEditing(true); setEditText(c.content) }}>수정</button>}
              {(isOwner || isAdmin) && <button className="btn-text btn-small btn-danger" onClick={handleDelete}>삭제</button>}
            </div>
          </>
        )}
        {showReply && (
          <div className="reply-input-area">
            <textarea placeholder="답글을 입력하세요..." value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addReply() } }} />
            <button className="btn btn-primary btn-small" onClick={addReply}>등록</button>
          </div>
        )}
      </div>
      {replies.map(r => <CommentItem key={r.id} comment={r} allComments={allComments} postAuthorId={postAuthorId} postId={postId} rerender={rerender} />)}
    </>
  )
}

function PollSection({ post, userId, rerender }: { post: Post; userId?: string; rerender: () => void }) {
  const toast = useToastStore(s => s.show)
  if (!post.poll) return null
  const poll = post.poll
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0)
  const hasVoted = userId ? poll.options.some(o => o.votes.includes(userId)) : false

  const vote = async (idx: number) => {
    if (!userId || hasVoted) return
    try { await DS.togglePollVote(post.id, idx); toast('투표했습니다!'); rerender() }
    catch (e) { toast(e instanceof Error ? e.message : '오류') }
  }

  if (hasVoted || post.authorId === userId) {
    return (
      <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{'\u{1F4CA}'} 투표 결과 ({totalVotes}표)</div>
        {poll.options.map((o, i) => {
          const pct = totalVotes ? Math.round(o.votes.length / totalVotes * 100) : 0
          const isMyVote = userId ? o.votes.includes(userId) : false
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{isMyVote ? <strong>{o.text} &#10003;</strong> : o.text}</span>
                <span style={{ color: 'var(--subtext)' }}>{pct}% ({o.votes.length})</span>
              </div>
              <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ background: isMyVote ? 'var(--primary)' : 'var(--warm)', height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width .3s' }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{'\u{1F5F3}'} 투표하기</div>
      {poll.options.map((o, i) => (
        <button key={i} className="btn btn-secondary" onClick={() => vote(i)}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '10px 16px', fontSize: 14 }}>
          {o.text}
        </button>
      ))}
      <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 8 }}>{totalVotes}명 참여</div>
    </div>
  )
}
