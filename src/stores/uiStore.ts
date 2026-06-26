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
  openLoginPrompt: () => void
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
  openLoginPrompt: () => set({ loginPromptOpen: true }),
  closeLoginPrompt: () => set({ loginPromptOpen: false }),
  openVerifyPrompt: () => set({ verifyPromptOpen: true }),
  closeVerifyPrompt: () => set({ verifyPromptOpen: false }),
  openMembershipPrompt: () => set({ membershipPromptOpen: true }),
  closeMembershipPrompt: () => set({ membershipPromptOpen: false }),
}))
