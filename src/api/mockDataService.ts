/**
 * Mock Data Service - 개발용 임시 데이터
 * Supabase 연결 없이 테스트할 수 있도록 하는 목 데이터 서비스
 */
import type { User, Post, Comment, Notification, Message, Report, Block, Bookmark, Announcement, AllowedDomain, SignUpResult, Conversation,
  SalaryReport, SalaryReportInput, SalaryAggRow, ChurchSalaryAgg, SalaryOverview } from '@/types'

// Mock 데이터
const mockUsers: User[] = [
  {
    id: 'user1',
    nickname: '홍길동',
    email: 'hong@example.com',
    affiliation: '서울교회',
    role: 'user',
    banned: false,
    membershipStatus: 'approved',
    verificationStatus: 'verified',
    verifiedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    nickname: '김철수',
    email: 'kim@example.com',
    affiliation: '부산교회',
    role: 'admin',
    banned: false,
    membershipStatus: 'approved',
    verificationStatus: 'verified',
    verifiedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  }
]

const mockPosts: Post[] = [
  {
    id: 'post1',
    authorId: 'user1',
    category: '일반',
    title: '안녕하세요!',
    content: '첫 번째 게시글입니다.',
    likes: ['user2'],
    views: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    cheongbing: null,
    market: null,
    attachments: [],
    prayers: null,
    prayerAnswered: false,
    sermonVerse: null,
    poll: null,
    commentCount: 0,
  }
]

let _sessionUser: User | null = null

export async function loadAll(): Promise<void> {
  // Mock 데이터는 즉시 로드 완료
  console.log('Mock 데이터 로드 완료')
}

export function setSession(user: User | null) {
  _sessionUser = user
}

export function getSession(): User | null {
  return _sessionUser
}

export function currentUser(): User | null {
  return _sessionUser
}

export async function syncSessionFromAuth(): Promise<User | null> {
  // Mock 환경에서는 첫 번째 사용자로 자동 로그인
  _sessionUser = mockUsers[0]
  return _sessionUser
}

export async function refreshSession(): Promise<void> {
  // Mock에서는 아무것도 하지 않음
}

export function getUsers(): User[] {
  return mockUsers
}

export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id)
}

export function findUserByEmail(email: string): User | undefined {
  return mockUsers.find(u => u.email === email)
}

const mockAllowedDomains: AllowedDomain[] = [
  { id: 'dom1', domain: 'puts.ac.kr', description: '평택대학교 신학대학원', createdAt: '2024-01-01T00:00:00Z' },
]

export function getAllowedDomains(): AllowedDomain[] { return mockAllowedDomains }

export function isDomainAllowed(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  return mockAllowedDomains.some(d => d.domain === domain)
}

export async function fetchAllowedDomains(): Promise<AllowedDomain[]> {
  return mockAllowedDomains
}

export async function addAllowedDomain(domain: string, description?: string): Promise<AllowedDomain> {
  const normalized = domain.trim().toLowerCase()
  if (mockAllowedDomains.some(d => d.domain === normalized)) {
    throw new Error('이미 등록된 도메인입니다.')
  }
  const item: AllowedDomain = {
    id: `dom${Date.now()}`,
    domain: normalized,
    description: description?.trim() || null,
    createdAt: new Date().toISOString(),
  }
  mockAllowedDomains.push(item)
  return item
}

export async function removeAllowedDomain(id: string): Promise<void> {
  const idx = mockAllowedDomains.findIndex(d => d.id === id)
  if (idx >= 0) mockAllowedDomains.splice(idx, 1)
}

export async function resendConfirmationEmail(_email: string): Promise<void> {
  // Mock 환경에서는 no-op
}

export interface SignUpParams {
  email: string; password: string; nickname: string
  membershipNote?: string; studentIdFile?: File
}

export async function signUp(params: SignUpParams): Promise<SignUpResult> {
  const { email, nickname, membershipNote } = params
  const newUser: User = {
    id: `user${Date.now()}`,
    nickname,
    email,
    affiliation: undefined,
    role: 'user',
    banned: false,
    membershipStatus: 'pending',
    membershipNote: membershipNote ?? null,
    verificationStatus: 'unverified',
    createdAt: new Date().toISOString(),
  }
  mockUsers.push(newUser)
  _sessionUser = newUser
  return { user: newUser, requiresEmailConfirmation: false }
}

export async function uploadVerificationDoc(userId: string, kind: 'student-id' | 'enrollment', _file: File): Promise<string> {
  return `${userId}/${kind}.jpg`
}

export async function getVerificationDocUrl(_path: string): Promise<string | null> {
  return null
}

export async function submitVerification(note?: string, _enrollmentFile?: File): Promise<User | null> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  me.verificationStatus = 'pending'
  me.verificationNote = note ?? null
  return me
}

export async function setVerification(
  userId: string,
  status: 'verified' | 'rejected' | 'unverified',
  note?: string,
): Promise<User | null> {
  const u = getUserById(userId)
  if (!u) return null
  u.verificationStatus = status
  u.verificationNote = note ?? null
  u.verifiedAt = status === 'verified' ? new Date().toISOString() : null
  return u
}

