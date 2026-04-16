/**
 * DataService - localStorage 기반 데이터 레이어
 *
 * VITE_USE_MOCK=true일 때 사용됨.
 * 백엔드 API가 준비되면 api/*.api.ts로 자동 전환.
 */
import { uuid } from '@/utils/helpers'
import type {
  User, Post, Comment, Notification, Message,
  Report, Block, Bookmark, Announcement, Conversation,
} from '@/types'

// ── Storage Helpers ─────────────────────────────────────────

function store(key: string, val: unknown) {
  localStorage.setItem('honglind_' + key, JSON.stringify(val))
}

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem('honglind_' + key) || 'null')
  } catch {
    return null
  }
}

// ── Users ───────────────────────────────────────────────────

export function getUsers(): User[] { return load('users') ?? [] }
export function saveUsers(users: User[]) { store('users', users) }
export function getUserById(id: string) { return getUsers().find(u => u.id === id) }
export function findUserByEmail(email: string) { return getUsers().find(u => u.email === email) }

export function createUser(data: Partial<User>): User {
  const users = getUsers()
  const user: User = { id: uuid(), createdAt: new Date().toISOString(), role: 'user', banned: false, ...data } as User
  users.push(user)
  saveUsers(users)
  return user
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx < 0) return null
  Object.assign(users[idx], updates)
  saveUsers(users)
  return users[idx]
}

export function deleteUser(id: string) {
  const posts = getPosts().map(p => p.authorId === id ? { ...p, authorId: 'deleted' } : p)
  savePosts(posts)
  const comments = getComments().map(c => c.authorId === id ? { ...c, authorId: 'deleted' } : c)
  saveComments(comments)
  saveUsers(getUsers().filter(u => u.id !== id))
}

// ── Posts ────────────────────────────────────────────────────

export function getPosts(): Post[] { return load('posts') ?? [] }
export function savePosts(posts: Post[]) { store('posts', posts) }
export function getPostById(id: string) { return getPosts().find(p => p.id === id) }

export function createPost(data: Partial<Post>): Post {
  const posts = getPosts()
  const post: Post = {
    id: uuid(), likes: [], views: 0,
    createdAt: new Date().toISOString(), updatedAt: null,
    cheongbing: null, prayers: null, sermonVerse: null, poll: null,
    ...data,
  } as Post
  posts.unshift(post)
  savePosts(posts)
  return post
}

export function updatePost(id: string, updates: Partial<Post>): Post | null {
  const posts = getPosts()
  const idx = posts.findIndex(p => p.id === id)
  if (idx < 0) return null
  Object.assign(posts[idx], updates, { updatedAt: new Date().toISOString() })
  savePosts(posts)
  return posts[idx]
}

export function deletePost(id: string) {
  savePosts(getPosts().filter(p => p.id !== id))
  saveComments(getComments().filter(c => c.postId !== id))
}

// ── Comments ────────────────────────────────────────────────

export function getComments(): Comment[] { return load('comments') ?? [] }
export function saveComments(cmts: Comment[]) { store('comments', cmts) }

export function createComment(data: Partial<Comment>): Comment {
  const cmts = getComments()
  const comment: Comment = { id: uuid(), likes: [], createdAt: new Date().toISOString(), ...data } as Comment
  cmts.push(comment)
  saveComments(cmts)
  return comment
}

export function updateComment(id: string, updates: Partial<Comment>): Comment | null {
  const cmts = getComments()
  const idx = cmts.findIndex(c => c.id === id)
  if (idx < 0) return null
  Object.assign(cmts[idx], updates, { updatedAt: new Date().toISOString() })
  saveComments(cmts)
  return cmts[idx]
}

export function deleteComment(id: string) {
  saveComments(getComments().filter(c => c.id !== id && c.parentId !== id))
}

// ── Bookmarks ───────────────────────────────────────────────

export function getBookmarks(): Bookmark[] { return load('bookmarks') ?? [] }
export function saveBookmarks(bm: Bookmark[]) { store('bookmarks', bm) }

export function toggleBookmark(userId: string, postId: string): boolean {
  const bm = getBookmarks()
  const idx = bm.findIndex(b => b.userId === userId && b.postId === postId)
  if (idx >= 0) bm.splice(idx, 1)
  else bm.push({ userId, postId, createdAt: new Date().toISOString() })
  saveBookmarks(bm)
  return idx < 0
}

export function isBookmarked(userId: string, postId: string): boolean {
  return getBookmarks().some(b => b.userId === userId && b.postId === postId)
}

export function getUserBookmarks(userId: string): Bookmark[] {
  return getBookmarks().filter(b => b.userId === userId)
}

// ── Blocks ──────────────────────────────────────────────────

export function getBlocks(): Block[] { return load('blocks') ?? [] }
export function saveBlocks(bl: Block[]) { store('blocks', bl) }

