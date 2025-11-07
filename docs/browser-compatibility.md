# 브라우저 호환성 가이드

## 지원 브라우저

### ✅ 완전 지원 (권장)

다음 브라우저에서 모든 기능이 정상 작동합니다:

- **Chrome** 90+ (Desktop & Mobile)
- **Edge** 90+
- **Firefox** 88+
- **Safari** 14+ (iOS & macOS)
- **Samsung Internet** 15+

### ⚠️ 부분 지원

다음 브라우저는 대부분의 기능이 작동하지만 일부 제한이 있을 수 있습니다:

- **Safari** 12-13 (구형 API 제한)
- **Firefox ESR** (최신 CSS 기능 제한)
- **Opera** 모바일

### ❌ 미지원

- **Internet Explorer** (모든 버전)
- **Opera Mini** (JavaScript 제한)
- 5년 이상 된 구형 브라우저

## 호환성 개선 사항

### 1. iOS Safari 최적화

**100vh 문제 해결**

```css
/* iOS Safari에서 하단 툴바 때문에 100vh가 화면을 넘치는 문제 */
:root {
  --vh: 1vh; /* 폴백 */
  --dvh: 1dvh; /* iOS Safari 15+ */
}
```

**터치 인터랙션**

```css
html {
  -webkit-overflow-scrolling: touch; /* 부드러운 스크롤 */
}

body {
  -webkit-tap-highlight-color: transparent; /* 탭 하이라이트 제거 */
  touch-action: manipulation; /* 더블탭 줌 방지 */
}
```

### 2. 폰트 렌더링

모든 브라우저에서 일관된 폰트 렌더링:

```css
html {
  -webkit-font-smoothing: antialiased; /* macOS/iOS */
  -moz-osx-font-smoothing: grayscale; /* Firefox macOS */
}
```

### 3. 크로스 브라우저 CSS

**스크롤바 스타일**

- Chrome/Edge/Safari: `::-webkit-scrollbar` 지원
- Firefox: `scrollbar-width`, `scrollbar-color` 지원

**다크 모드**

```javascript
// Safari < 14 호환성 코드 포함
if (mediaQuery.addEventListener) {
  mediaQuery.addEventListener('change', handler);
} else if (mediaQuery.addListener) {
  // Safari < 14
  mediaQuery.addListener(handler);
}
```

### 4. PWA 지원

**아이콘 형식**

- PNG (192x192, 512x512) - 모든 브라우저 지원
- SVG - 최신 브라우저만 지원 (폴백으로 PNG 우선)

**Service Worker**

- Chrome/Edge/Firefox/Safari 11.1+ 지원
- iOS Safari: 오프라인 모드 제한적 지원

## 테스트 방법

### 로컬 테스트

**Chrome DevTools Device Mode**

```bash
# 프론트엔드 빌드 및 프리뷰
cd frontend
pnpm build
pnpm preview
```

1. Chrome DevTools 열기 (F12)
2. Device Mode 활성화 (Ctrl/Cmd + Shift + M)
3. 다양한 디바이스 프로필 테스트:
   - iPhone 13/14/15
   - Samsung Galaxy S21/S22
   - iPad Pro
   - Desktop (1920x1080, 1366x768)

**네트워크 조건 테스트**

```javascript
// Chrome DevTools > Network 탭
- Fast 3G
- Slow 3G
- Offline (Service Worker 테스트)
```

### BrowserStack / LambdaTest (선택 사항)

실제 디바이스에서 테스트하려면:

1. [BrowserStack](https://www.browserstack.com/) 무료 플랜 사용
2. [LambdaTest](https://www.lambdatest.com/) 무료 플랜 사용

## 알려진 이슈 및 해결 방법

### 1. iOS Safari - 비디오 자동 재생

**문제**: 비디오 자동 재생이 차단됨
**해결**: 현재 프로젝트는 비디오를 사용하지 않음

### 2. Firefox - CSS backdrop-filter

**문제**: `backdrop-filter` 성능 이슈
**해결**: MUI 기본 배경 사용, backdrop-filter 미사용

### 3. Safari < 14 - matchMedia.addEventListener

**문제**: `addEventListener` 메서드 없음
**해결**: `addListener` 폴백 구현됨 (App.tsx:49-53)

### 4. 모바일 브라우저 - 주소창 숨김

**문제**: 스크롤 시 주소창이 나타나면서 레이아웃 깨짐
**해결**: `--dvh` (Dynamic Viewport Height) 사용

## Browserslist 설정

프로젝트는 다음 타겟을 사용합니다:

```
# .browserslistrc
[production]
>0.5%                # 0.5% 이상 점유율
last 2 versions      # 최신 2개 버전
Firefox ESR          # Firefox 장기 지원 버전
not dead             # 지원 중단되지 않은 브라우저
not IE 11            # IE 11 제외

[development]
last 1 chrome version
last 1 firefox version
last 1 safari version
```

## 성능 최적화

### Vite Build Target

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020', // ES2020 지원 브라우저 (Chrome 80+, Firefox 74+, Safari 13.1+)
  },
});
```

**지원 브라우저**:

- Chrome 80+ (2020년 2월)
- Edge 80+
- Firefox 74+ (2020년 3월)
- Safari 13.1+ (2020년 3월)

## 추가 리소스

- [Can I Use](https://caniuse.com/) - CSS/JS 기능 브라우저 지원 확인
- [MDN Web Docs](https://developer.mozilla.org/) - 웹 표준 문서
- [Browserslist](https://browsersl.ist/) - 타겟 브라우저 확인

## 보고된 버그

현재까지 보고된 브라우저별 버그 없음.

새로운 브라우저 호환성 이슈를 발견하면 [GitHub Issues](https://github.com/yourusername/shareledger/issues)에 보고해주세요.
