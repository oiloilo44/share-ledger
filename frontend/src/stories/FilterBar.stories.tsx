import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShieldMoonRoundedIcon from '@mui/icons-material/ShieldMoonRounded';
import { FilterBar, type FilterBarProps } from '../components/FilterBar';

const FilterBarPreview = (props: FilterBarProps) => {
  const [value, setValue] = useState<string[]>(props.value);
  return <FilterBar {...props} value={value} onChange={setValue} />;
};

const meta = {
  title: 'Filters/FilterBar',
  component: FilterBarPreview,
  parameters: {
    layout: 'centered',
  },
  args: {
    label: '상태',
    allowEmpty: false,
    value: ['all'],
    dense: false,
    options: [
      { value: 'all', label: '전체', count: 12, icon: <HistoryRoundedIcon fontSize="small" /> },
      { value: 'active', label: '진행중', count: 6, icon: <TaskAltRoundedIcon fontSize="small" /> },
      {
        value: 'pending',
        label: '대기',
        count: 4,
        icon: <ShieldMoonRoundedIcon fontSize="small" />,
      },
      { value: 'owner', label: '소유자', count: 2, icon: <PersonRoundedIcon fontSize="small" /> },
    ],
  },
} satisfies Meta<typeof FilterBarPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