export function blockUser(blockerId: string, blockedId: string) {
  const bl = getBlocks()
  if (!bl.some(b => b.blockerId === blockerId && b.blockedId === blockedId)) {
    bl.push({ blockerId, blockedId, createdAt: new Date().toISOString() })
    saveBlocks(bl)
  }
}

export function unblockUser(blockerId: string, blockedId: string) {
  saveBlocks(getBlocks().filter(b => !(b.blockerId === blockerId && b.blockedId === blockedId)))
}

export function isBlocked(blockerId: string, blockedId: string): boolean {
  return getBlocks().some(b => b.blockerId === blockerId && b.blockedId === blockedId)
}

export function getBlockedIds(userId: string): string[] {
  return getBlocks().filter(b => b.blockerId === userId).map(b => b.blockedId)
}

// ── Notifications ───────────────────────────────────────────

export function getNotifications(): Notification[] { return load('notifications') ?? [] }
export function saveNotifications(n: Notification[]) { store('notifications', n) }

export function createNotification(data: Partial<Notification>) {
  const ns = getNotifications()
  ns.unshift({ id: uuid(), createdAt: new Date().toISOString(), ...data } as Notification)
  saveNotifications(ns)
}

export function getUserNotifications(userId: string): Notification[] {
  return getNotifications()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getUnreadCount(userId: string): number {
  return getNotifications().filter(n => n.userId === userId && !n.read).length
}

export function markRead(notifId: string) {
  const ns = getNotifications()
  const n = ns.find(x => x.id === notifId)
  if (n) { n.read = true; saveNotifications(ns) }
}

export function markAllRead(userId: string) {
  const ns = getNotifications()
  ns.filter(n => n.userId === userId).forEach(n => { n.read = true })
  saveNotifications(ns)
}

// ── Messages ────────────────────────────────────────────────

export function getMessages(): Message[] { return load('messages') ?? [] }
export function saveMessages(m: Message[]) { store('messages', m) }

export function createMessage(data: Partial<Message>) {
  const msgs = getMessages()
  msgs.push({ id: uuid(), createdAt: new Date().toISOString(), ...data } as Message)
  saveMessages(msgs)
}

export function getThread(userId: string, otherUserId: string): Message[] {
  return getMessages().filter(m =>
    (m.senderId === userId && m.receiverId === otherUserId) ||
    (m.senderId === otherUserId && m.receiverId === userId)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function getConversations(userId: string): Conversation[] {
  const msgs = getMessages().filter(m => m.senderId === userId || m.receiverId === userId)
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

export function markThreadRead(userId: string, otherUserId: string) {
  const msgs = getMessages()
  let changed = false
  msgs.forEach(m => {
    if (m.senderId === otherUserId && m.receiverId === userId && !m.read) {
      m.read = true; changed = true
    }
  })
  if (changed) saveMessages(msgs)
}

// ── Reports ─────────────────────────────────────────────────

export function getReports(): Report[] { return load('reports') ?? [] }
export function saveReports(reports: Report[]) { store('reports', reports) }

export function createReport(data: Partial<Report>): Report {
  const reports = getReports()
  const report: Report = { id: uuid(), status: 'pending', createdAt: new Date().toISOString(), ...data } as Report
  reports.push(report)
  saveReports(reports)
  return report
}

export function updateReport(id: string, updates: Partial<Report>) {
  const reports = getReports()
  const idx = reports.findIndex(r => r.id === id)
  if (idx >= 0) { Object.assign(reports[idx], updates); saveReports(reports) }
}

export function hasReported(userId: string, targetType: string, targetId: string): boolean {
  return getReports().some(
    r => r.reporterId === userId && r.targetType === targetType && r.targetId === targetId
  )
}

// ── Announcements ───────────────────────────────────────────

export function getAnnouncements(): Announcement[] { return load('announcements') ?? [] }
export function saveAnnouncements(a: Announcement[]) { store('announcements', a) }

export function createAnnouncementItem(data: Partial<Announcement>) {
  const anns = getAnnouncements()
  anns.unshift({ id: uuid(), createdAt: new Date().toISOString(), ...data } as Announcement)
  saveAnnouncements(anns)
}

export function deleteAnnouncementItem(id: string) {
  saveAnnouncements(getAnnouncements().filter(a => a.id !== id))
}

// ── Session ─────────────────────────────────────────────────

export function setSession(user: User | null) {
  if (user) sessionStorage.setItem('honglind_session', JSON.stringify(user))
  else sessionStorage.removeItem('honglind_session')
}

export function getSession(): User | null {
  try { return JSON.parse(sessionStorage.getItem('honglind_session') || 'null') }
  catch { return null }
}

export function currentUser(): User | null {
  return getSession()
}

export function refreshSession() {
  const s = getSession()
  if (!s) return
  const fresh = getUserById(s.id)
  if (fresh) setSession(fresh)
}

// ── Seed ────────────────────────────────────────────────────

export async function seed() {
  if (load('seeded_v6')) return

  ;['seeded_v3', 'seeded_v4', 'seeded_v5', 'initialized', 'initialized_v2'].forEach(k => {
    localStorage.removeItem('honglind_' + k)
  })

  try {
    const [users, posts, comments, reports] = await Promise.all([
      fetch('/data/users.json').then(r => r.json()),
      fetch('/data/posts.json').then(r => r.json()),
      fetch('/data/comments.json').then(r => r.json()),
      fetch('/data/reports.json').then(r => r.json()),
    ])
    saveUsers(users)
    savePosts(posts)
    saveComments(comments)
    saveReports(reports)
  } catch (e) {
    console.warn('JSON fetch failed, using inline seed:', e)
    inlineSeed()
  }

  store('seeded_v6', true)
}

function inlineSeed() {
  const now = new Date(), h = 3600000
  const users: User[] = [
    { id: 'u1', nickname: '은혜의종', email: 'grace@seminary.ac.kr', password: 'Test1234!', affiliation: 'A신학대학원', role: 'admin', banned: false, createdAt: '2026-02-10T09:00:00.000Z' },
    { id: 'u2', nickname: '말씀묵상', email: 'word@church.org', password: 'Test1234!', affiliation: 'B장로교회', role: 'user', banned: false, createdAt: '2026-02-15T10:00:00.000Z' },
    { id: 'u3', nickname: '예배인도자', email: 'worship@seminary.ac.kr', password: 'Test1234!', affiliation: 'C신학대학원', role: 'user', banned: false, createdAt: '2026-03-01T11:00:00.000Z' },
    { id: 'u4', nickname: '새벽기도', email: 'dawn@church.org', password: 'Test1234!', affiliation: 'D교회', role: 'user', banned: false, createdAt: '2026-03-10T05:00:00.000Z' },
    { id: 'u5', nickname: '청년목사', email: 'youth@church.org', password: 'Test1234!', affiliation: 'E감리교회', role: 'user', banned: false, createdAt: '2026-03-15T10:00:00.000Z' },
  ]
  const posts: Post[] = [
    { id: 'p1', authorId: 'u1', category: '사역고민', title: '부교역자 3년차, 담임목사님과의 관계가 너무 어렵습니다', content: '부교역자로 섬긴 지 3년이 되었는데, 담임목사님의 사역 방향과 제 생각이 자꾸 달라서 힘듭니다.', likes: ['u2', 'u3', 'u4'], views: 287, createdAt: new Date(now.getTime() - h * 3).toISOString(), updatedAt: null, cheongbing: null, prayers: null, sermonVerse: null, poll: null },
    { id: 'p2', authorId: 'u3', category: '유머', title: '주일학교 아이가 한 말에 빵 터졌습니다 ㅋㅋ', content: '"모세가 홍해를 건넜어요" 했더니 아이가 "수영 잘 했어요?" 물어봄 ㅋㅋ', likes: ['u1', 'u2', 'u4', 'u5'], views: 523, createdAt: new Date(now.getTime() - h * 1).toISOString(), updatedAt: null, cheongbing: null, prayers: null, sermonVerse: null, poll: null },
    { id: 'p3', authorId: 'u4', category: '청빙', title: '[청빙] 서울 강남구 소재 교회 청년부 담당 전도사 청빙', content: '중형교회에서 청년부 담당 전도사님을 청빙합니다.', likes: ['u1', 'u2'], views: 412, createdAt: new Date(now.getTime() - h * 12).toISOString(), updatedAt: null, cheongbing: { position: '청년부 전도사', denomination: '대한예수교장로회(합동)', region: '서울 강남구', salary: '월 250만원 + 사택', deadline: '2026-05-15', contact: 'recruit@gangnamchurch.org', churchSize: '출석 300명' }, prayers: null, sermonVerse: null, poll: null },
    { id: 'p4', authorId: 'u2', category: '기도요청', title: '아버지 수술을 앞두고 있습니다', content: '아버지께서 다음 주 심장 수술을 받으시게 되었습니다. 함께 기도해주세요.', likes: ['u1', 'u3', 'u4', 'u5'], views: 234, createdAt: new Date(now.getTime() - h * 2).toISOString(), updatedAt: null, cheongbing: null, prayers: ['u1', 'u3', 'u4', 'u5'], sermonVerse: null, poll: null },
  ]
  const comments: Comment[] = [
    { id: 'c1', postId: 'p1', authorId: 'u2', parentId: null, content: '공감합니다. 저도 비슷한 상황이었어요.', likes: ['u1'], createdAt: new Date(now.getTime() - h * 2.5).toISOString() },
    { id: 'c2', postId: 'p2', authorId: 'u4', parentId: null, content: 'ㅋㅋㅋ 아이들 진짜 순수해요', likes: ['u3'], createdAt: new Date(now.getTime() - h * 0.5).toISOString() },
  ]
  saveUsers(users)
  savePosts(posts)
  saveComments(comments)
  saveReports([])
}
