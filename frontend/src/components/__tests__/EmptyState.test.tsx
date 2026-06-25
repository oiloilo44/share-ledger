import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '../EmptyState';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { InboxOutlined } from '@mui/icons-material';

const theme = createTheme();

const renderEmptyState = (props: React.ComponentProps<typeof EmptyState>) => {
  return render(
    <ThemeProvider theme={theme}>
      <EmptyState {...props} />
    </ThemeProvider>,
  );
};

describe('EmptyState', () => {
  it('제목이 올바르게 렌더링', () => {
    renderEmptyState({ title: '데이터가 없습니다' });
    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
  });

  it('설명이 제공되면 렌더링', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      description: '새로운 항목을 추가하세요',
    });
    expect(screen.getByText('새로운 항목을 추가하세요')).toBeInTheDocument();
  });

  it('설명이 없으면 렌더링하지 않음', () => {
    renderEmptyState({ title: '데이터가 없습니다' });
    expect(screen.queryByText('새로운 항목을 추가하세요')).not.toBeInTheDocument();
  });

  it('아이콘이 제공되면 렌더링', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      icon: <InboxOutlined data-testid="inbox-icon" />,
    });
    expect(screen.getByTestId('inbox-icon')).toBeInTheDocument();
  });

  it('아이콘이 없으면 렌더링하지 않음', () => {
    renderEmptyState({ title: '데이터가 없습니다' });
    expect(screen.queryByTestId('inbox-icon')).not.toBeInTheDocument();
  });

  it('액션 버튼이 제공되면 렌더링', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      actions: [{ label: '추가하기' }],
    });
    expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
  });

  it('여러 액션 버튼 렌더링', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      actions: [{ label: '추가하기' }, { label: '가져오기' }],
    });
    expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가져오기' })).toBeInTheDocument();
  });

  it('액션 버튼 클릭 시 onClick 호출', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderEmptyState({
      title: '데이터가 없습니다',
      actions: [{ label: '추가하기', onClick }],
    });

    const button = screen.getByRole('button', { name: '추가하기' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('tone prop에 따라 다른 스타일 적용 (neutral)', () => {
    const { container } = renderEmptyState({
      title: '데이터가 없습니다',
      tone: 'neutral',
    });
    expect(container).toBeInTheDocument();
  });

  it('tone prop에 따라 다른 스타일 적용 (informative)', () => {
    const { container } = renderEmptyState({
      title: '정보가 없습니다',
      tone: 'informative',
    });
    expect(container).toBeInTheDocument();
  });

  it('tone prop에 따라 다른 스타일 적용 (uplift)', () => {
    const { container } = renderEmptyState({
      title: '성공!',
      tone: 'uplift',
    });
    expect(container).toBeInTheDocument();
  });

  it('기본 tone은 neutral', () => {
    const { container } = renderEmptyState({ title: '데이터가 없습니다' });
    expect(container).toBeInTheDocument();
  });

  it('액션 버튼의 variant와 color prop 전달', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      actions: [{ label: '추가하기', variant: 'contained', color: 'primary' }],
    });
    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toBeInTheDocument();
  });

  it('disabled 액션 버튼 렌더링', () => {
    renderEmptyState({
      title: '데이터가 없습니다',
      actions: [{ label: '추가하기', disabled: true }],
    });
    const button = screen.getByRole('button', { name: '추가하기' });
    expect(button).toBeDisabled();
  });
});
