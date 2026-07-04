/**
 * DataService - Supabase 백엔드 + In-memory Cache
 *
 * 전략:
 *   - 부팅 시 loadAll() 로 모든 데이터를 한 번 fetch → 메모리 cache
 *   - get/find/is/has 함수: cache 에서 동기 반환 (기존 인터페이스 유지)
 *   - create/update/delete 함수: async — supabase 에 쓰고 cache 갱신
 *
 * 인증은 Supabase Auth (auth.users + profiles).
 */
import { supabase } from './supabase'
import { MIN_WAGE_HOURLY } from '@/utils/constants'
import type {
  User, Post, Comment, Notification, Message,
  Report, Block, Bookmark, Announcement, Conversation,
  Poll, PollOption, AllowedDomain, SignUpResult,
  SalaryReport, SalaryReportInput, SalaryAggRow, ChurchSalaryAgg, SalaryOverview,
} from '@/types'

// ════════════════════════════════════════════════════════════
// In-Memory Cache
// ════════════════════════════════════════════════════════════

interface Cache {
  users: User[]
  usersById: Map<string, User>
  posts: Post[]
  postsById: Map<string, Post>
  comments: Comment[]
  bookmarks: Bookmark[]
  blocks: Block[]
  notifications: Notification[]
  messages: Message[]
  reports: Report[]
  announcements: Announcement[]
  allowedDomains: AllowedDomain[]
}

const cache: Cache = {
  users: [], usersById: new Map(),
  posts: [], postsById: new Map(),
  comments: [],
  bookmarks: [],
  blocks: [],
  notifications: [],
  messages: [],
  reports: [],
  announcements: [],
  allowedDomains: [],
}

let loaded = false
let loading: Promise<void> | null = null

/** 캐시를 강제로 다시 불러온다(탭 복귀 시 최신화용). 동시 호출은 1건으로 합쳐 중복 fetch 방지. */
export async function refresh(): Promise<void> {
  if (loading) return loading
  loaded = false
  loading = loadAll().finally(() => { loading = null })
  return loading
}

// ════════════════════════════════════════════════════════════
// DB Row → App Model 매핑
// ════════════════════════════════════════════════════════════

interface ProfileRow {
  id: string; nickname: string; email: string | null; affiliation: string | null
  role: string; banned: boolean; created_at: string
  membership_status: string | null; membership_note: string | null
  student_id_doc: string | null; enrollment_doc: string | null
  verification_status: string | null; verification_note: string | null; verified_at: string | null
}
function rowToUser(r: ProfileRow): User {
  return {
    id: r.id,
    nickname: r.nickname,
    email: r.email ?? '',
    affiliation: r.affiliation ?? undefined,
    role: (r.role === 'admin' ? 'admin' : 'user'),
    banned: r.banned,
    membershipStatus: (r.membership_status as User['membershipStatus']) ?? 'pending',
    membershipNote: r.membership_note,
    studentIdDoc: r.student_id_doc,
    enrollmentDoc: r.enrollment_doc,
    verificationStatus: (r.verification_status as User['verificationStatus']) ?? 'unverified',
    verificationNote: r.verification_note,
    verifiedAt: r.verified_at,
    createdAt: r.created_at,
  }
}

interface PostRow {
  id: string; author_id: string | null; category: string; title: string; content: string
  views: number; cheongbing: Post['cheongbing']; sermon_verse: string | null
  market: Post['market']; attachments: Post['attachments'] | null
  prayer_answered: boolean; created_at: string; updated_at: string | null
  like_boost?: number | null
}

// 관리자 가산 좋아요용 placeholder id (실제 user id 와 충돌하지 않도록 '~b' 접두사)
function boostLikes(count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => `~b${i}`)
}

function rowToPost(r: PostRow, likes: string[], prayers: string[] | null, poll: Poll | null): Post {
  return {
    id: r.id,
    authorId: r.author_id ?? 'deleted',
    category: r.category,
    title: r.title,
    content: r.content ?? '',
    likes,
    likeBoost: Number(r.like_boost) || 0,
    views: r.views,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cheongbing: r.cheongbing,
    market: r.market ?? null,
    attachments: r.attachments ?? [],
    prayers,
    prayerAnswered: r.prayer_answered,
    sermonVerse: r.sermon_verse,
    poll,
    commentCount: 0,
  }
}

interface CommentRow {
  id: string; post_id: string; author_id: string | null; parent_id: string | null
  content: string; created_at: string; updated_at: string | null
}
function rowToComment(r: CommentRow, likes: string[]): Comment {
  return {
    id: r.id, postId: r.post_id,
    authorId: r.author_id ?? 'deleted',
    parentId: r.parent_id,
    content: r.content,
    likes,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }
}

interface NotificationRow {
  id: string; user_id: string; type: string; post_id: string | null
  message: string | null; read: boolean; created_at: string
}
function rowToNotification(r: NotificationRow): Notification {
  return {
    id: r.id, userId: r.user_id,
    type: r.type as Notification['type'],
    postId: r.post_id ?? '',
    message: r.message ?? '',
    read: r.read,
    createdAt: r.created_at,
  }
}

interface MessageRow {
  id: string; sender_id: string; receiver_id: string
  content: string; read: boolean; created_at: string
}
function rowToMessage(r: MessageRow): Message {
  return {
    id: r.id, senderId: r.sender_id, receiverId: r.receiver_id,
    content: r.content, read: r.read, createdAt: r.created_at,
  }
}

interface ReportRow {
  id: string; reporter_id: string; target_type: string; target_id: string
  reason: string; detail: string | null; status: string; created_at: string
}
function rowToReport(r: ReportRow): Report {
  return {
    id: r.id, reporterId: r.reporter_id,
    targetType: r.target_type as Report['targetType'],
    targetId: r.target_id,
    reason: r.reason,
    detail: r.detail ?? '',
    status: r.status as Report['status'],
    createdAt: r.created_at,
  }
}

