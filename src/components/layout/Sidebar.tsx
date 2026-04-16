import { useNavigate, useSearchParams } from 'react-router-dom'

const SIDEBAR_ITEMS = [
  { section: '커뮤니티', items: [
    { category: 'all', label: '전체 피드', emoji: '\u{1F3E0}' },
    { category: '인기', label: '인기글', emoji: '\u{1F525}', tag: 'HOT' },
    { route: '/bookmarks', label: '저장한 글', emoji: '\u{1F516}' },
  ]},
  { section: '게시판', items: [
    { category: '자유', label: '자유게시판', emoji: '\u{1F4AC}' },
    { category: '사역고민', label: '사역 고민', emoji: '\u{1F64F}' },
    { category: '교회생활', label: '교회생활', emoji: '\u{26EA}' },
    { category: '신학교', label: '신학교생활', emoji: '\u{1F393}' },
    { category: '신학토론', label: '신학 토론', emoji: '\u{1F4D6}' },
    { category: '설교나눔', label: '설교 나눔', emoji: '\u{26F3}' },
    { category: '기도요청', label: '기도요청', emoji: '\u{1F54A}' },
    { category: '연봉', label: '사례비/처우', emoji: '\u{1F4B0}' },
    { category: '유머', label: '유머/위로', emoji: '\u{1F60A}' },
  ]},
  { section: '청빙', items: [
    { category: '청빙', label: '청빙 공고', emoji: '\u{1F4E3}', tag: 'NEW' },
  ]},
]

export function Sidebar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'

  const handleClick = (item: { category?: string; route?: string }) => {
    if (item.route) {
      navigate(item.route)
    } else if (item.category) {
      navigate(item.category === 'all' ? '/' : `/?category=${item.category}`)
    }
  }

  return (
    <nav className="sidebar">
      {SIDEBAR_ITEMS.map((section, si) => (
        <div key={si}>
          {si > 0 && <div className="sidebar-divider" />}
          <div className="sidebar-section">
            <div className="sidebar-title">{section.section}</div>
            {section.items.map((item, ii) => (
              <div
                key={ii}
                className={`sidebar-item ${item.category === currentCategory ? 'active' : ''}`}
                onClick={() => handleClick(item)}
              >
                <span className="e">{item.emoji}</span>
                {item.label}
                {item.tag === 'HOT' && <span className="hot-tag">HOT</span>}
                {item.tag === 'NEW' && <span className="new-tag">NEW</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
