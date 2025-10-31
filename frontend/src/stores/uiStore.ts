import { create } from 'zustand';
import type { PaletteMode } from '@mui/material';

type UIState = {
  themeMode: PaletteMode;
  toggleTheme: () => void;
};

export const useUIStore = create<UIState>((set, get) => ({
  themeMode: 'light',
  toggleTheme: () => {
    const nextMode: PaletteMode = get().themeMode === 'light' ? 'dark' : 'light';
    set({ themeMode: nextMode });
  },
}));
