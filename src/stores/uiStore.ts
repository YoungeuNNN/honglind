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

  toggleUserMenu: () => void
  closeUserMenu: () => void
  toggleNotifPanel: () => void
  closeNotifPanel: () => void
  openReportModal: (targetType: 'post' | 'comment', targetId: string) => void
  closeReportModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  userMenuOpen: false,
  notifPanelOpen: false,
  reportModal: { open: false, targetType: 'post', targetId: '' },

  toggleUserMenu: () => set(s => ({ userMenuOpen: !s.userMenuOpen })),
  closeUserMenu: () => set({ userMenuOpen: false }),
  toggleNotifPanel: () => set(s => ({ notifPanelOpen: !s.notifPanelOpen })),
  closeNotifPanel: () => set({ notifPanelOpen: false }),
  openReportModal: (targetType, targetId) => set({ reportModal: { open: true, targetType, targetId } }),
  closeReportModal: () => set(s => ({ reportModal: { ...s.reportModal, open: false } })),
}))
