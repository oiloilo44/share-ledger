import { alpha, createTheme } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { designTokens, resolveModeTokens } from './tokens';

export const buildTheme = (mode: PaletteMode = 'light') => {
  const modeTokens = resolveModeTokens(mode);

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: modeTokens.accent.primary,
        light: mode === 'light' ? '#5f6ff0' : '#b5c0ff',
        dark: mode === 'light' ? '#1f2ba8' : '#7280ff',
        contrastText: modeTokens.text.inverse,
      },
      secondary: {
        main: modeTokens.accent.secondary,
        contrastText: modeTokens.text.primary,
      },
      background: {
        default: modeTokens.surface.background,
        paper: modeTokens.surface.surface,
      },
      info: {
        main: modeTokens.semantic.info,
      },
      success: {
        main: modeTokens.semantic.success,
      },
      warning: {
        main: modeTokens.semantic.warning,
      },
      error: {
        main: modeTokens.semantic.error,
      },
      text: {
        primary: modeTokens.text.primary,
        secondary: modeTokens.text.secondary,
      },
      divider: modeTokens.divider,
    },
    shape: {
      borderRadius: designTokens.radius.md,
    },
    spacing: designTokens.spacing.unit,
    typography: {
      fontFamily: designTokens.typography.fontFamily,
      h1: {
        fontSize: designTokens.typography.heading.xl.size,
        fontWeight: designTokens.typography.heading.xl.weight,
        lineHeight: designTokens.typography.heading.xl.lineHeight,
      },
      h2: {
        fontSize: designTokens.typography.heading.lg.size,
        fontWeight: designTokens.typography.heading.lg.weight,
        lineHeight: designTokens.typography.heading.lg.lineHeight,
      },
      h3: {
        fontSize: designTokens.typography.heading.md.size,
        fontWeight: designTokens.typography.heading.md.weight,
        lineHeight: designTokens.typography.heading.md.lineHeight,
      },
      body1: {
        fontSize: designTokens.typography.body.lg.size,
        fontWeight: designTokens.typography.body.lg.weight,
        lineHeight: designTokens.typography.body.lg.lineHeight,
      },
      body2: {
        fontSize: designTokens.typography.body.md.size,
        fontWeight: designTokens.typography.body.md.weight,
        lineHeight: designTokens.typography.body.md.lineHeight,
      },
      subtitle2: {
        fontSize: designTokens.typography.label.md.size,
        fontWeight: designTokens.typography.label.md.weight,
        letterSpacing: designTokens.typography.label.md.letterSpacing,
        lineHeight: designTokens.typography.label.md.lineHeight,
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // 전역 CSS 변수 및 브라우저 호환성 개선
          ':root': {
            // iOS Safari 100vh 문제 해결
            '--vh': '1vh',
            // 다이나믹 뷰포트 높이 지원 (iOS Safari 15+)
            '--dvh': '1dvh',
          },
          html: {
            // 모바일 브라우저 터치 스크롤 개선
            WebkitOverflowScrolling: 'touch',
            // 폰트 렌더링 최적화
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            // 텍스트 크기 자동 조정 방지 (모바일)
            WebkitTextSizeAdjust: '100%',
            textSizeAdjust: '100%',
          },
          body: {
            backgroundColor: modeTokens.surface.background,
            color: modeTokens.text.primary,
            // iOS Safari 탭 하이라이트 제거
            WebkitTapHighlightColor: 'transparent',
            // 터치 액션 최적화
            touchAction: 'manipulation',
          },
          // 접근성: 키보드 네비게이션을 위한 포커스 스타일
          '*:focus-visible': {
            outline: `3px solid ${modeTokens.accent.primary}`,
            outlineOffset: '2px',
            borderRadius: designTokens.radius.sm,
          },
          // 마우스 클릭 시에는 포커스 링 제거
          '*:focus:not(:focus-visible)': {
            outline: 'none',
          },
          // 링크 접근성
          'a:focus-visible': {
            outline: `3px solid ${modeTokens.accent.primary}`,
            outlineOffset: '2px',
            textDecoration: 'underline',
            textDecorationThickness: '2px',
          },
          // 스크롤바 스타일
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor:
              mode === 'light'
                ? alpha(modeTokens.text.primary, 0.16)
                : alpha(modeTokens.text.primary, 0.24),
            borderRadius: designTokens.radius.pill,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: alpha(modeTokens.surface.surface, 0.4),
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: false,
        },
        styleOverrides: {
          root: {
            borderRadius: designTokens.radius.lg,
            paddingInline: designTokens.spacing.xl,
            paddingBlock: designTokens.spacing.md,
            fontWeight: 700,
            letterSpacing: '0.01em',
            transition: `all ${designTokens.animation.duration.base}ms ${designTokens.animation.easing.easeOut}`,
            '&:active': {
              transform: 'scale(0.98)',
            },
            // 접근성: 키보드 포커스 스타일
            '&:focus-visible': {
              outline: `3px solid ${modeTokens.accent.primary}`,
              outlineOffset: '3px',
            },
          },
          sizeLarge: {
            paddingInline: designTokens.spacing.xl,
            paddingBlock: designTokens.spacing.lg,
            fontSize: '1.125rem',
          },
          sizeMedium: {
            paddingInline: designTokens.spacing.lg,
            paddingBlock: designTokens.spacing.md,
          },
          sizeSmall: {
            paddingInline: designTokens.spacing.md,
            paddingBlock: designTokens.spacing.sm,
          },
          containedPrimary: {
            boxShadow: designTokens.shadow.level1,
            '&:hover': {
              boxShadow: designTokens.shadow.level2,
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderWidth: 2,
            borderColor: alpha(modeTokens.accent.primary, 0.32),
            '&:hover': {
              borderWidth: 2,
              borderColor: modeTokens.accent.primary,
              backgroundColor: alpha(modeTokens.accent.primary, mode === 'light' ? 0.08 : 0.12),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.radius.pill,
            fontWeight: 600,
            backgroundColor:
              mode === 'light'
                ? modeTokens.accent.primaryMuted
                : alpha(modeTokens.accent.primary, 0.16),
            color: mode === 'light' ? modeTokens.accent.primary : modeTokens.accent.primary,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: designTokens.radius.lg,
            boxShadow: designTokens.shadow.level2,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontWeight: 700,
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              borderRadius: designTokens.radius.md,
              boxShadow: designTokens.shadow.level1,
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.radius.md,
            alignItems: 'center',
            paddingBlock: designTokens.spacing.sm,
            paddingInline: designTokens.spacing.lg,
          },
          icon: {
            fontSize: '1.75rem',
            marginRight: designTokens.spacing.sm,
            opacity: 0.92,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.radius.lg,
            boxShadow: designTokens.shadow.level1,
            backgroundImage: 'none',
            transition: `all ${designTokens.animation.duration.base}ms ${designTokens.animation.easing.easeOut}`,
            '&:hover': {
              boxShadow: designTokens.shadow.level2,
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '&:focus-visible, &.Mui-focused': {
                outline: `2px solid ${modeTokens.accent.primary}`,
                outlineOffset: '1px',
              },
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: `all ${designTokens.animation.duration.fast}ms ${designTokens.animation.easing.easeOut}`,
            '&:focus-visible': {
              outline: `3px solid ${modeTokens.accent.primary}`,
              outlineOffset: '2px',
              backgroundColor: alpha(modeTokens.accent.primary, mode === 'light' ? 0.08 : 0.12),
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            '&:focus-visible': {
              outline: `3px solid ${modeTokens.accent.primary}`,
              outlineOffset: '2px',
            },
          },
        },
      },
    },
  });

  return theme;
};
