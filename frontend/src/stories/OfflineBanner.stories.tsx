import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { OfflineBanner } from '../components/OfflineBanner';
import { useOfflineStore } from '../stores/offlineStore';

const DemoContainer = ({
  isOffline,
  pendingEntries,
}: {
  isOffline: boolean;
  pendingEntries: number;
}) => {
  useEffect(() => {
    useOfflineStore.setState({ isOffline, pendingEntries });
    return () => {
      useOfflineStore.setState({ isOffline: false, pendingEntries: 0 });
    };
  }, [isOffline, pendingEntries]);

  return (
    <Box sx={{ maxWidth: 800 }}>
      <OfflineBanner />
    </Box>
  );
};

const meta = {
  title: 'Feedback/OfflineBanner',
  component: DemoContainer,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    isOffline: {
      control: 'boolean',
      description: '오프라인 상태',
    },
    pendingEntries: {
      control: { type: 'number', min: 0, max: 100 },
      description: '대기 중인 내역 개수',
    },
  },
  args: {
    isOffline: true,
    pendingEntries: 0,
  },
} satisfies Meta<typeof DemoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Offline: Story = {
  args: {
    isOffline: true,
    pendingEntries: 0,
  },
};

export const PendingSync: Story = {
  args: {
    isOffline: false,
    pendingEntries: 5,
  },
};

export const OfflineWithPending: Story = {
  args: {
    isOffline: true,
    pendingEntries: 3,
  },
};

export const Hidden: Story = {
  args: {
    isOffline: false,
    pendingEntries: 0,
  },
};
