import { create } from 'zustand'

interface ReportModalState {
  open: boolean
  targetType: 'post' | 'comment'
  targetId: string
}

interface UIState {
  userMenuOpen: boolean
  notifPanelOpen: boolean
  reportModal: ReportModalState
  loginPromptOpen: boolean
  pendingAction: (() => void) | null   // 로그인 성공 후 이어서 실행할 동작(예: 클릭했던 글로 이동)
  verifyPromptOpen: boolean
  membershipPromptOpen: boolean
  dataVersion: number   // 데이터 캐시가 갱신될 때마다 +1 (구독 컴포넌트 재렌더용)

  bumpData: () => void
  toggleUserMenu: () => void
  closeUserMenu: () => void
  toggleNotifPanel: () => void
  closeNotifPanel: () => void
  openReportModal: (targetType: 'post' | 'comment', targetId: string) => void
  closeReportModal: () => void
  openLoginPrompt: (action?: () => void) => void
  closeLoginPrompt: () => void
  openVerifyPrompt: () => void
  closeVerifyPrompt: () => void
  openMembershipPrompt: () => void
  closeMembershipPrompt: () => void
}

export const useUIStore = create<UIState>((set) => ({
  userMenuOpen: false,
  notifPanelOpen: false,
  reportModal: { open: false, targetType: 'post', targetId: '' },
  loginPromptOpen: false,
  pendingAction: null,
  verifyPromptOpen: false,
  membershipPromptOpen: false,
  dataVersion: 0,

  bumpData: () => set(s => ({ dataVersion: s.dataVersion + 1 })),
  toggleUserMenu: () => set(s => ({ userMenuOpen: !s.userMenuOpen })),
  closeUserMenu: () => set({ userMenuOpen: false }),
  toggleNotifPanel: () => set(s => ({ notifPanelOpen: !s.notifPanelOpen })),
  closeNotifPanel: () => set({ notifPanelOpen: false }),
  openReportModal: (targetType, targetId) => set({ reportModal: { open: true, targetType, targetId } }),
  closeReportModal: () => set(s => ({ reportModal: { ...s.reportModal, open: false } })),
  openLoginPrompt: (action) => set({ loginPromptOpen: true, pendingAction: action ?? null }),
  closeLoginPrompt: () => set({ loginPromptOpen: false, pendingAction: null }),
  openVerifyPrompt: () => set({ verifyPromptOpen: true }),
  closeVerifyPrompt: () => set({ verifyPromptOpen: false }),
  openMembershipPrompt: () => set({ membershipPromptOpen: true }),
  closeMembershipPrompt: () => set({ membershipPromptOpen: false }),
}))
