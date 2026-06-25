import { Fragment } from 'react';
import { Box, Grid, Skeleton, Stack, useTheme } from '@mui/material';

export type SkeletonVariant = 'card-grid' | 'list' | 'detail';

export interface ContentSkeletonProps {
  variant?: SkeletonVariant;
  items?: number;
  withToolbar?: boolean;
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

export const ContentSkeleton = ({
  variant = 'card-grid',
  items = 3,
  withToolbar = false,
}: ContentSkeletonProps) => {
  const theme = useTheme();

  const skeletonStyles = {
    animation: 'wave',
    '& .MuiSkeleton-root': {
      transform: 'none',
    },
  };

  const toolbar = withToolbar ? (
    <Stack
      direction="row"
      spacing={2}
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 3 }}
    >
      <Skeleton variant="text" width={180} height={32} animation="wave" />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={96} height={36} animation="wave" />
        <Skeleton variant="circular" width={40} height={40} animation="wave" />
      </Stack>
    </Stack>
  ) : null;

  if (variant === 'list') {
    return (
      <Box sx={skeletonStyles}>
        <style>{shimmerKeyframes}</style>
        {toolbar}
        <Stack spacing={2}>
          {Array.from({ length: items }).map((_, index) => (
            <Stack
              key={`list-skeleton-${index}`}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                p: 2,
                borderRadius: theme.shape.borderRadius * 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[1],
              }}
            >
              <Skeleton variant="circular" width={48} height={48} animation="wave" />
              <Box flexGrow={1}>
                <Skeleton variant="text" width="60%" height={28} animation="wave" />
                <Skeleton variant="text" width="40%" height={24} animation="wave" />
              </Box>
              <Skeleton variant="rounded" width={80} height={32} animation="wave" />
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Box sx={skeletonStyles}>
        <style>{shimmerKeyframes}</style>
        {toolbar}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {Array.from({ length: items }).map((_, index) => (
                <Fragment key={`detail-skeleton-${index}`}>
                  <Skeleton variant="text" width="50%" height={28} animation="wave" />
                  <Skeleton variant="rounded" height={120} animation="wave" />
                </Fragment>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={240} animation="wave" />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={skeletonStyles}>
      <style>{shimmerKeyframes}</style>
      {toolbar}
      <Grid container spacing={2}>
        {Array.from({ length: items }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={`card-skeleton-${index}`}>
            <Stack
              spacing={1.5}
              sx={{
                p: 2,
                borderRadius: theme.shape.borderRadius * 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[1],
              }}
            >
              <Skeleton variant="rounded" height={120} animation="wave" />
              <Skeleton variant="text" width="70%" height={28} animation="wave" />
              <Skeleton variant="text" width="50%" height={24} animation="wave" />
              <Stack direction="row" spacing={1}>
                <Skeleton variant="rounded" width={64} height={28} animation="wave" />
                <Skeleton variant="rounded" width={64} height={28} animation="wave" />
              </Stack>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
