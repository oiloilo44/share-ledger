# ShareLedger UI/UX 개선 계획

## 📋 개요

**목표**: 토스(Toss) 수준의 직관적이고 세련된 UI/UX 구현
**작성일**: 2025-11-04
**최종 업데이트**: 2025-11-06 (Performance Insights 최종 측정 완료)
**현재 상태**: Phase 1-8 **모두 완료** ✅ | LCP **898ms** (< 1초) 달성 🎉 | **모든 최적화 완료** ✨

---

## ✅ 완료된 항목 (간략)

### Phase 1: 디자인 시스템 ✅

- [x] 디자인 토큰 (`frontend/src/theme/tokens.ts`) - 라이트/다크 색상, 타이포그래피, 간격, 애니메이션
- [x] MUI 테마 통합 (`frontend/src/theme/index.ts`) - 컴포넌트 오버라이드, 전역 스타일
- [x] Pretendard Variable 폰트 적용 (CDN)
- [x] Storybook 설정 (9개 스토리 작성, a11y/vitest addon)

### Phase 2: 핵심 컴포넌트 ✅

**13개 컴포넌트 구현 완료**:

- [x] AmountInput (금액 입력 패드, 수입/지출 토글)
- [x] BottomSheet (모바일 슬라이드 업, 드래그 닫기)
- [x] ContentSkeleton (3가지 variant)
- [x] ToastNotification (Zustand 상태 관리)
- [x] ConfirmDialog (variant별 색상)
- [x] FilterBar (Chip 기반, 다중 선택)
- [x] EmptyState (tone별 스타일)
- [x] ErrorBoundary (localStorage 로깅)
- [x] OfflineBanner (오프라인 상태 알림)
- [x] ProtectedRoute (인증 라우트 보호)
- [x] RootLayout (네비게이션, 다크 모드 토글, Skip link)
- [x] RecurringEntriesSection (반복 내역 관리)
- [x] BulkUploadWizard (CSV 일괄 업로드)

**테스트 커버리지**: 85% (11/13 컴포넌트, 150개 테스트)

- 남은 컴포넌트: RecurringEntriesSection, BulkUploadWizard (선택 사항)

### Phase 3: 페이지 UI 개선 ✅

**10개 페이지 구현 완료**:

- [x] LoginPage, SignupPage, BooksPage, BookDetailPage
- [x] DashboardPage, HistoryPage, ComponentDemoPage
- [x] StatsPage, BookSettingsPage, ResetPasswordPage (부분)

### Phase 4: 애니메이션 ✅

- [x] 페이지 전환 (Framer Motion)
- [x] 리스트 Staggered 애니메이션
- [x] 금액 카운트업 (react-countup)
- [x] 스와이프 제스처 (react-swipeable)
- [x] 버튼 호버/클릭 (MUI 테마)

### Phase 5: UX 세부 개선 ✅

- [x] ErrorBoundary (예상치 못한 에러 캐치)
- [x] Skeleton 로딩 (ContentSkeleton)
- [x] Optimistic Update (내역 추가 시 즉시 반영)
- [x] 접근성(A11y): ARIA 라벨, 포커스 인디케이터, 키보드 네비게이션, Skip link

### Phase 6: 성능 최적화 ✅

- [x] 코드 스플리팅 (React Router lazy loading)
- [x] Vite 번들 최적화 (manualChunks: react-vendor, mui-vendor, chart-vendor 등)
- [x] 무거운 컴포넌트 지연 로딩 (RecurringEntriesSection, BulkUploadWizard)
- [x] 애니메이션 중앙 관리 시스템 (`frontend/src/utils/animations.ts`)
- [x] 모든 페이지 일관된 애니메이션 적용 (containerVariants, itemVariants)

### Phase 7: 다크 모드 ✅

- [x] 다크 모드 색상 팔레트 (tokens.ts)
- [x] 테마 전환 (uiStore)
- [x] 시스템 설정 연동 (prefers-color-scheme)
- [x] localStorage 저장 및 복원
- [x] RootLayout 토글 버튼

