/**
 * Toast 알림 상태 관리 Zustand store
 */

import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
  title?: string;
  duration?: number;
  showToast: (message: string, options?: ToastSeverity | ToastShowOptions) => void;
  hideToast: () => void;
}

export interface ToastShowOptions {
  severity?: ToastSeverity;
  title?: string;
  duration?: number;
}

export const useToastStore = create<ToastState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  showToast: (message, options) => {
    if (typeof options === 'string') {
      set({ open: true, message, severity: options, title: undefined, duration: undefined });
      return;
    }
    const { severity = 'info', title, duration } = options ?? {};
    set({ open: true, message, severity, title, duration });
  },
  hideToast: () => set({ open: false, title: undefined, duration: undefined }),
}));
