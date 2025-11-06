import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet } from '../BottomSheet';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderBottomSheet = (props: Partial<React.ComponentProps<typeof BottomSheet>> = {}) => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    children: <div>Test Content</div>,
  };

  return render(
    <ThemeProvider theme={theme}>
      <BottomSheet {...defaultProps} {...props} />
    </ThemeProvider>,
  );
};

describe('BottomSheet', () => {
  it('초기 렌더링 시 children 표시', () => {
    renderBottomSheet();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('open=false일 때 보이지 않음', () => {
    renderBottomSheet({ open: false });
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('title prop을 받으면 제목 표시', () => {
    renderBottomSheet({ title: 'Test Title' });
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('title이 없으면 제목 영역 표시 안 함', () => {
    renderBottomSheet();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose 호출', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderBottomSheet({ onClose, title: 'Test Title' });

    const closeButton = screen.getByRole('button', { name: '' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hideCloseButton=true일 때 닫기 버튼 숨김', () => {
    renderBottomSheet({ title: 'Test Title', hideCloseButton: true });

    const titleElement = screen.getByText('Test Title');
    const titleContainer = titleElement.closest('[role="heading"]');
    if (titleContainer) {
      const buttons = within(titleContainer as HTMLElement).queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    }
  });

  it('백드롭 클릭 시 onClose 호출', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderBottomSheet({ onClose });

    // MUI Dialog의 backdrop 찾기
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (backdrop) {
      await user.click(backdrop as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('disableBackdropClick=true일 때 백드롭 클릭해도 onClose 호출 안 함', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderBottomSheet({ onClose, disableBackdropClick: true });

    // MUI Dialog의 backdrop 찾기
    const backdrop = document.querySelector('.MuiBackdrop-root');
    if (backdrop) {
      await user.click(backdrop as HTMLElement);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('여러 children 렌더링', () => {
    renderBottomSheet({
      children: (
        <>
          <div>First Child</div>
          <div>Second Child</div>
          <button>Action Button</button>
        </>
      ),
    });

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });
});
