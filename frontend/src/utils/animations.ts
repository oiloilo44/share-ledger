/**
 * 공통 애니메이션 설정
 * 모든 페이지에서 일관된 애니메이션을 사용하기 위한 유틸리티
 */

import type { Variants } from 'framer-motion';

/**
 * 애니메이션 타이밍 설정
 */
export const animationConfig = {
  /** 애니메이션 시작 전 딜레이 (ms) */
  delayChildren: 0.1,
  /** 각 자식 요소 사이의 간격 (ms) */
  staggerChildren: 0.1,
  /** 각 아이템의 애니메이션 지속 시간 (초) */
  duration: 0.5,
  /** 애니메이션 이징 함수 */
  ease: [0.4, 0, 0.2, 1] as const,
  /** 페이드 인 시 이동 거리 (px) */
  moveDistance: 20,
};

/**
 * 컨테이너 애니메이션 variants
 * 자식 요소들의 staggered 애니메이션을 위한 설정
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animationConfig.staggerChildren,
      delayChildren: animationConfig.delayChildren,
    },
  },
};

/**
 * 아이템 애니메이션 variants
 * 개별 카드/아이템의 페이드 인 애니메이션
 */
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: animationConfig.moveDistance,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration,
      ease: animationConfig.ease,
    },
  },
};

/**
 * 차트 등 두 번째 섹션을 위한 지연된 컨테이너 variants
 */
export const delayedContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animationConfig.staggerChildren,
      delayChildren: animationConfig.delayChildren * 2,
    },
  },
};
