export const CATEGORIES = [
  '자유', '사역고민', '교회생활', '신학교',
  '신학토론', '설교나눔', '기도요청', '연봉', '유머', '청빙',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  자유:     '자유게시판',
  사역고민: '사역 고민',
  교회생활: '교회생활',
  신학교:   '신학교생활',
  신학토론: '신학 토론',
  설교나눔: '설교 나눔',
  기도요청: '기도요청',
  연봉:     '사례비/처우',
  유머:     '유머/위로',
  청빙:     '청빙 공고',
}

export const DAILY_VERSES = [
  { text: '여호와를 의지하는 자는 시온 산이 요동치 아니하고 영원히 있음 같도다', ref: '시편 125:1' },
  { text: '두세 사람이 내 이름으로 모인 곳에 나도 그들 중에 있느니라', ref: '마태복음 18:20' },
  { text: '내가 너를 강하게 하리라 참 내가 너를 도와주리라', ref: '이사야 41:10' },
  { text: '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라', ref: '데살로니가전서 5:16-18' },
  { text: '네 시작은 미약하였으나 네 나중은 심히 창대하리라', ref: '욥기 8:7' },
  { text: '나의 은혜가 네게 족하도다 이는 내 능력이 약한 데서 온전하여짐이라', ref: '고린도후서 12:9' },
]

export const REPORT_REASONS = [
  { code: 'spam',          label: '스팸/광고' },
  { code: 'abuse',         label: '욕설/비방' },
  { code: 'false_info',    label: '허위 정보' },
  { code: 'privacy',       label: '개인정보 노출' },
  { code: 'inappropriate', label: '음란/부적절한 내용' },
  { code: 'other',         label: '기타' },
]

export const CATEGORY_EMOJIS: Record<string, string> = {
  all:      '\u{1F3E0}',
  인기:     '\u{1F525}',
  자유:     '\u{1F4AC}',
  사역고민: '\u{1F64F}',
  교회생활: '\u{26EA}',
  신학교:   '\u{1F393}',
  신학토론: '\u{1F4D6}',
  설교나눔: '\u{26F3}',
  기도요청: '\u{1F54A}',
  연봉:     '\u{1F4B0}',
  유머:     '\u{1F60A}',
  청빙:     '\u{1F4E3}',
}
