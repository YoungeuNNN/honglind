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
  sourceUrl?: string    // 외부 초빙 공고 출처 링크 (예: 장신대 초빙게시판)
  churchKey?: string     // 사례비 진실 DB와 연결하는 정규화 교회키 (관리자/파일럿 수기 부여)
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

// ── 사례비 진실 DB (Salary Truth) ────────────────────────────
// 스펙: PLANNING_SALARY_TRUTH.md
export type MinistryPosition =
  | '파트전도사' | '교육전도사' | '풀타임전도사' | '부목사' | '기타'

// 출석 규모 버킷 (원시 인원수 저장 금지 — 특정 방지)
export type ChurchSizeBucket =
  | '~50' | '50-150' | '150-300' | '300-1000' | '1000+'

// 개별 제보 (본인 조회 전용 — 집계 외 노출 안 함). reporterId 는 클라이언트로 안 내려온다.
export interface SalaryReport {
  id: string
  denomination: string           // 교단
  regionSido: string             // 시/도
  regionSigungu: string          // 시/군/구 (동 이하 금지)
  churchSize: ChurchSizeBucket
  position: MinistryPosition
  monthlyStipend: number         // 월 실수령(원, 정수)
  weeklyHours: number            // 주당 사역시간
  housingProvided: boolean       // 사택
  mealsProvided: boolean         // 식사
  transportProvided: boolean     // 교통비
  insurance4: boolean            // 4대보험
  serveYear: number              // 사역(수령) 연도. 연 단위만
  note?: string | null
  createdAt: string
}

// 제보 입력 payload (churchName 은 관리자 정규화용 원문)
export interface SalaryReportInput {
  denomination: string
  regionSido: string
  regionSigungu: string
  churchSize: ChurchSizeBucket
  position: MinistryPosition
  monthlyStipend: number
  weeklyHours: number
  housingProvided: boolean
  mealsProvided: boolean
  transportProvided: boolean
  insurance4: boolean
  serveYear: number
  note?: string | null
  churchName?: string | null
  churchKey?: string | null   // 청빙 글에서 URL로 전달돼 제보를 해당 교회에 자동 연결
}

// 지역·직분별 집계 (RPC 반환. count 는 항상 >= 3)
export interface SalaryAggRow {
  groupLabel: string
  count: number
  medianMonthly: number
  p25Monthly: number
  p75Monthly: number
  medianHourly: number           // 시급 = 월 / (주당 * 4.345)
  housingRate: number            // 0~1
  insuranceRate: number          // 0~1
}

// 특정 교회 집계 (N<3 이면 fetch 가 null 반환)
export interface ChurchSalaryAgg {
  count: number
  medianMonthly: number
  medianHourly: number
  housingRate: number
  insuranceRate: number
}

// 랜딩/헤드라인
export interface SalaryOverview {
  totalReports: number
  medianHourlyPart: number        // 파트전도사 시급 중앙값
  belowMinWageRate: number        // 최저임금 미만 비율 (감정·확산 훅)
  updatedYear: number
}
