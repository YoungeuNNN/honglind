// ── User ────────────────────────────────────────────────────
export interface User {
  id: string
  nickname: string
  email: string
  password?: string
  affiliation?: string
  role: 'admin' | 'user'
  banned: boolean
  createdAt: string
}

// ── Post ────────────────────────────────────────────────────
export interface CheongbingData {
  position: string
  denomination: string
  region: string
  churchSize: string
  salary: string
  deadline: string
  contact: string
}

export interface PollOption {
  text: string
  votes: string[]
}

export interface Poll {
  options: PollOption[]
}

export interface Post {
  id: string
  authorId: string
  category: string
  title: string
  content: string
  likes: string[]
  views: number
  createdAt: string
  updatedAt: string | null
  cheongbing: CheongbingData | null
  prayers: string[] | null
  prayerAnswered?: boolean
  sermonVerse: string | null
  poll: Poll | null
}

// ── Comment ─────────────────────────────────────────────────
export interface Comment {
  id: string
  postId: string
  authorId: string
  parentId: string | null
  content: string
  likes: string[]
  createdAt: string
  updatedAt?: string
}

// ── Notification ────────────────────────────────────────────
export type NotificationType = 'like' | 'prayer' | 'comment' | 'reply'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  postId: string
  message: string
  read: boolean
  createdAt: string
}

// ── Message (DM) ────────────────────────────────────────────
export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
}

export interface Conversation {
  otherUserId: string
  lastMsg: Message
}

// ── Report ──────────────────────────────────────────────────
export interface Report {
  id: string
  reporterId: string
  targetType: 'post' | 'comment'
  targetId: string
  reason: string
  detail: string
  status: 'pending' | 'resolved' | 'dismissed'
  createdAt: string
}

// ── Block ───────────────────────────────────────────────────
export interface Block {
  blockerId: string
  blockedId: string
  createdAt: string
}

// ── Bookmark ────────────────────────────────────────────────
export interface Bookmark {
  userId: string
  postId: string
  createdAt: string
}

// ── Announcement ────────────────────────────────────────────
export interface Announcement {
  id: string
  authorId: string
  title: string
  content: string
  createdAt: string
}

// ── AllowedDomain ───────────────────────────────────────────
export interface AllowedDomain {
  id: string
  domain: string
  description: string | null
  createdAt: string
}

// 회원가입 결과 — 이메일 인증 활성화 시 session 이 없을 수 있음
export interface SignUpResult {
  user: User | null
  requiresEmailConfirmation: boolean
}
