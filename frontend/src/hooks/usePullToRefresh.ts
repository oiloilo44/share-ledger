import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePullToRefreshOptions {
  /**
   * 새로고침을 트리거하는 함수
   */
  onRefresh: () => Promise<void> | void;

  /**
   * 새로고침을 트리거하는 최소 거리 (px)
   * @default 80
   */
  threshold?: number;

  /**
   * Pull-to-Refresh 비활성화
   * @default false
   */
  disabled?: boolean;

  /**
   * 최대 당김 거리 (px)
   * @default 120
   */
  maxPullDistance?: number;
}

export interface UsePullToRefreshResult {
  /**
   * Pull-to-Refresh 컨테이너에 연결할 ref
   */
  containerRef: React.RefObject<HTMLElement>;

  /**
   * 현재 당김 거리 (px)
   */
  pullDistance: number;

  /**
   * 새로고침 중 여부
   */
  isRefreshing: boolean;

  /**
   * 새로고침 가능 여부 (threshold 이상 당겼는지)
   */
  canRefresh: boolean;
}

/**
 * Pull-to-Refresh 기능을 제공하는 Hook
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { containerRef, pullDistance, isRefreshing, canRefresh } = usePullToRefresh({
 *     onRefresh: async () => {
 *       await refetch();
 *     },
 *   });
 *
 *   return (
 *     <Box ref={containerRef}>
 *       {pullDistance > 0 && (
 *         <Box sx={{ textAlign: 'center', py: 2 }}>
 *           {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
 *         </Box>
 *       )}
 *       {isRefreshing && <LinearProgress />}
 *       <div>Content here</div>
 *     </Box>
 *   );
 * }
 * ```
 */
export const usePullToRefresh = (options: UsePullToRefreshOptions): UsePullToRefreshResult => {
  const { onRefresh, threshold = 80, disabled = false, maxPullDistance = 120 } = options;

  const containerRef = useRef<HTMLElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const initialScrollTop = useRef<number | null>(null);

  const canRefresh = pullDistance >= threshold;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // 스크롤 위치가 맨 위일 때만 활성화
      const scrollTop = container.scrollTop || window.scrollY;
      if (scrollTop > 0) return;

      touchStartY.current = e.touches[0].clientY;
      initialScrollTop.current = scrollTop;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || touchStartY.current === null) return;

      const container = containerRef.current;
      if (!container) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY.current;

      // 아래로 당기는 경우만 처리
      if (deltaY > 0) {
        // 스크롤이 맨 위가 아니면 무시
        const scrollTop = container.scrollTop || window.scrollY;
        if (scrollTop > 0) return;

        // 기본 스크롤 동작 방지
        e.preventDefault();

        // 거리 계산 (저항 효과: 거리가 멀수록 당김이 느려짐)
        const resistance = 2.5;
        const distance = Math.min(deltaY / resistance, maxPullDistance);

        setPullDistance(distance);
      }
    },
    [disabled, isRefreshing, maxPullDistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || touchStartY.current === null) return;

    touchStartY.current = null;
    initialScrollTop.current = null;

    // threshold 이상 당겼으면 새로고침 트리거
    if (pullDistance >= threshold) {
      setIsRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // threshold 미만이면 원래 위치로 복귀
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    // Passive: false로 설정하여 preventDefault 가능하게 함
    const touchMoveOptions: AddEventListenerOptions = { passive: false };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, touchMoveOptions);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    canRefresh,
  };
};
