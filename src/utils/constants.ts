export const CATEGORIES = [
  '자유', '사역고민', '신학토론', '설교준비',
  '기도요청', '사역장터',
  // '청빙' — 커뮤니티가 모일 때까지 숨김 (라벨/이모지/필드는 유지, 목록에 다시 추가하면 부활)
  // '연봉'(사례비/처우) — 게시판 삭제됨 (라벨/이모지는 레거시 글 표시용으로만 유지)
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  자유:     '자유게시판',
  사역고민: '사역 고민',
  신학토론: '신학 토론',
  설교준비: '설교 준비',
  기도요청: '기도요청',
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
