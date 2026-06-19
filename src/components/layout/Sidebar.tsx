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
    { category: '신학토론', label: '신학 토론', emoji: '\u{1F4D6}' },
    { category: '설교준비', label: '설교 준비', emoji: '\u{26F3}' },
    { category: '기도요청', label: '기도요청', emoji: '\u{1F54A}' },
    { category: '연봉', label: '사례비/처우', emoji: '\u{1F4B0}' },
    { category: '사역장터', label: '사역장터', emoji: '\u{1F6D2}' },
  ]},
  // 청빙 게시판은 커뮤니티 성장 후 오픈 (숨김)
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
