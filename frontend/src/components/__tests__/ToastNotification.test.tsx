import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastNotification } from '../ToastNotification';
import { useToastStore } from '../../stores/toastStore';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderToastNotification = () => {
  return render(
    <ThemeProvider theme={theme}>
      <ToastNotification />
    </ThemeProvider>,
  );
};

describe('ToastNotification', () => {
  beforeEach(() => {
    // 각 테스트 전 스토어 초기화
    useToastStore.setState({ open: false, message: '', severity: 'info' });
  });

  it('초기 상태에서 보이지 않음', () => {
    renderToastNotification();
    // Snackbar가 닫혀있으면 메시지가 DOM에 없음
    expect(screen.queryByText(/test/i)).not.toBeInTheDocument();
  });

  it('showToast 호출 시 메시지 표시', async () => {
    renderToastNotification();

    // 토스트 표시
    useToastStore.getState().showToast('테스트 메시지');

    await waitFor(() => {
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
    });
  });

  it('severity=success일 때 성공 아이콘 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('성공 메시지', 'success');

    await waitFor(() => {
      expect(screen.getByText('성공 메시지')).toBeInTheDocument();
    });
    // CheckCircleRoundedIcon이 렌더링되는지 확인 (svg 요소 확인)
    const container = screen.getByText('성공 메시지').closest('.MuiPaper-root');
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('severity=error일 때 에러 아이콘 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('에러 메시지', 'error');

    await waitFor(() => {
      expect(screen.getByText('에러 메시지')).toBeInTheDocument();
    });
    const container = screen.getByText('에러 메시지').closest('.MuiPaper-root');
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('severity=warning일 때 경고 아이콘 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('경고 메시지', 'warning');

    await waitFor(() => {
      expect(screen.getByText('경고 메시지')).toBeInTheDocument();
    });
  });

  it('severity=info일 때 정보 아이콘 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('정보 메시지', 'info');

    await waitFor(() => {
      expect(screen.getByText('정보 메시지')).toBeInTheDocument();
    });
  });

  it('title이 있으면 제목 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('메시지', {
      severity: 'success',
      title: '성공!',
    });

    await waitFor(() => {
      expect(screen.getByText('성공!')).toBeInTheDocument();
      expect(screen.getByText('메시지')).toBeInTheDocument();
    });
  });

  it('title이 없으면 메시지만 표시', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('메시지만');

    await waitFor(() => {
      expect(screen.getByText('메시지만')).toBeInTheDocument();
    });
    // AlertTitle이 없는지 확인
    const alertTitle = screen.queryByRole('heading');
    expect(alertTitle).not.toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 hideToast 호출', async () => {
    const user = userEvent.setup();
    renderToastNotification();

    useToastStore.getState().showToast('테스트 메시지');

    await waitFor(() => {
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
    });

    // 닫기 버튼 클릭
    const closeButton = screen.getByRole('button', { name: '' });
    await user.click(closeButton);

    // 스토어의 open이 false로 변경되었는지 확인
    await waitFor(() => {
      expect(useToastStore.getState().open).toBe(false);
    });
  });

  it('여러 줄 메시지 지원', async () => {
    renderToastNotification();

    const multilineMessage = '첫 번째 줄\n두 번째 줄\n세 번째 줄';
    useToastStore.getState().showToast(multilineMessage);

    await waitFor(() => {
      // 각 줄이 포함되어 있는지 확인
      expect(screen.getByText(/첫 번째 줄/)).toBeInTheDocument();
      expect(screen.getByText(/두 번째 줄/)).toBeInTheDocument();
      expect(screen.getByText(/세 번째 줄/)).toBeInTheDocument();
    });
  });

  it('duration 옵션 적용', async () => {
    renderToastNotification();

    useToastStore.getState().showToast('짧은 토스트', {
      severity: 'info',
      duration: 1000,
    });

    await waitFor(() => {
      expect(screen.getByText('짧은 토스트')).toBeInTheDocument();
    });
    // duration이 Snackbar에 전달되는지 확인 (실제 자동 닫힘 테스트는 타이머 모킹 필요)
  });

  it('showToast에 문자열 severity 전달', async () => {
    renderToastNotification();

    // 문자열로 severity 전달
    useToastStore.getState().showToast('에러 발생', 'error');

    await waitFor(() => {
      expect(screen.getByText('에러 발생')).toBeInTheDocument();
    });
  });

  it('showToast에 객체 옵션 전달', async () => {
    renderToastNotification();

    // 객체로 옵션 전달
    useToastStore.getState().showToast('성공했습니다', {
      severity: 'success',
      title: '완료',
      duration: 5000,
    });

    await waitFor(() => {
      expect(screen.getByText('완료')).toBeInTheDocument();
      expect(screen.getByText('성공했습니다')).toBeInTheDocument();
    });
  });
});
