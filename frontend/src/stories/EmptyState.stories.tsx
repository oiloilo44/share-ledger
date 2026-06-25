import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  InboxOutlined as InboxIcon,
  SearchOff as SearchOffIcon,
  CloudOff as CloudOffIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { EmptyState } from '../components/EmptyState';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: {
      control: 'text',
      description: '제목',
    },
    description: {
      control: 'text',
      description: '설명',
    },
    tone: {
      control: 'select',
      options: ['neutral', 'informative', 'uplift'],
      description: '톤 (색상 테마)',
    },
  },
  args: {
    title: '내역이 없습니다',
    description: '새 내역을 추가하여 가계부를 시작해보세요.',
    tone: 'neutral',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: {
    icon: <InboxIcon />,
    tone: 'neutral',
  },
};

export const Informative: Story = {
  args: {
    title: '검색 결과가 없습니다',
    description: '다른 키워드로 검색하거나 필터를 조정해보세요.',
    icon: <SearchOffIcon />,
    tone: 'informative',
  },
};

export const Uplift: Story = {
  args: {
    title: '모두 완료했어요!',
    description: '처리할 알림이 없습니다. 편안한 하루 되세요.',
    icon: <CheckIcon />,
    tone: 'uplift',
  },
};

export const WithActions: Story = {
  args: {
    title: '오프라인 상태입니다',
    description: '인터넷 연결을 확인하고 다시 시도해주세요.',
    icon: <CloudOffIcon />,
    tone: 'informative',
    actions: [
      {
        label: '새로고침',
        variant: 'contained',
        onClick: () => window.location.reload(),
      },
      {
        label: '설정 열기',
        variant: 'outlined',
        onClick: () => alert('설정 페이지로 이동'),
      },
    ],
  },
};

export const NoIcon: Story = {
  args: {
    title: '빈 가계부',
    description: '첫 내역을 추가하여 가계부를 시작하세요.',
    tone: 'neutral',
    actions: [
      {
        label: '내역 추가',
        variant: 'contained',
        onClick: () => alert('내역 추가 모달 열기'),
      },
    ],
  },
};