interface AnnouncementRow {
  id: string; author_id: string | null; title: string; content: string; created_at: string
}
function rowToAnnouncement(r: AnnouncementRow): Announcement {
  return {
    id: r.id, authorId: r.author_id ?? '',
    title: r.title, content: r.content, createdAt: r.created_at,
  }
}

interface AllowedDomainRow {
  id: string; domain: string; description: string | null; created_at: string
}
function rowToAllowedDomain(r: AllowedDomainRow): AllowedDomain {
  return {
    id: r.id,
    domain: r.domain,
    description: r.description,
    createdAt: r.created_at,
  }
}

interface BookmarkRow { user_id: string; post_id: string; created_at: string }
interface BlockRow { blocker_id: string; blocked_id: string; created_at: string }

// ════════════════════════════════════════════════════════════
// Bootstrap — 모든 데이터 fetch
// ════════════════════════════════════════════════════════════

// 비로그인/미승인 사용자: 목록/제목/메타(좋아요·댓글 수)는 모두 노출하되 본문은 NULL.
// post_previews 뷰가 content 를 승인자에게만 채워주고, 카운트를 함께 내려준다.
async function loadPreviewsOnly(selfProfile: ProfileRow | null): Promise<void> {
  const [previewsRes, announcementsRes, allowedDomainsRes] = await Promise.all([
    supabase.from('post_previews').select('*').order('created_at', { ascending: false }),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('allowed_email_domains').select('*').order('domain'),
  ])

  cache.posts = (previewsRes.data ?? []).map(p => {
    const likeCount = Number(p.like_count) || 0
    const prayerCount = Number(p.prayer_count) || 0
    // 카운트 표시용 placeholder 배열 (실제 user id 는 미승인에게 노출하지 않음)
    const likes = Array.from({ length: likeCount }, (_, i) => `~${i}`)
    const prayers = p.category === '기도요청' ? Array.from({ length: prayerCount }, (_, i) => `~${i}`) : null
    const post = rowToPost(p as PostRow, likes, prayers, null)
    post.commentCount = Number(p.comment_count) || 0
    return post
  })
  cache.postsById = new Map(cache.posts.map(p => [p.id, p]))
  cache.announcements = (announcementsRes.data ?? []).map(a => rowToAnnouncement(a as AnnouncementRow))
  cache.allowedDomains = (allowedDomainsRes.data ?? []).map(d => rowToAllowedDomain(d as AllowedDomainRow))
  cache.users = selfProfile ? [rowToUser(selfProfile)] : []
  cache.usersById = new Map(cache.users.map(u => [u.id, u]))
  cache.comments = []
  loaded = true
}

export async function loadAll(): Promise<void> {
  if (loaded) return

  // 현재 세션의 가입(학생증) 승인 여부 판단 — 미승인이면 제목 미리보기만 로드
  const { data: authData } = await supabase.auth.getUser()
  let selfProfile: ProfileRow | null = null
  let approved = false
  if (authData.user) {
    const { data: me } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle()
    if (me) {
      selfProfile = me as ProfileRow
      approved = me.membership_status === 'approved' || me.role === 'admin'
    }
  }
  if (!approved) { await loadPreviewsOnly(selfProfile); return }

  const [
    profilesRes, postsRes, postLikesRes, postPrayersRes,
    pollOptionsRes, pollVotesRes,
    commentsRes, commentLikesRes,
    bookmarksRes, blocksRes,
    notificationsRes, messagesRes,
    reportsRes, announcementsRes,
    allowedDomainsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('posts').select('*'),
    supabase.from('post_likes').select('post_id, user_id'),
    supabase.from('post_prayers').select('post_id, user_id'),
    supabase.from('poll_options').select('id, post_id, text, position').order('position'),
    supabase.from('poll_votes').select('option_id, user_id'),
    supabase.from('comments').select('*'),
    supabase.from('comment_likes').select('comment_id, user_id'),
    supabase.from('bookmarks').select('*'),
    supabase.from('blocks').select('*'),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('messages').select('*'),
    supabase.from('reports').select('*'),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('allowed_email_domains').select('*').order('domain'),
  ])

  // 에러 체크
  const errors = [
    profilesRes, postsRes, postLikesRes, postPrayersRes, pollOptionsRes, pollVotesRes,
    commentsRes, commentLikesRes, bookmarksRes, blocksRes,
    notificationsRes, messagesRes, reportsRes, announcementsRes,
    allowedDomainsRes,
  ].map(r => r.error).filter(Boolean)
  if (errors.length) {
    console.error('loadAll errors:', errors)
  }

  // Users
  cache.users = (profilesRes.data ?? []).map(rowToUser)
  cache.usersById = new Map(cache.users.map(u => [u.id, u]))

  // Likes 인덱스
  const postLikes = new Map<string, string[]>()
  ;(postLikesRes.data ?? []).forEach(l => {
    const arr = postLikes.get(l.post_id) ?? []
    arr.push(l.user_id); postLikes.set(l.post_id, arr)
  })
  // Prayers 인덱스
  const postPrayers = new Map<string, string[]>()
  ;(postPrayersRes.data ?? []).forEach(p => {
    const arr = postPrayers.get(p.post_id) ?? []
    arr.push(p.user_id); postPrayers.set(p.post_id, arr)
  })
  // Poll options + votes
  const optionsByPost = new Map<string, { id: string; text: string; position: number }[]>()
  ;(pollOptionsRes.data ?? []).forEach(o => {
    const arr = optionsByPost.get(o.post_id) ?? []
    arr.push(o); optionsByPost.set(o.post_id, arr)
  })
  const votesByOption = new Map<string, string[]>()
  ;(pollVotesRes.data ?? []).forEach(v => {
    const arr = votesByOption.get(v.option_id) ?? []
    arr.push(v.user_id); votesByOption.set(v.option_id, arr)
  })

  // Posts
  cache.posts = (postsRes.data ?? []).map(p => {
    // 실제 좋아요 + 관리자 가산(like_boost) placeholder
    const likes = [...(postLikes.get(p.id) ?? []), ...boostLikes(Number((p as PostRow).like_boost) || 0)]
    const prayersArr = postPrayers.get(p.id) ?? null
    const opts = optionsByPost.get(p.id)
    const poll: Poll | null = opts && opts.length
      ? { options: opts.sort((a, b) => a.position - b.position).map<PollOption>(o => ({ text: o.text, votes: votesByOption.get(o.id) ?? [] })) }
      : null
    return rowToPost(p as PostRow, likes, p.category === '기도요청' ? prayersArr : null, poll)
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  cache.postsById = new Map(cache.posts.map(p => [p.id, p]))

  // Comments
  const commentLikes = new Map<string, string[]>()
  ;(commentLikesRes.data ?? []).forEach(l => {
    const arr = commentLikes.get(l.comment_id) ?? []
    arr.push(l.user_id); commentLikes.set(l.comment_id, arr)
  })
  cache.comments = (commentsRes.data ?? []).map(c => rowToComment(c as CommentRow, commentLikes.get(c.id) ?? []))

  // 게시글별 댓글 수 집계 (목록 표시용)
  const commentCountByPost = new Map<string, number>()
  cache.comments.forEach(c => commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1))
  cache.posts.forEach(p => { p.commentCount = commentCountByPost.get(p.id) ?? 0 })

  // Bookmarks / Blocks
  cache.bookmarks = (bookmarksRes.data ?? []).map(b => ({
    userId: (b as BookmarkRow).user_id, postId: (b as BookmarkRow).post_id, createdAt: (b as BookmarkRow).created_at,
  }))
  cache.blocks = (blocksRes.data ?? []).map(b => ({
    blockerId: (b as BlockRow).blocker_id, blockedId: (b as BlockRow).blocked_id, createdAt: (b as BlockRow).created_at,
  }))

  cache.notifications = (notificationsRes.data ?? []).map(n => rowToNotification(n as NotificationRow))
  cache.messages = (messagesRes.data ?? []).map(m => rowToMessage(m as MessageRow))
  cache.reports = (reportsRes.data ?? []).map(r => rowToReport(r as ReportRow))
  cache.announcements = (announcementsRes.data ?? []).map(a => rowToAnnouncement(a as AnnouncementRow))
  cache.allowedDomains = (allowedDomainsRes.data ?? []).map(d => rowToAllowedDomain(d as AllowedDomainRow))

  loaded = true
}

