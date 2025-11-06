import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderConfirmDialog = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const defaultProps = {
    open: true,
    title: 'Test Title',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <ConfirmDialog {...defaultProps} {...props} />
    </ThemeProvider>,
  );
};

describe('ConfirmDialog', () => {
  it('초기 렌더링 시 제목 표시', () => {
    renderConfirmDialog();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('open=false일 때 보이지 않음', () => {
    renderConfirmDialog({ open: false });
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('description prop을 받으면 설명 표시', () => {
    renderConfirmDialog({ description: 'This is a test description' });
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('description이 없으면 설명 영역 표시 안 함', () => {
    renderConfirmDialog();
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('확인 버튼 클릭 시 onConfirm 호출', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderConfirmDialog({ onConfirm });

    const confirmButton = screen.getByRole('button', { name: '확인' });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('취소 버튼 클릭 시 onCancel 호출', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderConfirmDialog({ onCancel });

    const cancelButton = screen.getByRole('button', { name: '취소' });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirmText prop으로 확인 버튼 텍스트 변경', () => {
    renderConfirmDialog({ confirmText: '삭제하기' });
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();
  });

  it('cancelText prop으로 취소 버튼 텍스트 변경', () => {
    renderConfirmDialog({ cancelText: '닫기' });
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });

  it('loading=true일 때 버튼 비활성화', () => {
    renderConfirmDialog({ loading: true });

    const confirmButton = screen.getByRole('button', { name: '확인' });
    const cancelButton = screen.getByRole('button', { name: '취소' });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('variant=danger일 때 error 색상 적용', () => {
    renderConfirmDialog({ variant: 'danger' });

    const confirmButton = screen.getByRole('button', { name: '확인' });
    // MUI의 error 색상이 적용되는지 확인 (클래스 또는 스타일로)
    expect(confirmButton).toHaveClass('MuiButton-containedError');
  });

  it('variant=success일 때 success 색상 적용', () => {
    renderConfirmDialog({ variant: 'success' });

    const confirmButton = screen.getByRole('button', { name: '확인' });
    expect(confirmButton).toHaveClass('MuiButton-containedSuccess');
  });

  it('variant=info일 때 primary 색상 적용', () => {
    renderConfirmDialog({ variant: 'info' });

    const confirmButton = screen.getByRole('button', { name: '확인' });
    expect(confirmButton).toHaveClass('MuiButton-containedPrimary');
  });

  it('variant=warning일 때 제목 표시', () => {
    renderConfirmDialog({ variant: 'warning', title: '경고' });
    // variant가 설정되면 제목이 표시됨
    expect(screen.getByText('경고')).toBeInTheDocument();
  });

  it('여러 줄 description 지원', () => {
    const multilineDesc = 'Line 1\nLine 2\nLine 3';
    renderConfirmDialog({ description: multilineDesc });
    // 여러 줄 텍스트는 부분 매치로 확인
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
  });
});
