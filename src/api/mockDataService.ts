/**
 * Mock Data Service - 개발용 임시 데이터
 * Supabase 연결 없이 테스트할 수 있도록 하는 목 데이터 서비스
 */
import type { User, Post, Comment, Notification, Message, Report, Block, Bookmark, Announcement, AllowedDomain, SignUpResult } from '@/types'

// Mock 데이터
const mockUsers: User[] = [
  {
    id: 'user1',
    nickname: '홍길동',
    email: 'hong@example.com',
    affiliation: '서울교회',
    role: 'user',
    banned: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    nickname: '김철수',
    email: 'kim@example.com',
    affiliation: '부산교회',
    role: 'admin',
    banned: false,
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
    prayers: null,
    prayerAnswered: false,
    sermonVerse: null,
    poll: null,
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

export async function signUp(email: string, _password: string, nickname: string): Promise<SignUpResult> {
  if (!isDomainAllowed(email)) {
    throw new Error('허용되지 않은 이메일 도메인입니다.')
  }
  const newUser: User = {
    id: `user${Date.now()}`,
    nickname,
    email,
    affiliation: undefined,
    role: 'user',
    banned: false,
    createdAt: new Date().toISOString(),
  }
  mockUsers.push(newUser)
  _sessionUser = newUser
  return { user: newUser, requiresEmailConfirmation: false }
}

export async function signIn(email: string, password: string): Promise<User> {
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

export async function deleteUser(id: string): Promise<void> {
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
    prayers: data.category === '기도요청' ? [] : null,
    prayerAnswered: false,
    sermonVerse: data.sermonVerse || null,
    poll: data.poll || null,
  }
  mockPosts.unshift(newPost)
  return newPost
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

export async function updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null> {
  return null
}

export async function deleteComment(id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function toggleCommentLike(commentId: string): Promise<boolean> {
  return false
}

export function getBookmarks(): Bookmark[] {
  return []
}

export async function toggleBookmark(userId: string, postId: string): Promise<boolean> {
  return false
}

export function isBookmarked(userId: string, postId: string): boolean {
  return false
}

export function getUserBookmarks(userId: string): Bookmark[] {
  return []
}

export function getBlocks(): Block[] {
  return []
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  // Mock에서는 실제로 차단하지 않음
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  // Mock에서는 실제로 해제하지 않음
}

export function isBlocked(blockerId: string, blockedId: string): boolean {
  return false
}

export function getBlockedIds(userId: string): string[] {
  return []
}

export function getNotifications(): Notification[] {
  return []
}

export async function createNotification(data: Partial<Notification>): Promise<Notification> {
  const newNotification: Notification = {
    id: `notif${Date.now()}`,
    userId: data.userId || '',
    type: data.type || 'like',
    postId: data.postId || '',
    message: data.message || '',
    read: false,
    createdAt: new Date().toISOString(),
  }
  return newNotification
}

export function getUserNotifications(userId: string): Notification[] {
  return []
}

export function getUnreadCount(userId: string): number {
  return 0
}

export async function markRead(notifId: string): Promise<void> {
  // Mock에서는 실제로 읽음 처리하지 않음
}

export async function markAllRead(userId: string): Promise<void> {
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

export function getThread(userId: string, otherUserId: string): Message[] {
  return []
}

export function getConversations(userId: string): any[] {
  return []
}

export async function markThreadRead(userId: string, otherUserId: string): Promise<void> {
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

export async function updateReport(id: string, updates: Partial<Report>): Promise<void> {
  // Mock에서는 실제로 업데이트하지 않음
}

export function hasReported(userId: string, targetType: string, targetId: string): boolean {
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

export async function deleteAnnouncementItem(id: string): Promise<void> {
  // Mock에서는 실제로 삭제하지 않음
}

export async function togglePollVote(postId: string, optionIndex: number): Promise<void> {
  // Mock에서는 실제로 투표하지 않음
}

export async function reloadAll(): Promise<void> {
  // Mock에서는 다시 로드할 필요 없음
}