/** 외부에서 cache 강제 리로드 */
export async function reloadAll(): Promise<void> {
  loaded = false
  await loadAll()
}

// ════════════════════════════════════════════════════════════
// Session (Supabase Auth wrapper)
// ════════════════════════════════════════════════════════════

let _sessionUser: User | null = null

export function setSession(user: User | null) {
  _sessionUser = user
}
export function getSession(): User | null {
  return _sessionUser
}
export function currentUser(): User | null {
  return _sessionUser
}

/** auth.users.id → cache profile 동기화 */
export async function syncSessionFromAuth(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) { _sessionUser = null; return null }
  // cache 에서 우선 조회, 없으면 DB
  let user = cache.usersById.get(data.user.id) ?? null
  if (!user) {
    const { data: row } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (row) {
      user = rowToUser(row as ProfileRow)
      cache.usersById.set(user.id, user)
      cache.users.push(user)
    }
  }
  _sessionUser = user
  return user
}

export async function refreshSession(): Promise<void> {
  await syncSessionFromAuth()
}

// ════════════════════════════════════════════════════════════
// Users
// ════════════════════════════════════════════════════════════

export function getUsers(): User[] { return cache.users }
export function getUserById(id: string): User | undefined { return cache.usersById.get(id) }
export function findUserByEmail(email: string): User | undefined {
  return cache.users.find(u => u.email === email)
}

const VERIFICATION_BUCKET = 'verification-docs'

function fileExt(file: File): string {
  const m = file.name.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : 'jpg'
}

// 인증 서류(학생증/재학증명서) 업로드 → 저장 경로 반환. 로그인 세션 필요.
export async function uploadVerificationDoc(userId: string, kind: 'student-id' | 'enrollment', file: File): Promise<string> {
  const path = `${userId}/${kind}.${fileExt(file)}`
  const { error } = await supabase.storage.from(VERIFICATION_BUCKET).upload(path, file, { upsert: true })
  if (error) throw new Error(`서류 업로드 실패: ${error.message}`)
  return path
}

// 관리자 — 서류 열람용 임시 서명 URL
export async function getVerificationDocUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(VERIFICATION_BUCKET).createSignedUrl(path, 60)
  if (error) { console.error('signed url 실패:', error); return null }
  return data?.signedUrl ?? null
}

export interface SignUpParams {
  email: string
  password: string
  nickname: string
  membershipNote?: string
  studentIdFile?: File
}

