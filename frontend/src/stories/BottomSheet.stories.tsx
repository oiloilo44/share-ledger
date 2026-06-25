import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { BottomSheet } from '../components/BottomSheet';

const DemoContainer = ({
  title,
  maxWidth,
  fullScreen,
  hideCloseButton,
  disableBackdropClick,
  showForm = false,
}: {
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  hideCloseButton?: boolean;
  disableBackdropClick?: boolean;
  showForm?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="contained" onClick={() => setOpen(true)}>
        BottomSheet 열기
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth={maxWidth}
        fullScreen={fullScreen}
        hideCloseButton={hideCloseButton}
        disableBackdropClick={disableBackdropClick}
      >
        {showForm ? (
          <Stack spacing={3}>
            <TextField label="제목" fullWidth />
            <TextField label="카테고리" fullWidth />
            <TextField label="메모" fullWidth multiline rows={3} />
            <Button variant="contained" fullWidth size="large">
              저장
            </Button>
          </Stack>
        ) : (
          <Typography>
            BottomSheet 컴포넌트는 모바일에서 아래에서 위로 슬라이드되는 다이얼로그입니다.
            드래그하여 닫을 수 있으며, 백드롭을 클릭하여 닫을 수도 있습니다.
          </Typography>
        )}
      </BottomSheet>
    </div>
  );
};

const meta = {
  title: 'Layout/BottomSheet',
  component: DemoContainer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: '타이틀',
    },
    maxWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: '최대 너비',
    },
    fullScreen: {
      control: 'boolean',
      description: '전체 화면 모드',
    },
    hideCloseButton: {
      control: 'boolean',
      description: '닫기 버튼 숨김',
    },
    disableBackdropClick: {
      control: 'boolean',
      description: '백드롭 클릭 비활성화',
    },
    showForm: {
      control: 'boolean',
      description: '폼 예시 표시',
    },
  },
  args: {
    title: '새 내역 추가',
    maxWidth: 'sm',
    fullScreen: false,
    hideCloseButton: false,
    disableBackdropClick: false,
    showForm: false,
  },
} satisfies Meta<typeof DemoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithForm: Story = {
  args: {
    showForm: true,
  },
};

export const NoTitle: Story = {
  args: {
    title: undefined,
    showForm: true,
  },
};

export const FullScreen: Story = {
  args: {
    fullScreen: true,
    showForm: true,
  },
};

export const LargeWidth: Story = {
  args: {
    maxWidth: 'lg',
    showForm: true,
  },
};