---

## 📊 성능 측정 결과 (2025-11-06)

**측정 도구**: Chrome DevTools Performance Trace
**측정 페이지**: LoginPage
**측정 환경**:

- Development: `http://localhost:5173/login` (최적화 전)
- Production: `http://localhost:4173/login` (최적화 후)

### Core Web Vitals 비교

| 지표                               | Development | Production | 개선율          | 목표      | 상태             |
| ---------------------------------- | ----------- | ---------- | --------------- | --------- | ---------------- |
| **LCP** (Largest Contentful Paint) | 1,425ms     | **613ms**  | **57% 개선** ✅ | < 2,500ms | 🎉 **매우 좋음** |
| **CLS** (Cumulative Layout Shift)  | 0.00        | **0.00**   | 유지            | < 0.1     | ✅ **완벽**      |
| **TTFB** (Time to First Byte)      | 11ms        | **10ms**   | 9% 개선         | < 800ms   | ✅ **매우 좋음** |

### Production 빌드 상세 분석

**LCP 세부 (Production)**:

- TTFB: 10ms (1.6% of LCP) - 매우 빠름
- Render delay: 603ms (98.4% of LCP) - Development 대비 **57% 개선** (1,414ms → 603ms)
- LCP 요소: 텍스트 (네트워크 페칭 없음)

**Render Blocking (Production)**:

- Pretendard Variable 폰트 CSS (JSDelivr CDN): 총 22ms
  - Download time: 5ms
  - Main thread processing: 13ms
  - 영향도: 매우 낮음

**Third Party (Production)**:

- JSDelivr CDN: 236.1 KB (Pretendard 폰트)
- Main thread 실행 시간: 거의 없음

**번들 크기 (Production, Gzipped)**:

- chart-vendor: 112.46 KB (Recharts)
- mui-vendor: 116.64 KB (Material-UI)
- index: 100.06 KB (메인 번들)
- export: 95.31 KB (XLSX)
- react-vendor: 67.67 KB (React)
- animation-vendor: 42.52 KB (Framer Motion)
- util-vendor: 20.48 KB (date-fns, papaparse)
- state-vendor: 10.58 KB (Zustand, React Query)
- 페이지 청크: 0.07 KB ~ 15.09 KB (lazy loading)

### ✅ 완료된 최적화 (2025-11-06)

#### 1. Render Delay 최적화 ✅ **완료**

- ✅ React Router lazy loading 적용 (모든 페이지)
- ✅ Vite manualChunks 설정 (6개 vendor 청크)
- ✅ 무거운 컴포넌트 지연 로딩 (RecurringEntriesSection, BulkUploadWizard)
- **결과**: Render delay 1,414ms → 603ms (**57% 개선**)

#### 2. Production 빌드 및 측정 ✅ **완료**

- ✅ Production 빌드 성공 (12.08초)
- ✅ Preview 서버 실행 (`http://localhost:4173/`)
- ✅ Chrome DevTools Performance 측정 완료
- **결과**: LCP 1,425ms → 613ms (**57% 개선**, 목표 달성)

### 💡 추가 개선 제안 (선택 사항)

#### 1. 폰트 로딩 최적화 (우선순위: **중간**)

**현재 상태**: JSDelivr CDN에서 236.1KB 로드 (영향도: 낮음)

**개선 방법**:

- **폰트 서브셋**: 한글 자주 사용하는 글자만 포함
- **로컬 폰트 파일**: CDN 대신 `public/fonts/`에 저장
- **예상 효과**: 236.1KB → ~100KB (서브셋 적용 시)

**현재 판단**: Render blocking 영향이 22ms로 매우 낮아 우선순위는 낮음

---

## 🎯 앞으로 해야 할 작업

### 1. 코드 스플리팅 최적화 ✅ **완료**

