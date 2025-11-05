import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { ButtonProps } from '@mui/material';

export interface EmptyStateAction extends Omit<ButtonProps, 'children'> {
  label: string;
}

export type EmptyStateTone = 'neutral' | 'informative' | 'uplift';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: EmptyStateAction[];
  tone?: EmptyStateTone;
}

export const EmptyState = ({
  title,
  description,
  icon,
  actions,
  tone = 'neutral',
}: EmptyStateProps) => {
  const theme = useTheme();
  const paletteByTone = {
    neutral: theme.palette.primary,
    informative: theme.palette.info,
    uplift: theme.palette.success,
  } as const;
  const paletteColor = paletteByTone[tone];
  const baseColor = paletteColor.main;
  const backgroundColor = alpha(baseColor, theme.palette.mode === 'light' ? 0.08 : 0.24);

  return (
    <Stack
      spacing={2}
      alignItems="center"
      textAlign="center"
      sx={{
        px: 4,
        py: 6,
        borderRadius: theme.shape.borderRadius * 1.5,
        backgroundColor,
        border: `1px dashed ${alpha(baseColor, 0.28)}`,
      }}
    >
      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: alpha(baseColor, theme.palette.mode === 'light' ? 0.16 : 0.4),
            color: baseColor,
            svg: {
              fontSize: 32,
            },
          }}
        >
          {icon}
        </Box>
      )}
      <Stack spacing={1} alignItems="center">
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {description}
          </Typography>
        )}
      </Stack>
      {actions && actions.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {actions.map((action) => (
            <Button key={action.label} {...action}>
              {action.label}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
};