// 가입 = '신청'. 학생증을 올리고 membership_status='pending' 상태로 계정을 만든다.
// (이메일 인증은 꺼두는 것을 전제 — 관리자 학생증 승인이 실질 게이트)
export async function signUp(params: SignUpParams): Promise<SignUpResult> {
  const { email, password, nickname, membershipNote, studentIdFile } = params
  // 이메일 도메인 제한 없음 — 신대원 재학 여부는 학생증/재학증명서 승인으로 검증
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { nickname, membership_note: membershipNote ?? null },
      emailRedirectTo: window.location.origin + '/auth',
    },
  })
  if (error) {
    if (error.message?.includes('EMAIL_DOMAIN_NOT_ALLOWED')) {
      throw new Error('허용되지 않은 이메일 도메인입니다.')
    }
    throw error
  }
  if (!data.user) throw new Error('회원가입 실패')

  // 학생증 업로드는 로그인 세션이 있어야 가능 — 이메일 인증이 켜져 있으면 세션이 없다.
  if (!data.session) {
    throw new Error('이메일 인증이 켜져 있어 학생증을 첨부할 수 없습니다. 관리자에게 이메일 인증 비활성화를 요청하세요.')
  }

  // 학생증 업로드 후 프로필에 경로 기록
  if (studentIdFile) {
    const path = await uploadVerificationDoc(data.user.id, 'student-id', studentIdFile)
    await supabase.from('profiles').update({ student_id_doc: path }).eq('id', data.user.id)
  }

  // 프로필 fetch (트리거 생성 대기)
  let user: User | null = null
  for (let i = 0; i < 5; i++) {
    const { data: row } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    if (row) { user = rowToUser(row as ProfileRow); break }
    await new Promise(r => setTimeout(r, 200))
  }
  if (!user) throw new Error('프로필 생성에 실패했습니다.')
  cache.users.push(user)
  cache.usersById.set(user.id, user)
  _sessionUser = user
  // membership_status='pending' — 관리자 승인 전까지 읽기 불가
  return { user, requiresEmailConfirmation: false }
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Supabase 가 이메일 미인증 시 'Email not confirmed' 반환
    if (error.message?.toLowerCase().includes('email not confirmed')) {
      throw new Error('이메일 인증이 완료되지 않았습니다. 메일함을 확인하세요.')
    }
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
  }
  if (!data.user) throw new Error('로그인 실패')
  const user = await syncSessionFromAuth()
  if (!user) throw new Error('프로필을 찾을 수 없습니다.')
  if (user.banned) {
    await supabase.auth.signOut()
    _sessionUser = null
    throw new Error('정지된 계정입니다. 관리자에게 문의하세요.')
  }
  return user
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: window.location.origin + '/auth' },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  _sessionUser = null
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname
  if (updates.affiliation !== undefined) dbUpdates.affiliation = updates.affiliation
  if (updates.banned !== undefined) dbUpdates.banned = updates.banned
  if (updates.role !== undefined) dbUpdates.role = updates.role
  if (updates.membershipStatus !== undefined) dbUpdates.membership_status = updates.membershipStatus
  if (updates.membershipNote !== undefined) dbUpdates.membership_note = updates.membershipNote
  if (updates.studentIdDoc !== undefined) dbUpdates.student_id_doc = updates.studentIdDoc
  if (updates.enrollmentDoc !== undefined) dbUpdates.enrollment_doc = updates.enrollmentDoc
  if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus
  if (updates.verificationNote !== undefined) dbUpdates.verification_note = updates.verificationNote
  if (updates.verifiedAt !== undefined) dbUpdates.verified_at = updates.verifiedAt

  if (Object.keys(dbUpdates).length === 0 && updates.password === undefined) return cache.usersById.get(id) ?? null

  if (updates.password) {
    // 비밀번호 변경은 supabase.auth.updateUser 사용 (자기 자신만)
    const { error } = await supabase.auth.updateUser({ password: updates.password })
    if (error) throw error
  }

  if (Object.keys(dbUpdates).length > 0) {
    const { data, error } = await supabase.from('profiles').update(dbUpdates).eq('id', id).select().single()
    if (error) throw error
    const user = rowToUser(data as ProfileRow)
    cache.usersById.set(id, user)
    const idx = cache.users.findIndex(u => u.id === id)
    if (idx >= 0) cache.users[idx] = user
    if (_sessionUser?.id === id) _sessionUser = user
    return user
  }
  return cache.usersById.get(id) ?? null
}

// 본인 재학증명서 인증 신청 — verification_status 를 'pending' 으로 (서버 트리거가 자가승격 차단)
export async function submitVerification(note?: string, enrollmentFile?: File): Promise<User | null> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  let docPath: string | undefined
  if (enrollmentFile) docPath = await uploadVerificationDoc(me.id, 'enrollment', enrollmentFile)
  return updateUser(me.id, {
    verificationStatus: 'pending',
    verificationNote: note ?? null,
    ...(docPath ? { enrollmentDoc: docPath } : {}),
  })
}

// 관리자 — 재학증명서(쓰기) 인증 승인/거절
export async function setVerification(
  userId: string,
  status: 'verified' | 'rejected' | 'unverified',
  note?: string,
): Promise<User | null> {
  return updateUser(userId, {
    verificationStatus: status,
    verificationNote: note ?? null,
    verifiedAt: status === 'verified' ? new Date().toISOString() : null,
  })
}

// 관리자 — 학생증(가입/읽기) 승인/거절
export async function setMembership(
  userId: string,
  status: 'approved' | 'rejected' | 'pending',
  note?: string,
): Promise<User | null> {
  return updateUser(userId, { membershipStatus: status, membershipNote: note ?? null })
}

// 본인 가입 재신청(거절된 경우) — membership_status 를 'pending' 으로
export async function resubmitMembership(note?: string, studentIdFile?: File): Promise<User | null> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  if (studentIdFile) await uploadVerificationDoc(me.id, 'student-id', studentIdFile)
  return updateUser(me.id, { membershipStatus: 'pending', membershipNote: note ?? null })
}

export async function deleteUser(id: string): Promise<void> {
  // 본인 탈퇴: profiles row 삭제 (auth.users 는 admin 권한 필요라 그대로 둠)
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
  cache.usersById.delete(id)
  cache.users = cache.users.filter(u => u.id !== id)
  // 관련 posts/comments 의 author 는 'deleted' 로 표시
  cache.posts.forEach(p => { if (p.authorId === id) p.authorId = 'deleted' })
  cache.comments.forEach(c => { if (c.authorId === id) c.authorId = 'deleted' })
  await supabase.auth.signOut()
  _sessionUser = null
}

