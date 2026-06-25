import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack } from '@mui/material';
import { ToastNotification } from '../components/ToastNotification';
import { useToastStore } from '../stores/toastStore';
import type { ToastShowOptions } from '../stores/toastStore';

const DemoContainer = ({
  message,
  options,
}: {
  message: string;
  options: ToastShowOptions & { severity: NonNullable<ToastShowOptions['severity']> };
}) => {
  const showToast = useToastStore((state) => state.showToast);
  const hideToast = useToastStore((state) => state.hideToast);

  useEffect(() => {
    showToast(message, options);
    return () => hideToast();
  }, [hideToast, message, options, showToast]);

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Button variant="contained" onClick={() => showToast(message, options)}>
        토스트 다시 보기
      </Button>
      <ToastNotification />
    </Stack>
  );
};

const meta = {
  title: 'Feedback/ToastNotification',
  component: DemoContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    message: {
      control: 'text',
      description: '표시할 본문 메시지',
    },
    options: {
      control: 'object',
    },
  },
  args: {
    message: '가계부가 성공적으로 동기화되었습니다.',
    options: {
      severity: 'success',
      title: '동기화 완료',
      duration: 5000,
    },
  },
} satisfies Meta<typeof DemoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Warning: Story = {
  args: {
    message: '멤버 초대가 아직 완료되지 않았습니다.\n다시 보내시겠어요?',
    options: {
      severity: 'warning',
      title: '확인이 필요합니다',
      duration: 6000,
    },
  },
};

export const Error: Story = {
  args: {
    message: '가계부를 저장하지 못했습니다.\n잠시 후 다시 시도해주세요.',
    options: {
      severity: 'error',
      title: '저장 실패',
    },
  },
};

export const Info: Story = {
  args: {
    message: '구성원이 새 내역을 추가했습니다.',
    options: {
      severity: 'info',
      title: '새 내역 도착',
    },
  },
};
