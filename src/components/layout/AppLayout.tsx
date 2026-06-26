import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { CategoryTabs } from './CategoryTabs'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { ReportModal } from '@/components/report/ReportModal'
import { LoginPromptModal } from '@/components/ui/LoginPromptModal'
import { VerifyPromptModal } from '@/components/ui/VerifyPromptModal'
import { MembershipPromptModal } from '@/components/ui/MembershipPromptModal'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

export function AppLayout() {
  useAutoRefresh()
  return (
    <>
      <Header />
      <CategoryTabs />
      <div className="layout-new">
        <main className="main-new">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MobileNav />
      <ReportModal />
      <LoginPromptModal />
      <VerifyPromptModal />
      <MembershipPromptModal />
    </>
  )
}