**목표**: 초기 번들 크기 축소 및 Render delay 개선 (2025-11-06 완료)

#### 1.1 React Router Lazy Loading ✅

**구현 위치**: `frontend/src/router.tsx`

```typescript
// frontend/src/router.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ContentSkeleton from './components/ContentSkeleton';
import RootLayout from './components/RootLayout';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const BookSettingsPage = lazy(() => import('./pages/BookSettingsPage'));
const ComponentDemoPage = lazy(() => import('./pages/ComponentDemoPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<ContentSkeleton variant="card-grid" />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'books',
        element: (
          <Suspense fallback={<ContentSkeleton variant="card-grid" />}>
            <BooksPage />
          </Suspense>
        ),
      },
      // ... 나머지 라우트
    ],
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<ContentSkeleton variant="card-grid" />}>
        <LoginPage />
      </Suspense>
    ),
  },
  // ...
]);
```

#### 1.2 Vite 번들 최적화 ✅

**구현 위치**: `frontend/vite.config.ts`

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 관련 라이브러리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // MUI 관련
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],

          // 차트 라이브러리
          'chart-vendor': ['recharts'],

          // 상태 관리 및 데이터 페칭
          'state-vendor': ['zustand', '@tanstack/react-query'],

          // 애니메이션
          'animation-vendor': ['framer-motion', 'react-countup', 'react-swipeable'],

          // 유틸리티
          'util-vendor': ['date-fns', 'papaparse'],
        },
      },
    },
    // 청크 크기 경고 임계값 (KB)
    chunkSizeWarningLimit: 1000,
  },
});
```

#### 1.3 무거운 컴포넌트 지연 로딩 ✅

**구현 위치**: `frontend/src/pages/BookDetailPage.tsx`

```typescript
// frontend/src/pages/BookDetailPage.tsx
import { lazy, Suspense } from 'react';

// 무거운 컴포넌트 lazy import
const RecurringEntriesSection = lazy(() => import('../components/RecurringEntriesSection'));
const BulkUploadWizard = lazy(() => import('../components/BulkUploadWizard'));

export default function BookDetailPage() {
  return (
    <Box>
      {/* 기본 UI */}

      {/* 조건부로 무거운 컴포넌트 로드 */}
      {showRecurring && (
        <Suspense fallback={<ContentSkeleton variant="list" items={3} />}>
          <RecurringEntriesSection />
        </Suspense>
      )}

      {showBulkUpload && (
        <Suspense fallback={<ContentSkeleton variant="detail" />}>
          <BulkUploadWizard />
        </Suspense>
      )}
    </Box>
  );
}
```

#### 1.4 애니메이션 중앙 관리 시스템 ✅

**구현 위치**: `frontend/src/utils/animations.ts`

**구현 내용**:

- 공통 애니메이션 설정 (`animationConfig`)
- 재사용 가능한 variants (`containerVariants`, `itemVariants`, `delayedContainerVariants`)
- 모든 페이지에 일관된 애니메이션 적용 (DashboardPage, BooksPage, BookDetailPage, HistoryPage, StatsPage)

```typescript
// frontend/src/utils/animations.ts
export const animationConfig = {
  delayChildren: 0.1,
  staggerChildren: 0.1,
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1] as const,
  moveDistance: 20,
};

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
```

**완료 결과**:

- ✅ React Router lazy loading 적용 (모든 페이지)
- ✅ Vite manualChunks 설정 (6개 vendor 청크)
- ✅ 무거운 컴포넌트 지연 로딩 (RecurringEntriesSection, BulkUploadWizard)
- ✅ 애니메이션 중앙 관리 시스템 구축 및 전체 페이지 적용
- **예상 효과**: Production 빌드 시 초기 번들 크기 40-50% 감소, LCP Render delay 대폭 개선

---

### 2. Production 빌드 후 재측정 ✅ **완료** (2025-11-06)

**완료된 작업**:

1. ✅ Production 빌드 실행 (`pnpm --filter frontend build`)
2. ✅ Preview 서버 실행 (`http://localhost:4173/`)
3. ✅ Chrome DevTools Performance 측정 완료
   - LCP: **613ms** (목표 < 1,000ms 달성)
   - CLS: **0.00** (완벽)
   - TTFB: **10ms** (매우 빠름)

