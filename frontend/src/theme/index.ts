import { createTheme } from '@mui/material';
import type { PaletteMode, ThemeOptions } from '@mui/material';

const sharedOptions: ThemeOptions = {
  typography: {
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
};

const lightPalette: ThemeOptions['palette'] = {
  mode: 'light',
  primary: { main: '#2d3a8c' },
  secondary: { main: '#f4a261' },
  background: {
    default: '#f8f9fb',
    paper: '#ffffff',
  },
};

const darkPalette: ThemeOptions['palette'] = {
  mode: 'dark',
  primary: { main: '#9ab4ff' },
  secondary: { main: '#f6bd60' },
  background: {
    default: '#0f172a',
    paper: '#111827',
  },
};

export const buildTheme = (mode: PaletteMode = 'light') =>
  createTheme({
    ...sharedOptions,
    palette: mode === 'dark' ? darkPalette : lightPalette,
  });
