import { useNavigate, useSearchParams } from 'react-router-dom'

const CATEGORY_ITEMS = [
  { category: 'all', label: '전체', emoji: '🏠' },
  { category: '인기', label: '인기글', emoji: '🔥' },
  { category: '자유', label: '자유게시판', emoji: '💬' },
  { category: '사역고민', label: '사역 고민', emoji: '🙏' },
  { category: '신학토론', label: '신학 토론', emoji: '📖' },
  { category: '설교준비', label: '설교 준비', emoji: '🎙️' },
  { category: '기도요청', label: '기도요청', emoji: '🕊️' },
  { category: '연봉', label: '사례비/처우', emoji: '💰' },
  { category: '사역장터', label: '사역장터', emoji: '🛒' },
  // { category: '청빙', label: '청빙 공고', emoji: '📢' },  // 숨김 — 커뮤니티 성장 후 오픈
]

export function CategoryTabs() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'

  const handleCategoryClick = (category: string) => {
    if (category === 'all') {
      navigate('/')
    } else {
      navigate(`/?category=${category}`)
    }
  }

  return (
    <div className="category-tabs">
      <div className="category-tabs-container">
        {CATEGORY_ITEMS.map((item) => (
          <button
            key={item.category}
            className={`category-tab ${currentCategory === item.category ? 'active' : ''}`}
            onClick={() => handleCategoryClick(item.category)}
          >
            <span className="category-emoji">{item.emoji}</span>
            <span className="category-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}