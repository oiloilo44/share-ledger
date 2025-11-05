import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, Typography } from '@mui/material';
import { ErrorBoundary } from '../components/ErrorBoundary';

// 에러를 발생시키는 테스트 컴포넌트
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('테스트 에러: 컴포넌트 렌더링 중 예외가 발생했습니다.');
  }
  return (
    <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
      ✅ 정상적으로 렌더링되었습니다. 아래 버튼을 클릭하여 에러를 발생시켜보세요.
    </Typography>
  );
};

const DemoContainer = ({ showCustomFallback = false }: { showCustomFallback?: boolean }) => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [key, setKey] = useState(0);

  const handleThrowError = () => {
    setShouldThrow(true);
  };

  const handleReset = () => {
    setShouldThrow(false);
    setKey((prev) => prev + 1); // ErrorBoundary를 리마운트
  };

  const customFallback = showCustomFallback
    ? (error: Error, resetError: () => void) => (
        <Stack spacing={3} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4">🔧 커스텀 에러 화면</Typography>
          <Typography variant="body1" color="text.secondary">
            {error.message}
          </Typography>
          <Button variant="contained" onClick={resetError}>
            복구하기
          </Button>
        </Stack>
      )
    : undefined;

  return (
    <Stack spacing={2} sx={{ minWidth: 400 }}>
      <ErrorBoundary key={key} fallback={customFallback}>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
      {!shouldThrow && (
        <Button variant="outlined" color="error" onClick={handleThrowError}>
          에러 발생시키기
        </Button>
      )}
      {shouldThrow && (
        <Button variant="outlined" onClick={handleReset}>
          에러 초기화 (리마운트)
        </Button>
      )}
    </Stack>
  );
};

const meta = {
  title: 'Feedback/ErrorBoundary',
  component: DemoContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    showCustomFallback: {
      control: 'boolean',
      description: '커스텀 에러 화면 표시',
    },
  },
  args: {
    showCustomFallback: false,
  },
} satisfies Meta<typeof DemoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomFallback: Story = {
  args: {
    showCustomFallback: true,
  },
};
