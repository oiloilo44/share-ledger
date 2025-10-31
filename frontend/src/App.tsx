import { useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { appRouter } from './router';
import { buildTheme } from './theme';
import { useUIStore } from './stores/uiStore';

const App = () => {
  const mode = useUIStore((state) => state.themeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={appRouter} />
    </ThemeProvider>
  );
};

export default App;
