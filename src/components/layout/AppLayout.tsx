import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { CategoryTabs } from './CategoryTabs'
import { MobileNav } from './MobileNav'
import { ReportModal } from '@/components/report/ReportModal'
import { LoginPromptModal } from '@/components/ui/LoginPromptModal'

export function AppLayout() {
  return (
    <>
      <Header />
      <CategoryTabs />
      <div className="layout-new">
        <main className="main-new">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <ReportModal />
      <LoginPromptModal />
    </>
  )
}
