import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from '../components/ConfirmDialog';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    title: '정말로 이 작업을 진행할까요?',
    description:
      '이 작업은 되돌릴 수 없습니다.\n공유된 가계부에서도 내역이 제거되며 히스토리에서만 복원할 수 있습니다.',
    confirmText: '진행',
    cancelText: '취소',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
  argTypes: {
    open: {
      control: { type: 'boolean' },
      description: '다이얼로그 표시 여부',
    },
    variant: {
      control: 'select',
      options: ['info', 'warning', 'danger', 'success'],
      description: '아이콘 및 강조색을 결정하는 변형',
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Warning: Story = {
  args: {
    variant: 'warning',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    confirmText: '삭제',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: '권한 변경 안내',
    description: '편집자 권한으로 변경되며, 다시 요청하려면 관리자의 승인이 필요합니다.',
    confirmText: '확인했어요',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: '내역이 복원되었습니다',
    description: '복원된 내역은 오늘 날짜 기준으로 다시 정렬됩니다.',
    confirmText: '좋아요',
  },
};
