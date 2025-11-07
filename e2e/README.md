# E2E 테스트

Playwright를 사용한 End-to-End 테스트입니다.

## 테스트 실행

### 사전 준비

1. Playwright 브라우저 설치:

```bash
pnpm exec playwright install chromium
```

2. 환경 변수 설정:
   - 백엔드 `.env` 파일에 Supabase 연결 정보 설정
   - 프론트엔드 `.env` 파일에 API URL 및 Supabase 정보 설정

### 테스트 실행 방법

#### 1. 헤드리스 모드 (기본)

```bash
pnpm test:e2e
```

#### 2. UI 모드 (디버깅용)

```bash
pnpm test:e2e:ui
```

#### 3. 헤드 모드 (브라우저 보기)

```bash
pnpm test:e2e:headed
```

#### 4. 특정 테스트만 실행

```bash
pnpm exec playwright test e2e/auth.spec.ts
```

## 테스트 구조

- `auth.spec.ts`: 인증 관련 테스트 (회원가입, 로그인, 로그아웃)
- `books.spec.ts`: 가계부 관리 테스트 (생성, 수정, 삭제, 5개 제한)
- `entries.spec.ts`: 내역 관리 테스트 (추가, 수정, 삭제, 필터링)
- `members.spec.ts`: 멤버 관리 테스트 (초대, 역할 변경, 삭제, 공유 5개 제한)
- `history.spec.ts`: 히스토리 관리 테스트 (조회, 복원)
- `helpers.ts`: 공통 헬퍼 함수

## 주의사항

- E2E 테스트는 실제 백엔드 서버와 통신하므로, 로컬 개발 서버가 실행 중이어야 합니다.
- 테스트 실행 전에 `pnpm --filter frontend dev` 명령으로 프론트엔드 개발 서버를 시작하세요.
- 테스트는 매번 새로운 사용자 계정을 생성하므로, Supabase 프로젝트에 접근 권한이 필요합니다.

## 보고서 확인

테스트 실행 후 HTML 보고서는 `playwright-report/` 디렉토리에 생성됩니다:

```bash
pnpm exec playwright show-report
```
