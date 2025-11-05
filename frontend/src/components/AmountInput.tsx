import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Backspace as BackspaceIcon,
} from '@mui/icons-material';

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
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    setDisplayValue(value.toLocaleString('ko-KR'));
  }, [value]);

  const handleTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: 'income' | 'expense' | null,
  ) => {
    if (newType !== null) {
      setType(newType);
      onChange(value, newType);
    }
  };

  const handleNumberClick = (num: string) => {
    const currentNumber = value.toString();
    const newNumber = currentNumber === '0' ? num : currentNumber + num;
    const newValue = parseInt(newNumber, 10);

    if (newValue <= maxAmount) {
      onChange(newValue, type);
    }
  };

  const handleBackspace = () => {
    const currentNumber = value.toString();
    const newNumber = currentNumber.length > 1 ? currentNumber.slice(0, -1) : '0';
    const newValue = parseInt(newNumber, 10);
    onChange(newValue, type);
  };

  const handleClear = () => {
    onChange(0, type);
  };

  const isIncomeType = type === 'income';
  const typeColor = isIncomeType ? theme.palette.success.main : theme.palette.error.main;

  const numberButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '000'];

  return (
    <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
      {/* Type Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
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

      {/* Amount Display */}
      <Paper
        elevation={0}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          p: 4,
          mb: 3,
          backgroundColor: alpha(typeColor, 0.08),
          borderRadius: theme.shape.borderRadius * 2,
          textAlign: 'center',
          minHeight: 120,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 600,
            mb: 1,
          }}
          id="amount-label"
        >
          {isIncomeType ? '수입 금액' : '지출 금액'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            component="span"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: typeColor,
              mr: 0.5,
            }}
            aria-hidden="true"
          >
            {isIncomeType ? '+' : '-'}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem' },
              fontWeight: 800,
              color: typeColor,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ₩{displayValue}
          </Typography>
        </Box>
      </Paper>

      {/* Number Pad */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
        }}
        role="group"
        aria-label="숫자 키패드"
      >
        {numberButtons.map((num) => (
          <Box
            key={num}
            component="button"
            onClick={() => handleNumberClick(num)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNumberClick(num);
              }
            }}
            aria-label={`${num} 입력`}
            sx={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: theme.palette.background.paper,
              borderRadius: theme.shape.borderRadius * 2,
              border: 'none',
              transition: `all ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeOut}`,
              userSelect: 'none',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                transform: 'scale(0.98)',
              },
              '&:active': {
                transform: 'scale(0.95)',
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: theme.palette.text.primary,
                fontVariantNumeric: 'tabular-nums',
                pointerEvents: 'none',
              }}
            >
              {num}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
        <IconButton
          onClick={handleClear}
          aria-label="금액 초기화"
          sx={{
            flex: 1,
            aspectRatio: '3/1',
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius * 2,
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }} aria-hidden="true">
            C
          </Typography>
        </IconButton>
        <IconButton
          onClick={handleBackspace}
          aria-label="마지막 숫자 지우기"
          sx={{
            flex: 1,
            aspectRatio: '3/1',
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius * 2,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <BackspaceIcon aria-hidden="true" />
        </IconButton>
      </Box>
    </Box>
  );
};
