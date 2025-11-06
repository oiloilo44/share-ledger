import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AmountInput } from '../AmountInput';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderAmountInput = (props: Partial<React.ComponentProps<typeof AmountInput>> = {}) => {
  const defaultProps = {
    value: 0,
    onChange: vi.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <AmountInput {...defaultProps} {...props} />
    </ThemeProvider>,
  );
};

describe('AmountInput', () => {
  it('초기 렌더링 시 0원 표시', () => {
    renderAmountInput();
    expect(screen.getByText(/₩0/)).toBeInTheDocument();
  });

  it('기본 타입은 지출', () => {
    renderAmountInput();
    expect(screen.getByText('지출 금액')).toBeInTheDocument();
  });

  it('value prop을 받으면 해당 금액 표시', () => {
    renderAmountInput({ value: 15000 });
    expect(screen.getByText(/₩15,000/)).toBeInTheDocument();
  });

  it('수입 타입일 때 + 기호 표시', () => {
    renderAmountInput({ type: 'income' });
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('수입 금액')).toBeInTheDocument();
  });

  it('지출 타입일 때 - 기호 표시', () => {
    renderAmountInput({ type: 'expense' });
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('지출 금액')).toBeInTheDocument();
  });

  it('숫자 버튼 클릭 시 onChange 호출', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange });

    const button = screen.getByLabelText('1 입력');
    await user.click(button);

    expect(onChange).toHaveBeenCalledWith(1, 'expense');
  });

  it('여러 숫자 버튼 클릭하여 금액 입력', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 0 });

    await user.click(screen.getByLabelText('1 입력'));
    expect(onChange).toHaveBeenCalledWith(1, 'expense');
  });

  it('백스페이스 버튼 클릭 시 마지막 자리 삭제', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 123 });

    const backspaceButton = screen.getByLabelText('마지막 숫자 지우기');
    await user.click(backspaceButton);
    expect(onChange).toHaveBeenCalledWith(12, 'expense');
  });

  it('C 버튼 클릭 시 0으로 초기화', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 12345 });

    const clearButton = screen.getByLabelText('금액 초기화');
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith(0, 'expense');
  });

  it('타입 토글 버튼 클릭 시 수입/지출 전환', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 10000, type: 'expense' });

    const incomeButton = screen.getByText(/수입/);
    await user.click(incomeButton);

    expect(onChange).toHaveBeenCalledWith(10000, 'income');
  });

  it('maxAmount 제한을 초과하면 onChange 호출 안 함', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 999, maxAmount: 1000 });

    // 현재 999에서 9를 추가하면 9999가 되어 maxAmount 초과
    await user.click(screen.getByLabelText('9 입력'));

    // maxAmount를 초과하면 onChange가 호출되지 않아야 함
    expect(onChange).not.toHaveBeenCalled();
  });

  it('00 버튼 클릭하면 00 추가', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 5 });

    await user.click(screen.getByLabelText('00 입력'));
    expect(onChange).toHaveBeenCalledWith(500, 'expense');
  });

  it('000 버튼 클릭하면 000 추가', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 1 });

    await user.click(screen.getByLabelText('000 입력'));
    expect(onChange).toHaveBeenCalledWith(1000, 'expense');
  });
});
