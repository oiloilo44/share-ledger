import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineBanner } from '../OfflineBanner';
import { useOfflineStore } from '../../stores/offlineStore';
import { useToastStore } from '../../stores/toastStore';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

// offlineQueue 모킹
vi.mock('../../lib/offlineQueue', () => ({
  flushOfflineQueue: vi.fn(),
  getOfflineQueueCount: vi.fn(),
}));

import { flushOfflineQueue, getOfflineQueueCount } from '../../lib/offlineQueue';

const renderOfflineBanner = () => {
  return render(
    <ThemeProvider theme={theme}>
      <OfflineBanner />
    </ThemeProvider>,
  );
};

describe('OfflineBanner', () => {
  beforeEach(() => {
    // 각 테스트 전 스토어 초기화
    useOfflineStore.setState({ isOffline: false, pendingEntries: 0 });
    useToastStore.setState({ open: false, message: '', severity: 'info' });
    // 모킹된 함수 초기화
    vi.clearAllMocks();
  });

  describe('렌더링 조건', () => {
    it('isOffline=false, pendingEntries=0일 때 렌더링 안 됨', () => {
      useOfflineStore.setState({ isOffline: false, pendingEntries: 0 });
      renderOfflineBanner();

      // Alert가 렌더링되지 않음
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('isOffline=true일 때 오프라인 배너 표시', () => {
      useOfflineStore.setState({ isOffline: true, pendingEntries: 0 });
      renderOfflineBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('오프라인 모드입니다. 작성한 내역은 연결 시 자동 업로드됩니다.'),
      ).toBeInTheDocument();
    });

    it('isOffline=false, pendingEntries > 0일 때 대기 중 배너 표시', () => {
      useOfflineStore.setState({ isOffline: false, pendingEntries: 3 });
      renderOfflineBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('동기화 대기 중인 내역 3건이 있습니다.')).toBeInTheDocument();
    });

    it('isOffline=true, pendingEntries > 0일 때 오프라인 배너만 표시', () => {
      useOfflineStore.setState({ isOffline: true, pendingEntries: 5 });
      renderOfflineBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('오프라인 모드입니다. 작성한 내역은 연결 시 자동 업로드됩니다.'),
      ).toBeInTheDocument();
      // 대기 중 메시지는 표시되지 않음
      expect(screen.queryByText(/동기화 대기 중인/)).not.toBeInTheDocument();
    });
  });

  describe('UI 요소', () => {
    it('오프라인 모드일 때 WifiOffIcon 표시', () => {
      useOfflineStore.setState({ isOffline: true, pendingEntries: 0 });
      renderOfflineBanner();

      const alert = screen.getByRole('alert');
      // WifiOffIcon이 렌더링되는지 확인 (svg 요소 확인)
      expect(alert.querySelector('svg')).toBeInTheDocument();
    });

    it('대기 중일 때 "지금 동기화" 버튼 표시', () => {
      useOfflineStore.setState({ isOffline: false, pendingEntries: 2 });
      renderOfflineBanner();

      const syncButton = screen.getByRole('button', { name: /지금 동기화/ });
      expect(syncButton).toBeInTheDocument();
    });

    it('오프라인 모드일 때 "지금 동기화" 버튼 표시 안 됨', () => {
      useOfflineStore.setState({ isOffline: true, pendingEntries: 3 });
      renderOfflineBanner();

      expect(screen.queryByRole('button', { name: /지금 동기화/ })).not.toBeInTheDocument();
    });
  });

  describe('수동 동기화', () => {
    it('"지금 동기화" 버튼 클릭 시 성공 토스트 표시', async () => {
      const user = userEvent.setup();
      useOfflineStore.setState({ isOffline: false, pendingEntries: 3 });

      // flushOfflineQueue가 성공을 반환하도록 모킹
      vi.mocked(flushOfflineQueue).mockResolvedValue({ success: 3, failure: 0 });
      vi.mocked(getOfflineQueueCount).mockReturnValue(0);

      renderOfflineBanner();

      const syncButton = screen.getByRole('button', { name: /지금 동기화/ });
      await user.click(syncButton);

      await waitFor(() => {
        expect(flushOfflineQueue).toHaveBeenCalledTimes(1);
        expect(getOfflineQueueCount).toHaveBeenCalledTimes(1);
      });

      // 스토어의 pendingEntries가 업데이트되었는지 확인
      expect(useOfflineStore.getState().pendingEntries).toBe(0);

      // 성공 토스트가 표시되었는지 확인
      await waitFor(() => {
        expect(useToastStore.getState().message).toBe('3건을 동기화했습니다.');
        expect(useToastStore.getState().severity).toBe('success');
      });
    });

    it('"지금 동기화" 버튼 클릭 시 실패 토스트 표시', async () => {
      const user = userEvent.setup();
      useOfflineStore.setState({ isOffline: false, pendingEntries: 5 });

      // flushOfflineQueue가 실패를 반환하도록 모킹
      vi.mocked(flushOfflineQueue).mockResolvedValue({ success: 0, failure: 5 });
      vi.mocked(getOfflineQueueCount).mockReturnValue(5);

      renderOfflineBanner();

      const syncButton = screen.getByRole('button', { name: /지금 동기화/ });
      await user.click(syncButton);

      await waitFor(() => {
        expect(flushOfflineQueue).toHaveBeenCalledTimes(1);
      });

      // 실패 토스트가 표시되었는지 확인
      await waitFor(() => {
        expect(useToastStore.getState().message).toBe('5건이 아직 대기 중입니다.');
        expect(useToastStore.getState().severity).toBe('warning');
      });
    });

    it('"지금 동기화" 버튼 클릭 시 부분 성공 토스트 표시', async () => {
      const user = userEvent.setup();
      useOfflineStore.setState({ isOffline: false, pendingEntries: 5 });

      // flushOfflineQueue가 부분 성공을 반환하도록 모킹
      vi.mocked(flushOfflineQueue).mockResolvedValue({ success: 3, failure: 2 });
      vi.mocked(getOfflineQueueCount).mockReturnValue(2);

      renderOfflineBanner();

      const syncButton = screen.getByRole('button', { name: /지금 동기화/ });
      await user.click(syncButton);

      await waitFor(() => {
        expect(flushOfflineQueue).toHaveBeenCalledTimes(1);
      });

      // 성공 토스트가 먼저 표시되고, 실패 토스트가 나중에 표시됨
      // 마지막으로 설정된 토스트를 확인
      await waitFor(() => {
        const toastState = useToastStore.getState();
        // 마지막으로 설정된 토스트는 실패 메시지
        expect(toastState.message).toBe('2건이 아직 대기 중입니다.');
        expect(toastState.severity).toBe('warning');
      });
    });
  });

  describe('Alert severity', () => {
    it('오프라인 모드일 때 severity=warning', () => {
      useOfflineStore.setState({ isOffline: true, pendingEntries: 0 });
      renderOfflineBanner();

      const alert = screen.getByRole('alert');
      // MUI Alert의 severity는 클래스명으로 확인
      expect(alert.className).toContain('MuiAlert-standardWarning');
    });

    it('대기 중일 때 severity=info', () => {
      useOfflineStore.setState({ isOffline: false, pendingEntries: 2 });
      renderOfflineBanner();

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('MuiAlert-standardInfo');
    });
  });
});
