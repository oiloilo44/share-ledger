import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from '../src/theme';

const preview: Preview = {
  globalTypes: {
    themeMode: {
      name: '테마',
      description: '라이트/다크 모드 전환',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        surface: { name: 'surface', value: '#fafbff' },
        'surface-dark': { name: 'surface-dark', value: '#0b1220' },
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = buildTheme(context.globals.themeMode ?? 'light');
      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      );
    },
  ],

  initialGlobals: {
    backgrounds: {
      value: 'surface',
    },
  },
};

export default preview;