// ════════════════════════════════════════════════════════════
// Posts
// ════════════════════════════════════════════════════════════

export function getPosts(): Post[] { return cache.posts }
export function getPostById(id: string): Post | undefined { return cache.postsById.get(id) }

// ── 사역장터 첨부 파일 (공개 버킷 market-files) ──
const MARKET_BUCKET = 'market-files'

export async function uploadMarketFile(userId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${userId}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from(MARKET_BUCKET).upload(path, file, { upsert: false })
  if (error) throw new Error(`파일 업로드 실패: ${error.message}`)
  return path
}

// 공개 버킷이라 동기적으로 공개 URL 반환
export function getMarketFileUrl(path: string): string {
  return supabase.storage.from(MARKET_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function createPost(data: Partial<Post>): Promise<Post> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { data: row, error } = await supabase.from('posts').insert({
    author_id: me.id,
    category: data.category!,
    title: data.title!,
    content: data.content!,
    cheongbing: data.cheongbing ?? null,
    market: data.market ?? null,
    attachments: data.attachments ?? [],
    sermon_verse: data.sermonVerse ?? null,
    prayer_answered: data.prayerAnswered ?? false,
  }).select().single()
  if (error) throw error

  // poll 옵션이 있으면 별도 insert
  let newPoll: Poll | null = null
  if (data.poll && data.poll.options.length) {
    const opts = data.poll.options.map((o, i) => ({ post_id: row.id, text: o.text, position: i }))
    const { error: pErr } = await supabase.from('poll_options').insert(opts)
    if (pErr) {
      console.error('[createPost] poll_options insert failed:', pErr)
      throw pErr
    }
    newPoll = { options: data.poll.options.map(o => ({ text: o.text, votes: [] })) }
  }
  const post = rowToPost(row as PostRow, [], data.category === '기도요청' ? [] : null, newPoll)
  cache.posts.unshift(post)
  cache.postsById.set(post.id, post)
  return post
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.content !== undefined) dbUpdates.content = updates.content
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.cheongbing !== undefined) dbUpdates.cheongbing = updates.cheongbing
  if (updates.market !== undefined) dbUpdates.market = updates.market
  if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments
  if (updates.sermonVerse !== undefined) dbUpdates.sermon_verse = updates.sermonVerse
  if (updates.prayerAnswered !== undefined) dbUpdates.prayer_answered = updates.prayerAnswered

  const { data, error } = await supabase.from('posts').update(dbUpdates).eq('id', id).select().single()
  if (error) throw error

  // poll 처리: updates.poll 이 명시되면 기존 옵션 삭제 후 재생성
  let nextPoll: Poll | null | undefined
  if (updates.poll !== undefined) {
    const { error: dErr } = await supabase.from('poll_options').delete().eq('post_id', id)
    if (dErr) { console.error('[updatePost] poll_options delete failed:', dErr); throw dErr }
    if (updates.poll && updates.poll.options.length) {
      const opts = updates.poll.options.map((o, i) => ({ post_id: id, text: o.text, position: i }))
      const { error: iErr } = await supabase.from('poll_options').insert(opts)
      if (iErr) { console.error('[updatePost] poll_options insert failed:', iErr); throw iErr }
      nextPoll = { options: updates.poll.options.map(o => ({ text: o.text, votes: [] })) }
    } else {
      nextPoll = null
    }
  }

  const existing = cache.postsById.get(id)
  const finalPoll = nextPoll !== undefined ? nextPoll : (existing?.poll ?? null)
  const updated = rowToPost(data as PostRow, existing?.likes ?? [], existing?.prayers ?? null, finalPoll)
  cache.postsById.set(id, updated)
  const idx = cache.posts.findIndex(p => p.id === id)
  if (idx >= 0) cache.posts[idx] = updated
  return updated
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
  cache.postsById.delete(id)
  cache.posts = cache.posts.filter(p => p.id !== id)
  cache.comments = cache.comments.filter(c => c.postId !== id)
}

// ── Likes (Posts) ──
export async function togglePostLike(postId: string): Promise<boolean> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const post = cache.postsById.get(postId)
  if (!post) throw new Error('게시글을 찾을 수 없습니다.')
  const liked = post.likes.includes(me.id)
  if (liked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id)
    if (error) throw error
    post.likes = post.likes.filter(u => u !== me.id)
    return false
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: me.id })
    if (error) throw error
    post.likes = [...post.likes, me.id]
    return true
  }
}

/**
 * 관리자 전용: 게시글의 가산 좋아요(like_boost)를 delta(±1 등)만큼 조정한다.
 * 표시 좋아요 = 실제 post_likes + like_boost. 0 미만으로는 내려가지 않는다.
 * 반환값은 조정 후 like_boost.
 */
export async function adminAdjustPostLikeBoost(postId: string, delta: number): Promise<number> {
  const me = _sessionUser
  if (!me || me.role !== 'admin') throw new Error('관리자만 사용할 수 있습니다.')
  const post = cache.postsById.get(postId)
  if (!post) throw new Error('게시글을 찾을 수 없습니다.')
  const newBoost = Math.max(0, (post.likeBoost ?? 0) + delta)
  const { error } = await supabase.from('posts').update({ like_boost: newBoost }).eq('id', postId)
  if (error) throw error
  post.likeBoost = newBoost
  const real = post.likes.filter(id => !id.startsWith('~'))   // placeholder(~, ~b) 제거 → 실제 좋아요 id
  post.likes = [...real, ...boostLikes(newBoost)]
  return newBoost
}

