import { Box, CircularProgress, Typography } from '@mui/material';
import { ArrowDownward, Refresh } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export interface PullToRefreshIndicatorProps {
  /**
   * 당김 거리 (px)
   */
  pullDistance: number;

  /**
   * 새로고침 가능 여부
   */
  canRefresh: boolean;

  /**
   * 새로고침 중 여부
   */
  isRefreshing: boolean;

  /**
   * 새로고침 트리거 임계값 (px)
   */
  threshold?: number;
}

/**
 * Pull-to-Refresh 시각적 피드백 컴포넌트
 */
export const PullToRefreshIndicator = ({
  pullDistance,
  canRefresh,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const isVisible = pullDistance > 0 || isRefreshing;

  // 당김 진행률 (0 ~ 1)
  const progress = Math.min(pullDistance / threshold, 1);

  // 아이콘 회전 각도
  const rotation = progress * 180;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 2,
              gap: 1,
            }}
          >
            {isRefreshing ? (
              // 새로고침 중
              <>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                  새로고침 중...
                </Typography>
              </>
            ) : (
              // 당기는 중
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                >
                  {canRefresh ? (
                    <Refresh color="primary" />
                  ) : (
                    <ArrowDownward color="action" sx={{ opacity: progress }} />
                  )}
                </Box>
                <Typography variant="body2" color={canRefresh ? 'primary' : 'text.secondary'}>
                  {canRefresh ? '놓아서 새로고침' : '당겨서 새로고침'}
                </Typography>
              </>
            )}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
