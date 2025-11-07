import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite 캐시 디렉토리
  cacheDir: 'node_modules/.vite',
  // 의존성 최적화 (테스트 성능 개선)
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react-router-dom',
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/Button',
      '@mui/material/TextField',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@testing-library/react',
      '@testing-library/user-event',
      '@testing-library/jest-dom',
      'zustand',
      '@tanstack/react-query',
      'date-fns',
    ],
    exclude: ['@storybook/**', '@chromatic-com/**'],
  },
  server: {
    port: 5173,
    fs: {
      strict: false,
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    // 최신 브라우저 타겟 (ES2020+) - polyfill 감소
    target: 'es2020',

    // esbuild minify 사용 (terser보다 10-20배 빠름)
    minify: 'esbuild',

    // CSS 코드 스플리팅 활성화
    cssCodeSplit: true,

    // production에서 소스맵 제거하여 번들 크기 감소
    sourcemap: false,

    // 4kb 미만 에셋은 base64 인라인 (HTTP 요청 감소)
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        manualChunks: {
          // React 관련 라이브러리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // MUI Core (자주 사용)
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],

          // MUI Icons (별도 분리하여 캐싱 최적화)
          'mui-icons': ['@mui/icons-material'],

          // MUI Date Pickers (큰 라이브러리, 일부 페이지만 사용)
          'mui-pickers': ['@mui/x-date-pickers'],

          // 차트 라이브러리 (StatsPage에서만 사용)
          'chart-vendor': ['recharts'],

          // Export 라이브러리 (큰 라이브러리, 필요시에만 로드)
          'export-vendor': ['xlsx', 'papaparse'],

          // 상태 관리 및 데이터 페칭
          'state-vendor': ['zustand', '@tanstack/react-query'],

          // 애니메이션
          'animation-vendor': ['framer-motion', 'react-countup', 'react-swipeable'],

          // 유틸리티
          'util-vendor': ['date-fns', '@supabase/supabase-js'],
        },
      },
    },

    // 청크 크기 경고 임계값 (KB)
    chunkSizeWarningLimit: 1000,

    // modulePreload 폴리필 비활성화 (최신 브라우저는 지원)
    modulePreload: {
      polyfill: false,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    // 테스트 파일 패턴 명시적 지정
    include: ['src/**/*.test.{ts,tsx}'],
    // 불필요한 파일 제외 (성능 최적화)
    exclude: [
      'node_modules/**',
      'dist/**',
      '.storybook/**',
      'src/**/*.stories.{ts,tsx}',
      'src/stories/**/*.{ts,tsx}',
    ],
    // 테스트 격리 유지 (안정성)
    isolate: true,
    // 스레드 풀 최적화
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        'src/stories/**',
        '.storybook/**',
      ],
    },
    // 의존성 최적화
    deps: {
      optimizer: {
        web: {
          exclude: ['@storybook/**', '@chromatic-com/**'],
        },
      },
    },
  },
});
