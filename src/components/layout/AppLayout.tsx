import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { ReportModal } from '@/components/report/ReportModal'
import { LoginModal } from '@/components/ui/LoginModal'
import { VerifyPromptModal } from '@/components/ui/VerifyPromptModal'
import { MembershipPromptModal } from '@/components/ui/MembershipPromptModal'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

export function AppLayout() {
  useAutoRefresh()
  return (
    <>
      <Header />
      <div className="layout-new">
        <main className="main-new">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MobileNav />
      <ReportModal />
      <LoginModal />
      <VerifyPromptModal />
      <MembershipPromptModal />
    </>
  )
}
