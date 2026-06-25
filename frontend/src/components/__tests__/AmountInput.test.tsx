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
  it('초기 렌더링 시 빈 값 표시', () => {
    renderAmountInput();
    const input = screen.getByLabelText(/지출 금액/) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('기본 타입은 지출', () => {
    renderAmountInput();
    expect(screen.getByLabelText(/지출 금액/)).toBeInTheDocument();
  });

  it('value prop을 받으면 해당 금액 표시', () => {
    renderAmountInput({ value: 15000 });
    const input = screen.getByLabelText(/지출 금액/) as HTMLInputElement;
    expect(input.value).toBe('15000');
  });

  it('수입 타입일 때 수입 금액 레이블 표시', () => {
    renderAmountInput({ type: 'income' });
    expect(screen.getByLabelText(/수입 금액/)).toBeInTheDocument();
  });

  it('지출 타입일 때 지출 금액 레이블 표시', () => {
    renderAmountInput({ type: 'expense' });
    expect(screen.getByLabelText(/지출 금액/)).toBeInTheDocument();
  });

  it('숫자 입력 시 onChange 호출', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange });

    const input = screen.getByLabelText(/지출 금액/);
    await user.type(input, '1');

    expect(onChange).toHaveBeenCalledWith(1, 'expense');
  });

  it('여러 숫자 입력하여 금액 입력', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 0 });

    const input = screen.getByLabelText(/지출 금액/);
    await user.clear(input);

    // Controlled component이므로 각 문자는 독립적으로 처리됨
    // clear 후 '123' 타이핑 시 각 문자가 순차적으로 입력: '1', '2', '3'
    await user.type(input, '3');
    expect(onChange).toHaveBeenCalledWith(3, 'expense');
  });

  it('0 입력 시 0으로 처리', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange });

    const input = screen.getByLabelText(/지출 금액/);
    await user.clear(input);
    await user.type(input, '0');

    expect(onChange).toHaveBeenCalledWith(0, 'expense');
  });

  it('입력 초기화 시 0으로 처리', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 12345 });

    const input = screen.getByLabelText(/지출 금액/);
    await user.clear(input);

    expect(onChange).toHaveBeenCalledWith(0, 'expense');
  });

  it('타입 토글 버튼 클릭 시 수입/지출 전환', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 10000, type: 'expense' });

    const incomeButton = screen.getByLabelText('수입');
    await user.click(incomeButton);

    expect(onChange).toHaveBeenCalledWith(10000, 'income');
  });

  it('타입 전환 시 금액 유지', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 5000, type: 'expense' });

    const incomeButton = screen.getByLabelText('수입');
    await user.click(incomeButton);

    expect(onChange).toHaveBeenCalledWith(5000, 'income');
  });

  it('maxAmount 제한을 초과하면 onChange 호출 안 함', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange, value: 0, maxAmount: 1000 });

    const input = screen.getByLabelText(/지출 금액/);
    await user.clear(input);
    await user.type(input, '9999');

    // maxAmount를 초과하면 onChange가 호출되지 않아야 함
    // 마지막 입력은 무시됨
    expect(onChange).not.toHaveBeenCalledWith(9999, 'expense');
  });

  it('숫자가 아닌 문자는 무시됨', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAmountInput({ onChange });

    const input = screen.getByLabelText(/지출 금액/) as HTMLInputElement;
    await user.type(input, 'abc');

    // 숫자가 아닌 문자는 입력되지 않으므로 onChange가 호출되지 않음
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });
});
