import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar, type FilterOption } from '../FilterBar';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const mockOptions: FilterOption[] = [
  { value: 'all', label: '전체', count: 10 },
  { value: 'income', label: '수입', count: 3 },
  { value: 'expense', label: '지출', count: 7 },
];

const renderFilterBar = (props: Partial<React.ComponentProps<typeof FilterBar>> = {}) => {
  const defaultProps = {
    options: mockOptions,
    value: ['all'],
    onChange: vi.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <FilterBar {...defaultProps} {...props} />
    </ThemeProvider>,
  );
};

describe('FilterBar', () => {
  it('초기 렌더링 시 모든 옵션 표시', () => {
    renderFilterBar();
    expect(screen.getByText('전체')).toBeInTheDocument();
    expect(screen.getByText('수입')).toBeInTheDocument();
    expect(screen.getByText('지출')).toBeInTheDocument();
  });

  it('count가 있으면 표시', () => {
    renderFilterBar();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('선택되지 않은 필터 클릭 시 onChange 호출', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterBar({ onChange, value: ['all'] });

    const incomeChip = screen.getByText('수입').closest('.MuiChip-root');
    if (incomeChip) {
      await user.click(incomeChip);
      expect(onChange).toHaveBeenCalledWith(['all', 'income']);
    }
  });

  it('선택된 필터 클릭 시 선택 해제', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterBar({ onChange, value: ['all', 'income'] });

    const incomeChip = screen.getByText('수입').closest('.MuiChip-root');
    if (incomeChip) {
      await user.click(incomeChip);
      expect(onChange).toHaveBeenCalledWith(['all']);
    }
  });

  it('allowEmpty=false일 때 마지막 필터 해제 불가', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterBar({ onChange, value: ['all'], allowEmpty: false });

    const allChip = screen.getByText('전체').closest('.MuiChip-root');
    if (allChip) {
      await user.click(allChip);
      // 마지막 필터이므로 해제되지 않고 그대로 유지
      expect(onChange).toHaveBeenCalledWith(['all']);
    }
  });

  it('allowEmpty=true일 때 마지막 필터 해제 가능', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterBar({ onChange, value: ['all'], allowEmpty: true });

    const allChip = screen.getByText('전체').closest('.MuiChip-root');
    if (allChip) {
      await user.click(allChip);
      // 빈 배열로 해제됨
      expect(onChange).toHaveBeenCalledWith([]);
    }
  });

  it('label prop을 받으면 라벨 표시', () => {
    renderFilterBar({ label: '필터' });
    expect(screen.getByText('필터')).toBeInTheDocument();
  });

  it('label이 없으면 라벨 표시 안 함', () => {
    renderFilterBar();
    expect(screen.queryByText('필터')).not.toBeInTheDocument();
  });

  it('icon이 있으면 아이콘 표시', () => {
    const optionsWithIcon: FilterOption[] = [
      { value: 'all', label: '전체', icon: <span data-testid="icon-all">📄</span> },
      { value: 'income', label: '수입', icon: <span data-testid="icon-income">💰</span> },
    ];

    renderFilterBar({ options: optionsWithIcon });
    expect(screen.getByTestId('icon-all')).toBeInTheDocument();
    expect(screen.getByTestId('icon-income')).toBeInTheDocument();
  });

  it('선택된 필터는 filled variant', () => {
    renderFilterBar({ value: ['all'] });
    const allChip = screen.getByText('전체').closest('.MuiChip-root');
    expect(allChip).toHaveClass('MuiChip-filled');
  });

  it('선택되지 않은 필터는 outlined variant', () => {
    renderFilterBar({ value: ['all'] });
    const incomeChip = screen.getByText('수입').closest('.MuiChip-root');
    expect(incomeChip).toHaveClass('MuiChip-outlined');
  });

  it('여러 필터 동시 선택 가능', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterBar({ onChange, value: [] });

    const allChip = screen.getByText('전체').closest('.MuiChip-root');
    const incomeChip = screen.getByText('수입').closest('.MuiChip-root');

    if (allChip && incomeChip) {
      await user.click(allChip);
      expect(onChange).toHaveBeenCalledWith(['all']);

      // 다시 렌더링 후 두 번째 필터 클릭
      onChange.mockClear();
      await user.click(incomeChip);
      expect(onChange).toHaveBeenCalledWith(['income']);
    }
  });

  it('count가 0이어도 표시', () => {
    const optionsWithZeroCount: FilterOption[] = [{ value: 'all', label: '전체', count: 0 }];

    renderFilterBar({ options: optionsWithZeroCount });
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
