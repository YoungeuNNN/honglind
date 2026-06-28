// ── User ────────────────────────────────────────────────────
// 1단계(학생증) 가입/읽기 게이트: pending → approved / rejected
export type MembershipStatus = 'pending' | 'approved' | 'rejected'
// 2단계(재학증명서) 쓰기 게이트: unverified → pending → verified / rejected
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface User {
  id: string
  nickname: string
  email: string
  password?: string
  affiliation?: string
  role: 'admin' | 'user'
  banned: boolean
  membershipStatus: MembershipStatus
  membershipNote?: string | null
  studentIdDoc?: string | null
  enrollmentDoc?: string | null
  verificationStatus: VerificationStatus
  verificationNote?: string | null
  verifiedAt?: string | null
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

// ── 사역장터 (거래/자료 게시판) ──────────────────────────────
export type MarketType = '판매' | '무료나눔' | '제작의뢰' | '구매요청'
export type MarketStatus = 'available' | 'reserved' | 'done'

export interface MarketData {
  type: MarketType
  price: string      // 자유 입력 (예: "10,000원", "무료", "협의")
  status: MarketStatus
  contact: string
}

export interface Attachment {
  path: string                 // storage 경로 (market-files 버킷)
  name: string
  kind: 'image' | 'file'
}

export interface Post {
  id: string
  authorId: string
  category: string
  title: string
  content: string
  likes: string[]
  likeBoost?: number   // 관리자 가산 좋아요(보정치). 표시 개수 = 실제 좋아요 + likeBoost
  views: number
  createdAt: string
  updatedAt: string | null
  cheongbing: CheongbingData | null
  market: MarketData | null
  attachments: Attachment[]
  prayers: string[] | null
  prayerAnswered?: boolean
  sermonVerse: string | null
  poll: Poll | null
  commentCount: number   // 목록/미승인 표시용 댓글 수
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
