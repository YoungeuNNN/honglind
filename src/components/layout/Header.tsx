import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { SearchIcon, BellIcon, PlusIcon, DocumentIcon, BookmarkIcon, MessageIcon, SettingsIcon, ShieldIcon, LogoutIcon } from '@/components/ui/Icons'
import { NotificationPanel } from '@/components/notification/NotificationPanel'

export function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { userMenuOpen, toggleUserMenu, closeUserMenu } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeUserMenu()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [closeUserMenu])

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    closeUserMenu()
    navigate('/auth', { replace: true })
    try { await logout() } catch (e) { console.error('logout failed:', e) }
  }

  if (!user) return null

  return (
    <header className="header">
      <div className="header-left">
        <a className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon"><span className="logo-cross">&#10013;</span></div>
          <span className="logo-text"><span>홍</span>라인드</span>
        </a>
        <div className="search-bar">
          <SearchIcon />
          <input
            type="text"
            placeholder="검색어를 입력하세요"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyUp={handleSearch}
          />
        </div>
      </div>
      <div className="header-right">
        <NotificationPanel />
        <button className="btn btn-primary btn-small" onClick={() => navigate('/write')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PlusIcon /> 글쓰기
        </button>
        <div className="user-menu" ref={menuRef}>
          <div className="user-avatar" onClick={toggleUserMenu}>{user.nickname[0]}</div>
          <div className={`user-dropdown ${userMenuOpen ? 'show' : ''}`}>
            <div className="user-dropdown-header">
              {user.nickname}
              <small>{user.email}</small>
            </div>
            <div className="user-dropdown-item" onClick={() => { closeUserMenu(); navigate('/my-posts') }}>
              <DocumentIcon /> 내가 쓴 글
            </div>
            <div className="user-dropdown-item" onClick={() => { closeUserMenu(); navigate('/bookmarks') }}>
              <BookmarkIcon /> 저장한 글
            </div>
            <div className="user-dropdown-item" onClick={() => { closeUserMenu(); navigate('/dm') }}>
              <MessageIcon /> 쪽지함
            </div>
            <div className="user-dropdown-item" onClick={() => { closeUserMenu(); navigate('/settings') }}>
              <SettingsIcon /> 계정 설정
            </div>
            {user.role === 'admin' && (
              <div className="user-dropdown-item" onClick={() => { closeUserMenu(); navigate('/admin') }} style={{ color: 'var(--primary)' }}>
                <ShieldIcon /> 관리자
              </div>
            )}
            <div className="user-dropdown-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
              <LogoutIcon /> 로그아웃
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
