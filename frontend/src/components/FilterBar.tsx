import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface FilterBarProps {
  options: FilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
  allowEmpty?: boolean;
  label?: string;
  dense?: boolean;
}

export const FilterBar = ({
  options,
  value,
  onChange,
  allowEmpty = true,
  label,
  dense = false,
}: FilterBarProps) => {
  const handleToggle = (optionValue: string) => {
    const isSelected = value.includes(optionValue);
    if (isSelected) {
      const nextValue = value.filter((item) => item !== optionValue);
      onChange(nextValue.length === 0 && !allowEmpty ? [optionValue] : nextValue);
      return;
    }
    onChange([...value, optionValue]);
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={dense ? 1 : 2}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      {label && (
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
      )}
      <Stack direction="row" spacing={dense ? 1 : 1.5} flexWrap="wrap" useFlexGap>
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <Chip
              key={option.value}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {option.icon}
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                  {typeof option.count === 'number' && (
                    <Typography variant="caption" component="span">
                      {option.count}
                    </Typography>
                  )}
                </Stack>
              }
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => handleToggle(option.value)}
              sx={{
                borderRadius: 999,
                fontWeight: 600,
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};