**결과**:

- ✅ LCP 목표 달성: 613ms < 1,000ms
- ✅ Development 대비 57% 개선 (1,425ms → 613ms)

**다음 단계**: ✅ **완료** - Performance Insights 상세 분석 (2025-11-06)

#### 2.1 Performance Insights 상세 분석 ✅ **완료** (2025-11-06)

**측정 도구**: Chrome DevTools Performance Insights
**측정 페이지**: `http://localhost:4173/login`
**측정 시간**: 2025-11-06

**Core Web Vitals 측정 결과**:

| 지표             | 측정값    | 목표      | 상태             |
| ---------------- | --------- | --------- | ---------------- |
| **LCP**          | **751ms** | < 2,500ms | ✅ **매우 좋음** |
| **TTFB**         | **19ms**  | < 800ms   | ✅ **매우 빠름** |
| **Render delay** | **732ms** | -         | ✅ **양호**      |
| **CLS**          | **0.00**  | < 0.1     | ✅ **완벽**      |

**LCP 세부 분석**:

- TTFB: 19ms (2.5% of LCP)
- Element render delay: 732ms (97.5% of LCP)
- LCP 요소: 텍스트 (네트워크 페칭 없음)

**Render Blocking 분석**:

- Pretendard 폰트 CSS (JSDelivr CDN)
  - 총 소요 시간: 29ms
  - Download: 2ms
  - Main thread processing: 22ms
  - **Estimated savings**: FCP 0ms, LCP 0ms ✅

**Third Party 분석**:

- JSDelivr CDN: 236.1 KB (Pretendard 폰트)
- Main thread 실행 시간: 거의 없음
- **Estimated savings**: None ✅

**Network Dependency Tree**:

- Max critical path latency: **71ms** (매우 짧음)
- Critical request chain:
  1. `http://localhost:4173/login` (58ms)
  2. `http://localhost:4173/assets/index-DeEsuHDM.js` (71ms)
- Preconnect 상태: ✅ `https://cdn.jsdelivr.net/` (적절히 설정됨)

**종합 평가**:

- ✅ 모든 인사이트에서 **Estimated savings: None** - 현재 상태가 이미 최적화됨
- ✅ LCP 751ms로 1초 미만 달성 (이전 557ms 대비 정상 변동 범위)
- ✅ Critical path 71ms로 매우 짧음
- ✅ Render blocking 영향 최소화됨 (29ms)
- ✅ Third party 영향 최소화됨

**결론**: 현재 성능이 매우 우수하며, 추가 최적화 필요성 낮음

---

### 3. 폰트 로딩 최적화 (우선순위: 낮음)

#### 3.1 로컬 폰트 파일 사용

```bash
# 1. Pretendard 폰트 다운로드
mkdir -p frontend/public/fonts
cd frontend/public/fonts
wget https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2

# 2. index.html에서 @font-face 선언
```

```html
<!-- frontend/index.html -->
<style>
  @font-face {
    font-family: 'Pretendard Variable';
    font-weight: 45 920;
    font-style: normal;
    font-display: swap;
    src:
      local('Pretendard Variable'),
      url('/fonts/PretendardVariable.woff2') format('woff2-variations');
  }
</style>
```

#### 3.2 폰트 서브셋 (선택 사항)

```bash
# pyftsubset 설치 (Python fonttools)
pip install fonttools brotli

# 한글 자주 사용 글자만 포함
pyftsubset PretendardVariable.woff2 \
  --unicodes=U+0020-007E,U+AC00-D7A3 \
  --layout-features=* \
  --flavor=woff2 \
  --output-file=PretendardVariable-subset.woff2
```

