import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/guards/AuthGuard'
import { MembershipGuard } from '@/guards/MembershipGuard'
import { AdminGuard } from '@/guards/AdminGuard'
import { Toast } from '@/components/ui/Toast'
import { AuthPage } from '@/pages/AuthPage'
import { AboutPage } from '@/pages/AboutPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
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
            {/* 인증 불필요 — 헤더 없는 독립 페이지(로그인) */}
            <Route path="/auth" element={<AuthPage />} />

            {/* 공개 — 헤더/푸터(AppLayout)는 유지하고 콘텐츠만 교체 (홈/게시판/글 상세/약관 등) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<FeedPage />} />
              {/* 글 상세: 비로그인/검색봇도 제목·메타 열람(SEO·AdSense 색인용).
                  본문·댓글은 페이지 내부에서 승인 회원에게만 노출(canSeeContent). */}
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
            </Route>

            {/* 인증 필요 — AppLayout 안에 렌더링 */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/write" element={<MembershipGuard><WritePage /></MembershipGuard>} />
              <Route path="/write/:id" element={<MembershipGuard><WritePage /></MembershipGuard>} />
              <Route path="/my-posts" element={<MembershipGuard><MyPostsPage /></MembershipGuard>} />
              <Route path="/bookmarks" element={<MembershipGuard><BookmarksPage /></MembershipGuard>} />
              <Route path="/dm" element={<MembershipGuard><DMListPage /></MembershipGuard>} />
              <Route path="/dm/:userId" element={<MembershipGuard><DMThreadPage /></MembershipGuard>} />
              {/* 설정은 미승인 회원도 접근(신청 상태 확인/재신청) */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