// ── Prayers (Posts) ──
export async function togglePostPrayer(postId: string): Promise<boolean> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const post = cache.postsById.get(postId)
  if (!post) throw new Error('게시글을 찾을 수 없습니다.')
  const prayers = post.prayers ?? []
  const prayed = prayers.includes(me.id)
  if (prayed) {
    const { error } = await supabase.from('post_prayers').delete().eq('post_id', postId).eq('user_id', me.id)
    if (error) throw error
    post.prayers = prayers.filter(u => u !== me.id)
    return false
  } else {
    const { error } = await supabase.from('post_prayers').insert({ post_id: postId, user_id: me.id })
    if (error) throw error
    post.prayers = [...prayers, me.id]
    return true
  }
}

// ── Poll Vote ──
export async function togglePollVote(postId: string, optionIndex: number): Promise<void> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const post = cache.postsById.get(postId)
  if (!post?.poll) throw new Error('투표 정보가 없습니다.')

  // option DB id 조회 필요
  const { data: opts, error: oErr } = await supabase.from('poll_options')
    .select('id, position').eq('post_id', postId).order('position')
  if (oErr) throw oErr
  const target = opts?.[optionIndex]
  if (!target) throw new Error('선택지를 찾을 수 없습니다.')

  // 기존 투표 모두 제거 (1인 1표)
  const optIds = (opts ?? []).map(o => o.id)
  if (optIds.length) {
    await supabase.from('poll_votes').delete().eq('user_id', me.id).in('option_id', optIds)
  }
  const { error: vErr } = await supabase.from('poll_votes').insert({ option_id: target.id, user_id: me.id })
  if (vErr) throw vErr

  // cache 갱신
  post.poll.options = post.poll.options.map((o, i) => ({
    ...o,
    votes: i === optionIndex ? Array.from(new Set([...o.votes.filter(u => u !== me.id), me.id])) : o.votes.filter(u => u !== me.id),
  }))
}

// ── Views ──
export async function incrementViews(postId: string): Promise<void> {
  await supabase.rpc('increment_post_views', { p_post_id: postId })
  const post = cache.postsById.get(postId)
  if (post) post.views = (post.views ?? 0) + 1
}

// ════════════════════════════════════════════════════════════
// Comments
// ════════════════════════════════════════════════════════════

export function getComments(): Comment[] { return cache.comments }

export async function createComment(data: Partial<Comment>): Promise<Comment> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { data: row, error } = await supabase.from('comments').insert({
    post_id: data.postId!,
    author_id: me.id,
    parent_id: data.parentId ?? null,
    content: data.content!,
  }).select().single()
  if (error) throw error
  const comment = rowToComment(row as CommentRow, [])
  cache.comments.push(comment)
  const p = cache.postsById.get(comment.postId)
  if (p) p.commentCount += 1
  return comment
}

export async function updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.content !== undefined) dbUpdates.content = updates.content
  const { data, error } = await supabase.from('comments').update(dbUpdates).eq('id', id).select().single()
  if (error) throw error
  const existing = cache.comments.find(c => c.id === id)
  const updated = rowToComment(data as CommentRow, existing?.likes ?? [])
  const idx = cache.comments.findIndex(c => c.id === id)
  if (idx >= 0) cache.comments[idx] = updated
  return updated
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
  const removed = cache.comments.filter(c => c.id === id || c.parentId === id)
  cache.comments = cache.comments.filter(c => c.id !== id && c.parentId !== id)
  removed.forEach(c => { const p = cache.postsById.get(c.postId); if (p) p.commentCount = Math.max(0, p.commentCount - 1) })
}

export async function toggleCommentLike(commentId: string): Promise<boolean> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const comment = cache.comments.find(c => c.id === commentId)
  if (!comment) throw new Error('댓글을 찾을 수 없습니다.')
  const liked = comment.likes.includes(me.id)
  if (liked) {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', me.id)
    if (error) throw error
    comment.likes = comment.likes.filter(u => u !== me.id)
    return false
  } else {
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: me.id })
    if (error) throw error
    comment.likes = [...comment.likes, me.id]
    return true
  }
}

// ════════════════════════════════════════════════════════════
// Bookmarks
// ════════════════════════════════════════════════════════════

export function getBookmarks(): Bookmark[] { return cache.bookmarks }

export async function toggleBookmark(userId: string, postId: string): Promise<boolean> {
  const me = _sessionUser
  if (!me || me.id !== userId) throw new Error('권한이 없습니다.')
  const idx = cache.bookmarks.findIndex(b => b.userId === userId && b.postId === postId)
  if (idx >= 0) {
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('post_id', postId)
    if (error) throw error
    cache.bookmarks.splice(idx, 1)
    return false
  } else {
    const row = { user_id: userId, post_id: postId }
    const { error } = await supabase.from('bookmarks').insert(row)
    if (error) throw error
    cache.bookmarks.push({ userId, postId, createdAt: new Date().toISOString() })
    return true
  }
}

export function isBookmarked(userId: string, postId: string): boolean {
  return cache.bookmarks.some(b => b.userId === userId && b.postId === postId)
}

export function getUserBookmarks(userId: string): Bookmark[] {
  return cache.bookmarks.filter(b => b.userId === userId)
}

// ════════════════════════════════════════════════════════════
// Blocks
// ════════════════════════════════════════════════════════════

export function getBlocks(): Block[] { return cache.blocks }

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (cache.blocks.some(b => b.blockerId === blockerId && b.blockedId === blockedId)) return
  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error) throw error
  cache.blocks.push({ blockerId, blockedId, createdAt: new Date().toISOString() })
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
  if (error) throw error
  cache.blocks = cache.blocks.filter(b => !(b.blockerId === blockerId && b.blockedId === blockedId))
}

export function isBlocked(blockerId: string, blockedId: string): boolean {
  return cache.blocks.some(b => b.blockerId === blockerId && b.blockedId === blockedId)
}
export function getBlockedIds(userId: string): string[] {
  return cache.blocks.filter(b => b.blockerId === userId).map(b => b.blockedId)
}