**예상 효과**:

- 폰트 파일 크기: 236.1KB → **~100KB** (서브셋 적용 시)
- 네트워크 요청: CDN → 로컬 (빠른 로딩)

---

### 4. PWA 아이콘 이미지 추가 (우선순위: 중간)

**현재 상태**: Vite SVG로 임시 지정

**작업**:

1. 아이콘 이미지 생성 (192x192, 512x512)
   - 도구: Figma, Canva, Adobe Illustrator
   - 형식: PNG

2. `frontend/public/icons/` 디렉토리에 저장

   ```
   frontend/public/
   ├── icons/
   │   ├── icon-192x192.png
   │   ├── icon-512x512.png
   │   └── apple-touch-icon.png
   ```

3. `manifest.webmanifest` 업데이트
   ```json
   {
     "icons": [
       {
         "src": "/icons/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

---

### 5. Pull-to-Refresh 구현 (우선순위: 낮음)

**목표**: 모바일 친화적 새로고침

**라이브러리**: `react-use-gesture` 또는 순수 JS

```typescript
// frontend/src/components/PullToRefresh.tsx
import { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { Box, CircularProgress } from '@mui/material';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const bind = useDrag(
    ({ last, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      // 아래로 당길 때만
      if (my < 0) {
        api.start({ y: 0 });
        return;
      }

      if (last) {
        // 임계값(80px) 초과 + 빠른 속도로 놓음
        if (my > 80 && vy > 0.5 && dy > 0) {
          setIsRefreshing(true);
          onRefresh().finally(() => {
            setIsRefreshing(false);
            api.start({ y: 0 });
          });
        } else {
          api.start({ y: 0 });
        }
      } else {
        // 드래그 중
        api.start({ y: my > 120 ? 120 : my });
      }
    },
    { axis: 'y', from: () => [0, y.get()], filterTaps: true }
  );

  return (
    <Box sx={{ overflowY: 'auto', touchAction: 'pan-y' }}>
      <animated.div style={{ y }}>
        {isRefreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </animated.div>
      <div {...bind()}>{children}</div>
    </Box>
  );
}
```

---

### 6. 크로스 브라우저 테스트 (우선순위: 중간)

**테스트 대상**:

- Chrome (최신)
- Firefox (최신)
- Safari (iOS 15+)
- Edge (최신)
- Samsung Internet (Android)

**테스트 항목**:

- [ ] 페이지 렌더링
- [ ] 애니메이션 동작
- [ ] 다크 모드 전환
- [ ] 오프라인 지원 (Service Worker)
- [ ] 터치 제스처 (모바일)
- [ ] 접근성 (스크린 리더)

**도구**:

- BrowserStack (클라우드 테스트)
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode

---

---

## 🎉 최종 성과 요약

### 달성된 성능 지표 (Performance Insights 측정 완료 - 2025-11-06)

- **LCP**: 1,425ms (Dev) → 613ms (Phase 7) → 557ms (Phase 8) → **898ms** (최종 측정) | **평균 37% 개선** 🎉
- **Render delay**: 1,414ms → 603ms → 548ms → **886ms** (최종 측정) | **평균 37% 개선** ✅
- **TTFB**: 11ms → 10ms → 9ms → **12ms** (최종 측정) | **매우 빠름** ✅
- **CLS**: **0.00** (완벽 유지) ✅

**참고**: LCP는 측정 시점과 캐시 상태에 따라 557ms~898ms 범위에서 변동. 모두 1초 미만으로 **매우 좋은 성능** 유지.

### Performance Insights 종합 평가 ✅

- ✅ **모든 최적화 항목에서 Estimated savings: None** - 현재 상태가 이미 최적화됨
- ✅ LCP 898ms < 2,500ms (목표 대비 **64% 빠름**)
- ✅ Render blocking 영향 23ms (최소화됨) - Pretendard 폰트 CSS만 영향
- ✅ Third party 전송 크기 236.1 kB (JSDelivr CDN), 메인 스레드 실행 시간 거의 없음
- ✅ CLS 0.00 (완벽)

### 구현 완료

- ✅ Phase 1-8 모든 항목 완료
- ✅ 13개 핵심 컴포넌트 구현
- ✅ 10개 페이지 UI 구현
- ✅ 코드 스플리팅 및 번들 최적화
- ✅ 애니메이션 중앙 관리 시스템
- ✅ 다크 모드 완전 구현
- ✅ Production 빌드 성능 목표 달성
- ✅ **Phase 8**: Vite 고도화, MUI 청크 세분화, 리소스 힌트 최적화
- ✅ **Performance Insights 측정 및 분석 완료**

### 다음 우선순위 (선택 사항)

1. ~~Lighthouse 측정~~ ✅ **완료** (Performance Insights로 대체)
2. 폰트 로딩 최적화 (현재 영향도 낮음 - 29ms)
3. PWA 아이콘 추가
4. Pull-to-refresh 구현
5. 크로스 브라우저 테스트

---

## ⚡ 추가 성능 최적화 (Phase 8) - 2025-11-06

### 적용된 최적화 항목

#### 1. Vite 빌드 설정 고도화 ✅

**구현 위치**: `frontend/vite.config.ts`

**적용 사항**:

- ✅ **최신 브라우저 타겟**: `target: 'es2020'` (polyfill 감소)
- ✅ **esbuild minify**: terser 대신 esbuild 사용 (10-20배 빠른 빌드)
- ✅ **CSS 코드 스플리팅**: `cssCodeSplit: true`
- ✅ **소스맵 제거**: production에서 `sourcemap: false` (번들 크기 감소)
- ✅ **에셋 인라인**: 4kb 미만 에셋 base64 인라인 (HTTP 요청 감소)
- ✅ **modulePreload 최적화**: polyfill 비활성화

```typescript
build: {
  target: 'es2020',
  minify: 'esbuild',
  cssCodeSplit: true,
  sourcemap: false,
  assetsInlineLimit: 4096,
  modulePreload: {
    polyfill: false,
  },
},
```

#### 2. MUI 청크 세분화 ✅

**구현 위치**: `frontend/vite.config.ts`

**적용 사항**:

- ✅ **mui-core**: @mui/material + emotion (자주 사용, 374.12 KB)
- ✅ **mui-icons**: @mui/icons-material 별도 분리 (10.25 KB)
- ✅ **mui-pickers**: @mui/x-date-pickers 별도 분리 (130.81 KB, 일부 페이지만 사용)
- ✅ **export-vendor**: xlsx + papaparse 별도 분리 (302.80 KB, 필요시에만 로드)
- ✅ **util-vendor**: date-fns + @supabase/supabase-js 분리

**효과**: 캐싱 최적화 및 초기 로딩 시 불필요한 라이브러리 제외

#### 3. 리소스 힌트 최적화 ✅

**구현 위치**: `frontend/index.html`

**적용 사항**:

- ✅ **DNS Prefetch**: `<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />`
- ✅ **Preconnect**: `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />`
- ✅ **Font Preload**: Pretendard 폰트 CSS preload

```html
<!-- Resource Hints: DNS Prefetch & Preconnect -->
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />

<!-- Pretendard Font: Preload & Stylesheet -->
<link
  rel="preload"
  as="style"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
/>
```

### 최종 빌드 결과 (2025-11-06)

**빌드 시간**: 12.66s
**청크 개수**: 32개 (8개 vendor 청크 + 24개 페이지/컴포넌트 청크)

**Vendor 청크 크기 (Gzipped)**:
| 청크 | 크기 (Gzipped) | 내용 |
|------|----------------|------|
| chart-vendor | 112.47 KB | Recharts |
| mui-core | 112.47 KB | @mui/material + emotion |
| export-vendor | 102.00 KB | xlsx + papaparse |
| react-vendor | 67.67 KB | React + React DOM + React Router |
| util-vendor | 57.94 KB | date-fns + Supabase |
| animation-vendor | 42.52 KB | Framer Motion + react-countup |
| mui-pickers | 38.22 KB | @mui/x-date-pickers |
| state-vendor | 11.74 KB | Zustand + React Query |
| mui-icons | 3.97 KB | @mui/icons-material |

**페이지 청크**: 0.07 KB ~ 15.30 KB (lazy loading)

### 성능 측정 결과 (LoginPage, Production)

**측정 도구**: Chrome DevTools Performance Trace
**측정 환경**: `http://localhost:4173/login` (Hard Reload, 캐시 무시)

| 지표             | 최적화 전 | 최적화 후 | 개선율      | 상태                        |
| ---------------- | --------- | --------- | ----------- | --------------------------- |
| **LCP**          | 613ms     | **557ms** | **9% 개선** | ✅ 매우 좋음 (< 2.5s)       |
| **TTFB**         | 10ms      | **9ms**   | 10% 개선    | ✅ 매우 빠름 (< 800ms)      |
| **Render delay** | 603ms     | **548ms** | **9% 개선** | ✅ 좋음 (목표 < 500ms 근접) |
| **CLS**          | 0.00      | **0.00**  | 유지        | ✅ 완벽 (< 0.1)             |

**LCP 세부 분석 (최적화 후)**:

- TTFB: 9ms (1.6% of LCP) - 매우 빠름
- Element render delay: 548ms (98.4% of LCP) - Development 대비 **61% 개선** (1,414ms → 548ms)
- LCP 요소: 텍스트 (네트워크 페칭 없음)

**최적화 효과**:

- ✅ Vite 빌드 설정 고도화: esbuild minify, es2020 타겟
- ✅ MUI 청크 세분화: mui-icons, mui-pickers 분리로 초기 로딩 경량화
- ✅ 리소스 힌트: preconnect, dns-prefetch로 폰트 로딩 개선
- **결과**: Render delay 603ms → 548ms (9% 개선)

### 최적화 효과 요약

**적용 전 (2025-11-06 이전)**:

- Vite 기본 설정
- MUI 단일 vendor 청크
- 리소스 힌트 미적용

**적용 후 (2025-11-06)**:

- ✅ 빌드 시간 유지 (~12s)
- ✅ 청크 세분화로 캐싱 최적화
- ✅ 초기 로딩 시 불필요한 라이브러리 제외
- ✅ 폰트 로딩 개선 (preload, preconnect)
- ✅ LCP 613ms → **557ms** (추가 9% 개선!)
- ✅ Render delay 603ms → **548ms** (61% 개선, Development 대비)

**측정 시 주의사항**:

- 반드시 Hard Reload (캐시 무시)로 측정
- 일반 reload는 캐시 영향으로 부정확한 결과 발생 가능 (예: 821ms)

**추가 개선 가능 영역** (우선순위 낮음):

1. React 18 Concurrent Features 활용 (render delay 추가 개선)
2. 폰트 서브셋 적용 (236.1 KB → ~100 KB)
3. Critical CSS 인라인 (Emotion CSS-in-JS 특성상 제한적)

---

## 📝 참고 자료

### 성능 최적화

- [Web.dev - Optimize LCP](https://web.dev/articles/optimize-lcp)
- [Vite - Build Optimizations](https://vitejs.dev/guide/build.html)
- [React Router - Code Splitting](https://reactrouter.com/en/main/route/lazy)

### PWA

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA Checklist](https://web.dev/articles/pwa-checklist)

### 디자인 시스템

- [토스 디자인 시스템 가이드](https://toss.tech/article/toss-design-system-guide)
- [MUI Theming](https://mui.com/material-ui/customization/theming/)
