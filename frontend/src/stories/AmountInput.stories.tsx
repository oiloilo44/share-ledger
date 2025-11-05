import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Typography, Box } from '@mui/material';
import { AmountInput } from '../components/AmountInput';

const DemoContainer = ({
  initialValue = 0,
  initialType = 'expense',
  maxAmount,
}: {
  initialValue?: number;
  initialType?: 'income' | 'expense';
  maxAmount?: number;
}) => {
  const [value, setValue] = useState(initialValue);
  const [type, setType] = useState<'income' | 'expense'>(initialType);

  const handleChange = (newValue: number, newType: 'income' | 'expense') => {
    setValue(newValue);
    setType(newType);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 480, mx: 'auto' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          현재 값: {type === 'income' ? '+' : '-'}₩{value.toLocaleString('ko-KR')}
        </Typography>
      </Box>
      <AmountInput value={value} type={type} onChange={handleChange} maxAmount={maxAmount} />
    </Stack>
  );
};

const meta = {
  title: 'Input/AmountInput',
  component: DemoContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    initialValue: {
      control: { type: 'number', min: 0, max: 1000000 },
      description: '초기 금액',
    },
    initialType: {
      control: 'select',
      options: ['income', 'expense'],
      description: '초기 타입 (수입/지출)',
    },
    maxAmount: {
      control: { type: 'number', min: 0, max: 999999999 },
      description: '최대 금액 제한',
    },
  },
  args: {
    initialValue: 0,
    initialType: 'expense',
    maxAmount: 999999999,
  },
} satisfies Meta<typeof DemoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Expense: Story = {
  args: {
    initialValue: 15000,
    initialType: 'expense',
  },
};

export const Income: Story = {
  args: {
    initialValue: 3000000,
    initialType: 'income',
  },
};

export const WithMaxLimit: Story = {
  args: {
    initialValue: 90000,
    initialType: 'expense',
    maxAmount: 100000,
  },
};