export async function setMembership(
  userId: string,
  status: 'approved' | 'rejected' | 'pending',
  note?: string,
): Promise<User | null> {
  const u = getUserById(userId)
  if (!u) return null
  u.membershipStatus = status
  u.membershipNote = note ?? null
  return u
}

export async function resubmitMembership(note?: string, _studentIdFile?: File): Promise<User | null> {
  const me = _sessionUser
  if (!me) throw new Error('로그인이 필요합니다.')
  me.membershipStatus = 'pending'
  me.membershipNote = note ?? null
  return me
}

export async function signIn(email: string, _password: string): Promise<User> {
  const user = mockUsers.find(u => u.email === email)
  if (!user) throw new Error('사용자를 찾을 수 없습니다.')
  _sessionUser = user
  return user
}

export async function signOut(): Promise<void> {
  _sessionUser = null
}

export function getPosts(): Post[] {
  return mockPosts
}

export function getPostById(id: string): Post | undefined {
  return mockPosts.find(p => p.id === id)
}

// 나머지 함수들은 기본 구현만 제공
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const user = getUserById(id)
  if (!user) return null
  Object.assign(user, updates)
  return user
}

export async function deleteUser(_id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function createPost(data: Partial<Post>): Promise<Post> {
  const newPost: Post = {
    id: `post${Date.now()}`,
    authorId: _sessionUser?.id || 'unknown',
    category: data.category || '일반',
    title: data.title || '',
    content: data.content || '',
    likes: [],
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    cheongbing: data.cheongbing || null,
    market: data.market || null,
    attachments: data.attachments || [],
    prayers: data.category === '기도요청' ? [] : null,
    prayerAnswered: false,
    sermonVerse: data.sermonVerse || null,
    poll: data.poll || null,
    commentCount: 0,
  }
  mockPosts.unshift(newPost)
  return newPost
}

export async function uploadMarketFile(userId: string, file: File): Promise<string> {
  return `${userId}/${file.name}`
}

export function getMarketFileUrl(path: string): string {
  return path
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  const post = getPostById(id)
  if (!post) return null
  Object.assign(post, updates, { updatedAt: new Date().toISOString() })
  return post
}

export async function deletePost(id: string): Promise<void> {
  const index = mockPosts.findIndex(p => p.id === id)
  if (index >= 0) mockPosts.splice(index, 1)
}

export async function adminAdjustPostLikeBoost(postId: string, delta: number): Promise<number> {
  const post = mockPosts.find(p => p.id === postId)
  if (!post) throw new Error('게시글을 찾을 수 없습니다.')
  const newBoost = Math.max(0, (post.likeBoost ?? 0) + delta)
  post.likeBoost = newBoost
  const real = post.likes.filter(id => !id.startsWith('~'))
  post.likes = [...real, ...Array.from({ length: newBoost }, (_, i) => `~b${i}`)]
  return newBoost
}

export async function togglePostLike(postId: string): Promise<boolean> {
  const post = getPostById(postId)
  const userId = _sessionUser?.id
  if (!post || !userId) return false

  const index = post.likes.indexOf(userId)
  if (index >= 0) {
    post.likes.splice(index, 1)
    return false
  } else {
    post.likes.push(userId)
    return true
  }
}

export async function togglePostPrayer(postId: string): Promise<boolean> {
  const post = getPostById(postId)
  const userId = _sessionUser?.id
  if (!post || !userId || !post.prayers) return false

  const index = post.prayers.indexOf(userId)
  if (index >= 0) {
    post.prayers.splice(index, 1)
    return false
  } else {
    post.prayers.push(userId)
    return true
  }
}

export async function incrementViews(postId: string): Promise<void> {
  const post = getPostById(postId)
  if (post) post.views = (post.views || 0) + 1
}

// mock 은 인메모리 정적 데이터라 재요청이 없음 — 인터페이스 유지용 no-op
export async function refresh(): Promise<void> {}

export function getComments(): Comment[] {
  return []
}

export async function createComment(data: Partial<Comment>): Promise<Comment> {
  const newComment: Comment = {
    id: `comment${Date.now()}`,
    postId: data.postId || '',
    authorId: _sessionUser?.id || 'unknown',
    parentId: data.parentId || null,
    content: data.content || '',
    likes: [],
    createdAt: new Date().toISOString(),
  }
  return newComment
}

export async function updateComment(_id: string, _updates: Partial<Comment>): Promise<Comment | null> {
  return null
}

export async function deleteComment(_id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function toggleCommentLike(_commentId: string): Promise<boolean> {
  return false
}

export function getBookmarks(): Bookmark[] {
  return []
}

export async function toggleBookmark(_userId: string, _postId: string): Promise<boolean> {
  return false
}

export function isBookmarked(_userId: string, _postId: string): boolean {
  return false
}

export function getUserBookmarks(_userId: string): Bookmark[] {
  return []
}

export function getBlocks(): Block[] {
  return []
}

export async function blockUser(_blockerId: string, _blockedId: string): Promise<void> {
  // Mock에서는 실제로 차단하지 않음
}

export async function unblockUser(_blockerId: string, _blockedId: string): Promise<void> {
  // Mock에서는 실제로 해제하지 않음
}

export function isBlocked(_blockerId: string, _blockedId: string): boolean {
  return false
}

export function getBlockedIds(_userId: string): string[] {
  return []
}

export function getNotifications(): Notification[] {
  return []
}

export async function createNotification(_data: Partial<Notification>): Promise<void> {
  // mock 모드에서는 알림 저장이 필요 없다 (실제 DB의 RLS 되읽기 문제와 무관). no-op.
}

export function getUserNotifications(_userId: string): Notification[] {
  return []
}

export function getUnreadCount(_userId: string): number {
  return 0
}

export async function markRead(_notifId: string): Promise<void> {
  // Mock에서는 실제로 읽음 처리하지 않음
}

export async function markAllRead(_userId: string): Promise<void> {
  // Mock에서는 실제로 읽음 처리하지 않음
}

export function getMessages(): Message[] {
  return []
}

export async function createMessage(data: Partial<Message>): Promise<Message> {
  const newMessage: Message = {
    id: `msg${Date.now()}`,
    senderId: _sessionUser?.id || '',
    receiverId: data.receiverId || '',
    content: data.content || '',
    read: false,
    createdAt: new Date().toISOString(),
  }
  return newMessage
}

export function getThread(_userId: string, _otherUserId: string): Message[] {
  return []
}

export function getConversations(_userId: string): Conversation[] {
  return []
}

export async function markThreadRead(_userId: string, _otherUserId: string): Promise<void> {
  // Mock에서는 실제로 읽음 처리하지 않음
}

export function getReports(): Report[] {
  return []
}

export async function createReport(data: Partial<Report>): Promise<Report> {
  const newReport: Report = {
    id: `report${Date.now()}`,
    reporterId: _sessionUser?.id || '',
    targetType: data.targetType || 'post',
    targetId: data.targetId || '',
    reason: data.reason || '',
    detail: data.detail || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  return newReport
}

export async function updateReport(_id: string, _updates: Partial<Report>): Promise<void> {
  // Mock에서는 실제로 업데이트하지 않음
}

export function hasReported(_userId: string, _targetType: string, _targetId: string): boolean {
  return false
}

export function getAnnouncements(): Announcement[] {
  return []
}

export async function createAnnouncementItem(data: Partial<Announcement>): Promise<Announcement> {
  const newAnnouncement: Announcement = {
    id: `announce${Date.now()}`,
    authorId: _sessionUser?.id || '',
    title: data.title || '',
    content: data.content || '',
    createdAt: new Date().toISOString(),
  }
  return newAnnouncement
}

export async function deleteAnnouncementItem(_id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function togglePollVote(_postId: string, _optionIndex: number): Promise<void> {
  // Mock에서는 실제로 투표하지 않음
}

export async function reloadAll(): Promise<void> {
  // Mock에서는 다시 로드할 필요 없음
}

// ── 사례비 진실 DB (Salary Truth) — mock ──
// 실서비스와 동일 시그니처. N<3 → null 분기도 반드시 재현(임계값 UI 테스트용).
const mockSalaryReports: SalaryReport[] = [
  {
    id: 'sal1', denomination: '예장합동', regionSido: '서울', regionSigungu: '강남구',
    churchSize: '300-1000', position: '파트전도사', monthlyStipend: 1_300_000, weeklyHours: 24,
    housingProvided: false, mealsProvided: true, transportProvided: false, insurance4: false,
    serveYear: 2025, note: null, createdAt: '2025-03-01T00:00:00Z',
  },
]

export async function submitSalaryReport(_input: SalaryReportInput): Promise<void> {
  // Mock에서는 실제로 저장하지 않음
}

export async function getMySalaryReports(): Promise<SalaryReport[]> {
  return mockSalaryReports
}

export async function deleteSalaryReport(_id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function fetchSalaryByRegion(_denomination?: string, _position?: string): Promise<SalaryAggRow[]> {
  return [
    { groupLabel: '서울 강남구 · 파트전도사', count: 7, medianMonthly: 1_300_000, p25Monthly: 1_000_000, p75Monthly: 1_600_000, medianHourly: 12_460, housingRate: 0.14, insuranceRate: 0.28 },
    { groupLabel: '경기 성남시 · 교육전도사', count: 4, medianMonthly: 1_500_000, p25Monthly: 1_200_000, p75Monthly: 1_800_000, medianHourly: 8_630, housingRate: 0.25, insuranceRate: 0.5 },
  ]
}

export async function fetchSalaryByChurch(churchKey: string): Promise<ChurchSalaryAgg | null> {
  // 'demo-church' 만 N>=3 로 취급, 그 외는 표본부족(null) 재현
  if (churchKey === 'demo-church') {
    return { count: 3, medianMonthly: 1_400_000, medianHourly: 13_420, housingRate: 0.33, insuranceRate: 0.33 }
  }
  return null
}

export async function fetchSalaryOverview(): Promise<SalaryOverview> {
  return { totalReports: 42, medianHourlyPart: 8_600, belowMinWageRate: 0.63, updatedYear: new Date().getFullYear() }
}