// ════════════════════════════════════════════════════════════
// Notifications
// ════════════════════════════════════════════════════════════

export function getNotifications(): Notification[] { return cache.notifications }

export async function createNotification(data: Partial<Notification>): Promise<void> {
  // 알림 수신자는 보통 '다른 사용자'다. notifications의 SELECT RLS가 user_id = auth.uid()(자기 것만 조회)
  // 라서 .select()로 방금 insert한 행을 되읽으면 정책에 막혀 실패한다. 따라서 insert만 수행한다.
  // 내 알림은 loadAll()이 별도로 적재하므로 여기서 캐시에 넣을 필요도 없다.
  const { error } = await supabase.from('notifications').insert({
    user_id: data.userId!,
    type: data.type!,
    post_id: data.postId || null,
    message: data.message ?? '',
  })
  if (error) throw error
}

export function getUserNotifications(userId: string): Notification[] {
  return cache.notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
export function getUnreadCount(userId: string): number {
  return cache.notifications.filter(n => n.userId === userId && !n.read).length
}

export async function markRead(notifId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId)
  if (error) throw error
  const n = cache.notifications.find(x => x.id === notifId)
  if (n) n.read = true
}
export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error) throw error
  cache.notifications.forEach(n => { if (n.userId === userId) n.read = true })
}
// ════════════════════════════════════════════════════════════
// Messages (DM)
// ════════════════════════════════════════════════════════════

export function getMessages(): Message[] { return cache.messages }

export async function createMessage(data: Partial<Message>): Promise<Message> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { data: row, error } = await supabase.from('messages').insert({
    sender_id: me.id,
    receiver_id: data.receiverId!,
    content: data.content!,
  }).select().single()
  if (error) throw error
  const msg = rowToMessage(row as MessageRow)
  cache.messages.push(msg)
  return msg
}

export function getThread(userId: string, otherUserId: string): Message[] {
  return cache.messages.filter(m =>
    (m.senderId === userId && m.receiverId === otherUserId) ||
    (m.senderId === otherUserId && m.receiverId === userId)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function getConversations(userId: string): Conversation[] {
  const msgs = cache.messages.filter(m => m.senderId === userId || m.receiverId === userId)
  const map: Record<string, Message> = {}
  msgs.forEach(m => {
    const other = m.senderId === userId ? m.receiverId : m.senderId
    if (!map[other] || new Date(m.createdAt) > new Date(map[other].createdAt)) {
      map[other] = m
    }
  })
  return Object.entries(map)
    .map(([otherUserId, lastMsg]) => ({ otherUserId, lastMsg }))
    .sort((a, b) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime())
}

export async function markThreadRead(userId: string, otherUserId: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ read: true })
    .eq('sender_id', otherUserId).eq('receiver_id', userId).eq('read', false)
  if (error) throw error
  cache.messages.forEach(m => {
    if (m.senderId === otherUserId && m.receiverId === userId) m.read = true
  })
}

// ════════════════════════════════════════════════════════════
// Reports
// ════════════════════════════════════════════════════════════

export function getReports(): Report[] { return cache.reports }

export async function createReport(data: Partial<Report>): Promise<Report> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { data: row, error } = await supabase.from('reports').insert({
    reporter_id: me.id,
    target_type: data.targetType!,
    target_id: data.targetId!,
    reason: data.reason!,
    detail: data.detail ?? '',
  }).select().single()
  if (error) throw error
  const report = rowToReport(row as ReportRow)
  cache.reports.push(report)
  return report
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  const { error } = await supabase.from('reports').update(dbUpdates).eq('id', id)
  if (error) throw error
  const r = cache.reports.find(x => x.id === id)
  if (r) Object.assign(r, updates)
}

export function hasReported(userId: string, targetType: string, targetId: string): boolean {
  return cache.reports.some(
    r => r.reporterId === userId && r.targetType === targetType && r.targetId === targetId
  )
}

// ════════════════════════════════════════════════════════════
// Announcements
// ════════════════════════════════════════════════════════════

export function getAnnouncements(): Announcement[] { return cache.announcements }

export async function createAnnouncementItem(data: Partial<Announcement>): Promise<Announcement> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { data: row, error } = await supabase.from('announcements').insert({
    author_id: me.id,
    title: data.title!,
    content: data.content!,
  }).select().single()
  if (error) throw error
  const ann = rowToAnnouncement(row as AnnouncementRow)
  cache.announcements.unshift(ann)
  return ann
}

export async function deleteAnnouncementItem(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
  cache.announcements = cache.announcements.filter(a => a.id !== id)
}

// ════════════════════════════════════════════════════════════
// Allowed Email Domains
// ════════════════════════════════════════════════════════════

export function getAllowedDomains(): AllowedDomain[] { return cache.allowedDomains }

/** 가입 폼 1차 검증 — 캐시 기반. 서버 트리거가 최종 결정권자. */
export function isDomainAllowed(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain) return false
  return cache.allowedDomains.some(d => d.domain === domain)
}

export async function addAllowedDomain(domain: string, description?: string): Promise<AllowedDomain> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const normalized = domain.trim().toLowerCase()
  if (!normalized || normalized.includes('@') || normalized.includes(' ')) {
    throw new Error('올바른 도메인 형식이 아닙니다.')
  }
  const { data, error } = await supabase.from('allowed_email_domains').insert({
    domain: normalized,
    description: description?.trim() || null,
    created_by: me.id,
  }).select().single()
  if (error) {
    if (error.code === '23505') throw new Error('이미 등록된 도메인입니다.')
    throw error
  }
  const item = rowToAllowedDomain(data as AllowedDomainRow)
  cache.allowedDomains.push(item)
  cache.allowedDomains.sort((a, b) => a.domain.localeCompare(b.domain))
  return item
}

