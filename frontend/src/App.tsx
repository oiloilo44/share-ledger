import { useEffect, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { appRouter } from './router';
import { buildTheme } from './theme';
import { useUIStore } from './stores/uiStore';
import { useOfflineStore } from './stores/offlineStore';
import { flushOfflineQueue, getOfflineQueueCount } from './lib/offlineQueue';
import { useToastStore } from './stores/toastStore';
import { ErrorBoundary } from './components';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const mode = useUIStore((state) => state.themeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  useEffect(() => {
    const updateOffline = () => {
      useOfflineStore.getState().setOffline(!navigator.onLine);
    };

    const syncQueue = async () => {
      if (!navigator.onLine) return;
      const result = await flushOfflineQueue();
      const remaining = getOfflineQueueCount();
      useOfflineStore.getState().setPendingEntries(remaining);
      if (result.success > 0) {
        useToastStore.getState().showToast(`${result.success}건을 동기화했습니다.`, {
          severity: 'success',
          title: '오프라인 동기화',
        });
      }
      if (result.failure > 0) {
        useToastStore.getState().showToast(`${result.failure}건이 아직 대기 중입니다.`, {
          severity: 'warning',
          title: '동기화 실패',
        });
      }
    };

    updateOffline();
    useOfflineStore.getState().setPendingEntries(getOfflineQueueCount());
    syncQueue().catch(() => undefined);

    const handleOnline = () => {
      updateOffline();
      syncQueue().catch(() => undefined);
    };

    const handleOffline = () => {
      updateOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
            <RouterProvider router={appRouter} />
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
