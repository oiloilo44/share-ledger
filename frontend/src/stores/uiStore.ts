import { create } from 'zustand';
import type { PaletteMode } from '@mui/material';

type UIState = {
  themeMode: PaletteMode;
  toggleTheme: () => void;
  initializeTheme: () => void;
};

// localStorage에서 저장된 테마 모드 불러오기
const getStoredThemeMode = (): PaletteMode | null => {
  try {
    const stored = localStorage.getItem('themeMode');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to load theme mode from localStorage:', error);
  }
  return null;
};

// 시스템 다크 모드 설정 감지
const getSystemThemeMode = (): PaletteMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 초기 테마 모드 결정: localStorage > 시스템 설정 > 'light'
const getInitialThemeMode = (): PaletteMode => {
  const stored = getStoredThemeMode();
  if (stored) {
    return stored;
  }
  return getSystemThemeMode();
};

export const useUIStore = create<UIState>((set, get) => ({
  themeMode: getInitialThemeMode(),

  toggleTheme: () => {
    const nextMode: PaletteMode = get().themeMode === 'light' ? 'dark' : 'light';
    set({ themeMode: nextMode });
    // localStorage에 저장
    try {
      localStorage.setItem('themeMode', nextMode);
    } catch (error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
  },

  initializeTheme: () => {
    const initialMode = getInitialThemeMode();
    set({ themeMode: initialMode });
  },
}));