export async function removeAllowedDomain(id: string): Promise<void> {
  const { error } = await supabase.from('allowed_email_domains').delete().eq('id', id)
  if (error) throw error
  cache.allowedDomains = cache.allowedDomains.filter(d => d.id !== id)
}

/** 가입 폼에서 사용 — 캐시 비어있을 때 직접 fetch (anon 도 read 가능) */
export async function fetchAllowedDomains(): Promise<AllowedDomain[]> {
  const { data, error } = await supabase
    .from('allowed_email_domains')
    .select('*')
    .order('domain')
  if (error) throw error
  const list = (data ?? []).map(d => rowToAllowedDomain(d as AllowedDomainRow))
  cache.allowedDomains = list
  return list
}

// ════════════════════════════════════════════════════════════
// 사례비 진실 DB (Salary Truth)
//   - 캐시(loadAll)에 적재하지 않는다: 민감·가변·잠재적 대용량. on-demand fetch.
//   - 조회는 집계 RPC(k>=3)로만. 개별 행은 본인 것만 SELECT 가능(RLS).
//   - 스펙: PLANNING_SALARY_TRUTH.md
// ════════════════════════════════════════════════════════════

interface SalaryReportRow {
  id: string
  denomination: string
  region_sido: string
  region_sigungu: string
  church_size: string
  position: string
  monthly_stipend: number
  weekly_hours: number
  housing_provided: boolean
  meals_provided: boolean
  transport_provided: boolean
  insurance_4: boolean
  serve_year: number
  note: string | null
  created_at: string
}

function rowToSalaryReport(r: SalaryReportRow): SalaryReport {
  return {
    id: r.id,
    denomination: r.denomination,
    regionSido: r.region_sido,
    regionSigungu: r.region_sigungu,
    churchSize: r.church_size as SalaryReport['churchSize'],
    position: r.position as SalaryReport['position'],
    monthlyStipend: r.monthly_stipend,
    weeklyHours: Number(r.weekly_hours),
    housingProvided: r.housing_provided,
    mealsProvided: r.meals_provided,
    transportProvided: r.transport_provided,
    insurance4: r.insurance_4,
    serveYear: r.serve_year,
    note: r.note,
    createdAt: r.created_at,
  }
}

/** 제보 (verified 유저만 — RLS 로 강제). 캐시 미적재. */
export async function submitSalaryReport(input: SalaryReportInput): Promise<void> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  const { error } = await supabase.from('salary_reports').insert({
    reporter_id: me.id,
    denomination: input.denomination,
    region_sido: input.regionSido,
    region_sigungu: input.regionSigungu,
    church_size: input.churchSize,
    position: input.position,
    monthly_stipend: input.monthlyStipend,
    weekly_hours: input.weeklyHours,
    housing_provided: input.housingProvided,
    meals_provided: input.mealsProvided,
    transport_provided: input.transportProvided,
    insurance_4: input.insurance4,
    serve_year: input.serveYear,
    note: input.note ?? null,
    church_name: input.churchName ?? null,
    church_key: input.churchKey ?? null,
  })
  if (error) throw error
}

/** 본인이 제출한 제보 목록 (RLS: 본인 것만). */
export async function getMySalaryReports(): Promise<SalaryReport[]> {
  const me = _sessionUser
  if (!me) return []
  const { data, error } = await supabase
    .from('salary_reports')
    .select('*')
    .eq('reporter_id', me.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => rowToSalaryReport(r as SalaryReportRow))
}

export async function deleteSalaryReport(id: string): Promise<void> {
  const { error } = await supabase.from('salary_reports').delete().eq('id', id)
  if (error) throw error
}

/** 지역·직분별 집계 (RPC. 표본 3건 미만 그룹은 애초에 반환 안 됨). */
export async function fetchSalaryByRegion(denomination?: string, position?: string): Promise<SalaryAggRow[]> {
  const { data, error } = await supabase.rpc('salary_agg_by_region', {
    p_denomination: denomination ?? null,
    p_position: position ?? null,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    groupLabel: String(r.group_label),
    count: Number(r.count),
    medianMonthly: Number(r.median_monthly),
    p25Monthly: Number(r.p25_monthly),
    p75Monthly: Number(r.p75_monthly),
    medianHourly: Number(r.median_hourly),
    housingRate: Number(r.housing_rate),
    insuranceRate: Number(r.insurance_rate),
  }))
}

/** 특정 교회 집계. N<3 이면 null (RPC 가 0행 반환). */
export async function fetchSalaryByChurch(churchKey: string): Promise<ChurchSalaryAgg | null> {
  const { data, error } = await supabase.rpc('salary_agg_by_church', { p_church_key: churchKey })
  if (error) throw error
  const row = ((data ?? []) as Record<string, unknown>[])[0]
  if (!row) return null
  return {
    count: Number(row.count),
    medianMonthly: Number(row.median_monthly),
    medianHourly: Number(row.median_hourly),
    housingRate: Number(row.housing_rate),
    insuranceRate: Number(row.insurance_rate),
  }
}

/** 랜딩 헤드라인 통계. */
export async function fetchSalaryOverview(): Promise<SalaryOverview> {
  const year = new Date().getFullYear()
  const { data, error } = await supabase.rpc('salary_overview', { p_min_wage: MIN_WAGE_HOURLY })
  if (error) throw error
  const row = ((data ?? []) as Record<string, unknown>[])[0]
  if (!row) return { totalReports: 0, medianHourlyPart: 0, belowMinWageRate: 0, updatedYear: year }
  return {
    totalReports: Number(row.total_reports),
    medianHourlyPart: Number(row.median_hourly_part ?? 0),
    belowMinWageRate: Number(row.below_min_wage_rate ?? 0),
    updatedYear: year,
  }
}

