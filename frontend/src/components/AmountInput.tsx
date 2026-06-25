import { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, TextField, useTheme, alpha } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

export interface AmountInputProps {
  value: number;
  type?: 'income' | 'expense';
  onChange: (value: number, type: 'income' | 'expense') => void;
  onSubmit?: () => void;
  maxAmount?: number;
  minAmount?: number;
}

export const AmountInput = ({
  value = 0,
  type: initialType = 'expense',
  onChange,
  onSubmit: _onSubmit,
  maxAmount = 999999999,
  minAmount: _minAmount = 0,
}: AmountInputProps) => {
  const theme = useTheme();
  const [type, setType] = useState<'income' | 'expense'>(initialType);

  const handleTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: 'income' | 'expense' | null,
  ) => {
    if (newType !== null) {
      setType(newType);
      onChange(value, newType);
    }
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value.replace(/[^0-9]/g, '');
    const newValue = inputValue === '' ? 0 : parseInt(inputValue, 10);

    if (newValue <= maxAmount) {
      onChange(newValue, type);
    }
  };

  const isIncomeType = type === 'income';

  return (
    <Box sx={{ width: '100%' }}>
      {/* Type Toggle */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={handleTypeChange}
          aria-label="수입 또는 지출 선택"
          sx={{
            '& .MuiToggleButton-root': {
              px: 4,
              py: 1.5,
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              borderRadius: theme.shape.borderRadius * 3,
              '&.Mui-selected': {
                color: theme.palette.common.white,
                '&:hover': {
                  opacity: 0.9,
                },
              },
              '&:not(.Mui-selected)': {
                color: theme.palette.text.secondary,
                backgroundColor: alpha(theme.palette.divider, 0.08),
              },
            },
          }}
        >
          <ToggleButton
            value="income"
            aria-label="수입"
            sx={{ '&.Mui-selected': { backgroundColor: theme.palette.success.main } }}
          >
            <AddIcon sx={{ mr: 0.5 }} aria-hidden="true" />
            수입
          </ToggleButton>
          <ToggleButton
            value="expense"
            aria-label="지출"
            sx={{ '&.Mui-selected': { backgroundColor: theme.palette.error.main } }}
          >
            <RemoveIcon sx={{ mr: 0.5 }} aria-hidden="true" />
            지출
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Amount Input */}
      <TextField
        label={isIncomeType ? '수입 금액' : '지출 금액'}
        type="number"
        value={value || ''}
        onChange={handleAmountChange}
        placeholder="0"
        fullWidth
        autoFocus
        required
        inputProps={{
          min: 0,
          max: maxAmount,
          inputMode: 'numeric',
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: alpha(
                isIncomeType ? theme.palette.success.main : theme.palette.error.main,
                0.3,
              ),
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: alpha(
                isIncomeType ? theme.palette.success.main : theme.palette.error.main,
                0.5,
              ),
            },
            '&.Mui-focused fieldset': {
              borderColor: isIncomeType ? theme.palette.success.main : theme.palette.error.main,
            },
          },
          '& input': {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: isIncomeType ? theme.palette.success.main : theme.palette.error.main,
            textAlign: 'left',
            // 숫자 입력의 스핀 버튼(스크롤바) 제거
            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '&[type=number]': {
              MozAppearance: 'textfield',
            },
          },
        }}
      />
    </Box>
  );
};
