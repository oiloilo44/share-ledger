import type { PaletteMode } from '@mui/material';

export interface SemanticColorSet {
  success: string;
  info: string;
  warning: string;
  error: string;
  neutral: string;
}

export interface SurfaceColorSet {
  background: string;
  surface: string;
  surfaceElevated: string;
  outline: string;
}

export interface TextColorSet {
  primary: string;
  secondary: string;
  muted: string;
  inverse: string;
}

export interface AccentColorSet {
  primary: string;
  primaryMuted: string;
  secondary: string;
  accent: string;
}

export interface ElevationShadows {
  level0: string;
  level1: string;
  level2: string;
}

export interface AnimationConfig {
  duration: {
    fast: number;
    base: number;
    slow: number;
    slower: number;
  };
  easing: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    spring: string;
  };
}

export interface RadiusScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  pill: number;
}

export interface SpacingScale {
  unit: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface TypographyScale {
  fontFamily: string;
  heading: {
    xl: { size: string; weight: number; lineHeight: number };
    lg: { size: string; weight: number; lineHeight: number };
    md: { size: string; weight: number; lineHeight: number };
  };
  body: {
    lg: { size: string; weight: number; lineHeight: number };
    md: { size: string; weight: number; lineHeight: number };
    sm: { size: string; weight: number; lineHeight: number };
  };
  label: {
    md: { size: string; weight: number; lineHeight: number; letterSpacing: string };
    sm: { size: string; weight: number; lineHeight: number; letterSpacing: string };
  };
}

export interface TokenModeConfig {
  text: TextColorSet;
  surface: SurfaceColorSet;
  accent: AccentColorSet;
  semantic: SemanticColorSet;
  divider: string;
}

export interface DesignTokens {
  spacing: SpacingScale;
  radius: RadiusScale;
  typography: TypographyScale;
  shadow: ElevationShadows;
  animation: AnimationConfig;
  mode: Record<'light' | 'dark', TokenModeConfig>;
}

export const designTokens: DesignTokens = {
  spacing: {
    unit: 4,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    xs: 4,
    sm: 6,
    md: 12,
    lg: 18,
    pill: 999,
  },
  typography: {
    fontFamily:
      'Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: {
      xl: { size: '2.25rem', weight: 800, lineHeight: 1.2 },
      lg: { size: '1.75rem', weight: 800, lineHeight: 1.25 },
      md: { size: '1.5rem', weight: 700, lineHeight: 1.3 },
    },
    body: {
      lg: { size: '1.125rem', weight: 600, lineHeight: 1.5 },
      md: { size: '1rem', weight: 500, lineHeight: 1.5 },
      sm: { size: '0.875rem', weight: 500, lineHeight: 1.5 },
    },
    label: {
      md: { size: '0.875rem', weight: 600, lineHeight: 1.4, letterSpacing: '0.01em' },
      sm: { size: '0.75rem', weight: 600, lineHeight: 1.4, letterSpacing: '0.01em' },
    },
  },
  shadow: {
    level0: 'none',
    level1: '0 2px 8px rgba(0, 0, 0, 0.08)',
    level2: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  animation: {
    duration: {
      fast: 150,
      base: 200,
      slow: 300,
      slower: 500,
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
  mode: {
    light: {
      text: {
        primary: '#191F28',
        secondary: 'rgba(25, 31, 40, 0.72)',
        muted: 'rgba(25, 31, 40, 0.56)',
        inverse: '#FFFFFF',
      },
      surface: {
        background: '#F9FAFB',
        surface: '#FFFFFF',
        surfaceElevated: '#F4F6F9',
        outline: 'rgba(25, 31, 40, 0.08)',
      },
      accent: {
        primary: '#0064FF',
        primaryMuted: '#E3F2FF',
        secondary: '#FF9500',
        accent: '#00C1DE',
      },
      semantic: {
        success: '#00C853',
        info: '#0064FF',
        warning: '#FF9500',
        error: '#FF3B30',
        neutral: '#6B7684',
      },
      divider: 'rgba(25, 31, 40, 0.08)',
    },
    dark: {
      text: {
        primary: '#F9FAFB',
        secondary: 'rgba(249, 250, 251, 0.78)',
        muted: 'rgba(155, 164, 181, 0.72)',
        inverse: '#191F28',
      },
      surface: {
        background: '#0B1120',
        surface: '#191F28',
        surfaceElevated: '#242B38',
        outline: 'rgba(155, 164, 181, 0.16)',
      },
      accent: {
        primary: '#5B9FFF',
        primaryMuted: '#1E3A5F',
        secondary: '#FFB340',
        accent: '#4DD4E8',
      },
      semantic: {
        success: '#34E27A',
        info: '#5B9FFF',
        warning: '#FFB340',
        error: '#FF6B6B',
        neutral: '#9BA4B5',
      },
      divider: 'rgba(155, 164, 181, 0.16)',
    },
  },
};

export const resolveModeTokens = (mode: PaletteMode) => designTokens.mode[mode];
