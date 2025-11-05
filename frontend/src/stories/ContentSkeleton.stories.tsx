import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContentSkeleton } from '../components/ContentSkeleton';

const meta = {
  title: 'Feedback/ContentSkeleton',
  component: ContentSkeleton,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['card-grid', 'list', 'detail'],
      description: 'Skeleton 레이아웃 변형',
    },
    items: {
      control: { type: 'number', min: 1, max: 12 },
      description: '표시할 Skeleton 아이템 개수',
    },
    withToolbar: {
      control: 'boolean',
      description: '툴바 Skeleton 표시 여부',
    },
  },
  args: {
    variant: 'card-grid',
    items: 3,
    withToolbar: false,
  },
} satisfies Meta<typeof ContentSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardGrid: Story = {
  args: {
    variant: 'card-grid',
    items: 6,
  },
};

export const List: Story = {
  args: {
    variant: 'list',
    items: 5,
  },
};

export const Detail: Story = {
  args: {
    variant: 'detail',
    items: 3,
  },
};

export const WithToolbar: Story = {
  args: {
    variant: 'list',
    items: 4,
    withToolbar: true,
  },
};
