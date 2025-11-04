/**
 * Toast 알림 상태 관리 Zustand store
 */

import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
  showToast: (message: string, severity?: ToastSeverity) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  showToast: (message: string, severity: ToastSeverity = 'info') =>
    set({ open: true, message, severity }),
  hideToast: () => set({ open: false }),
}));
