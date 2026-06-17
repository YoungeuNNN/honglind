import { useNavigate } from 'react-router-dom'
import { HomeIcon, BriefcaseIcon, PlusIcon, CircleIcon, UserIcon } from '@/components/ui/Icons'
import { useAuthAction } from '@/hooks/useAuthAction'

export function MobileNav() {
  const navigate = useNavigate()
  const guard = useAuthAction()

  return (
    <div className="mobile-nav">
      <div className="mobile-nav-item active" onClick={() => navigate('/')}>
        <HomeIcon />홈
      </div>
      <div className="mobile-nav-item" onClick={() => navigate('/?category=청빙')}>
        <BriefcaseIcon />청빙
      </div>
      <div className="mobile-nav-item" onClick={guard(() => navigate('/write'))} style={{ color: 'var(--primary)' }}>
        <PlusIcon size={20} />글쓰기
      </div>
      <div className="mobile-nav-item" onClick={() => navigate('/?category=기도요청')}>
        <CircleIcon />기도
      </div>
      <div className="mobile-nav-item" onClick={guard(() => navigate('/my-posts'))}>
        <UserIcon />내글
      </div>
    </div>
  )
}
