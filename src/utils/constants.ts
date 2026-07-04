export const CATEGORIES = [
  '자유', '사역고민',
  '기도요청', '사역장터', '청빙',
  // 청빙 부활(2026-07): 사례비 진실 DB 유입 루프의 입구. 외부 초빙 링크+교회별 사례비 패널 연동.
  // '신학토론' · '설교준비' — 게시판 삭제됨 (라벨/이모지/색상은 레거시 글 표시용으로만 유지)
  // '연봉'(사례비/처우) — 게시판 삭제됨 (라벨/이모지는 레거시 글 표시용으로만 유지)
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  자유:     '자유게시판',
  사역고민: '사역 고민',
  신학토론: '신학 토론',
  설교준비: '설교 준비',
  기도요청: '기도 요청',
  연봉:     '사례비/처우',
  청빙:     '청빙 공고',
  사역장터: '사역장터',
}

// 사역장터 거래유형 / 거래상태 라벨
export const MARKET_TYPES = ['판매', '무료나눔', '제작의뢰', '구매요청'] as const

export const MARKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: '거래중',   color: 'var(--success)' },
  reserved:  { label: '예약중',   color: 'var(--primary)' },
  done:      { label: '거래완료', color: 'var(--subtext)' },
}

export const REPORT_REASONS = [
  { code: 'spam',          label: '스팸/광고' },
  { code: 'abuse',         label: '욕설/비방' },
  { code: 'false_info',    label: '허위 정보' },
  { code: 'privacy',       label: '개인정보 노출' },
  { code: 'inappropriate', label: '음란/부적절한 내용' },
  { code: 'other',         label: '기타' },
]

// 가입(학생증) 승인 상태 라벨/색상
export const MEMBERSHIP_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: '가입 승인 대기', color: 'var(--primary)' },
  approved: { label: '가입 승인됨',   color: 'var(--success)' },
  rejected: { label: '가입 거절',     color: 'var(--danger)' },
}

// 신학대학원 재학생(재학증명서) 인증 상태 라벨/색상
export const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  unverified: { label: '미인증',   color: 'var(--subtext)' },
  pending:    { label: '인증 검토중', color: 'var(--primary)' },
  verified:   { label: '인증 완료', color: 'var(--success)' },
  rejected:   { label: '인증 거절', color: 'var(--danger)' },
}

// ── 게시판별 검색 색인 정책 (수익 ↔ 익명성 스위치) ──────────────
// true  = 검색엔진 색인 허용 (검색 유입 + 광고 수익↑)
// false = noindex (검색 결과에서 제외 → 신원 추적 위험↓, 단 그 보드의 검색 유입 수익은 사라짐)
//
// 기본은 전체 색인. 민감 보드를 검색에서 빼고 싶으면 해당 값만 false 로 바꾸면 즉시 적용된다.
// (글 상세 페이지·카테고리 화면의 <meta name="robots"> 가 이 값을 따라감. robots.txt 는 크롤 자체는
//  계속 허용하므로 AdSense 광고 크롤러는 영향 없음 — 색인만 빠진다.)
export const CATEGORY_INDEXABLE: Record<string, boolean> = {
  자유:     true,
  사역고민: true,   // 민감: 신원 추적 우려 시 false 권장
  신학토론: true,
  설교준비: true,
  기도요청: true,   // 민감: 신원 추적 우려 시 false 권장
  사역장터: true,
  청빙:     true,   // 민감(지역·교회 노출): 우려 시 false 권장
  연봉:     true,   // 민감(사례비): 우려 시 false 권장
}

export function isCategoryIndexable(category: string): boolean {
  return CATEGORY_INDEXABLE[category] ?? true
}

// 사례비 시급 환산 비교용 최저임금(원/시). ⚠ 매년 실제 고시값으로 갱신할 것.
// 시급 환산 = 월 실수령 / (주당 사역시간 * WEEKS_PER_MONTH)
export const MIN_WAGE_HOURLY = 10_320 // 2026년 기준(확정 고시값으로 반드시 확인/갱신)
export const WEEKS_PER_MONTH = 4.345  // 주 → 월 환산 계수 (마이그레이션 RPC 와 반드시 동일)

// 사례비 제보 폼/필터 공용 옵션
export const SIDO_LIST = [
  '서울','부산','대구','인천','광주','대전','울산','세종',
  '경기','강원','충북','충남','전북','전남','경북','경남','제주',
] as const

export const DENOMINATIONS = [
  '예장합동','예장통합','예장고신','예장백석','예장대신',
  '기장','기감(감리교)','기침(침례교)','기하성(순복음)','성결교','루터교','기타',
] as const

export const CHURCH_SIZE_BUCKETS = ['~50','50-150','150-300','300-1000','1000+'] as const

export const MINISTRY_POSITIONS = ['파트전도사','교육전도사','풀타임전도사','부목사','기타'] as const

export const CATEGORY_EMOJIS: Record<string, string> = {
  all:      '\u{1F3E0}',
  인기:     '\u{1F525}',
  자유:     '\u{1F4AC}',
  사역고민: '\u{1F64F}',
  신학토론: '\u{1F4D6}',
  설교준비: '\u{26F3}',
  기도요청: '\u{1F54A}',
  연봉:     '\u{1F4B0}',
  청빙:     '\u{1F4E3}',
  사역장터: '\u{1F6D2}',
}
