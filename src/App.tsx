import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/guards/AuthGuard'
import { AdminGuard } from '@/guards/AdminGuard'
import { Toast } from '@/components/ui/Toast'
import { AuthPage } from '@/pages/AuthPage'
import { FeedPage } from '@/pages/FeedPage'
import { PostDetailPage } from '@/pages/PostDetailPage'
import { WritePage } from '@/pages/WritePage'
import { MyPostsPage } from '@/pages/MyPostsPage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DMListPage } from '@/pages/DMListPage'
import { DMThreadPage } from '@/pages/DMThreadPage'
import { AdminPage } from '@/pages/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

function AppInit({ children }: { children: React.ReactNode }) {
  const { init, initialized } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--subtext)', fontSize: 14 }}>
        로딩 중...
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit>
          <Toast />
          <Routes>
            {/* 인증 불필요 */}
            <Route path="/auth" element={<AuthPage />} />

            {/* 공개 — 로그인 없이 볼 수 있는 페이지 (홈/게시판 목록) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<FeedPage />} />
            </Route>

            {/* 인증 필요 — AppLayout 안에 렌더링 */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/write" element={<WritePage />} />
              <Route path="/write/:id" element={<WritePage />} />
              <Route path="/my-posts" element={<MyPostsPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/dm" element={<DMListPage />} />
              <Route path="/dm/:userId" element={<DMThreadPage />} />
              <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
