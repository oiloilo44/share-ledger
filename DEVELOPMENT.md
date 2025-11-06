# ShareLedger 개발 가이드

> **중요:** 모든 커뮤니케이션과 문서는 반드시 한국어로 작성합니다.

## 프로젝트 개요

ShareLedger는 친구, 가족과 함께 쓰는 공유 가계부 웹 애플리케이션입니다. FastAPI 백엔드, React PWA 프론트엔드, Supabase BaaS로 구성된 모놀리포 프로젝트입니다.

## 프로젝트 구조

```
├── backend/              # FastAPI 애플리케이션
│   ├── app/              # 애플리케이션 코드
│   └── tests/            # 테스트
├── frontend/             # React + Vite PWA
│   └── src/
│       ├── pages/        # 페이지 컴포넌트
│       ├── components/   # 재사용 UI 컴포넌트
│       ├── stores/       # Zustand 상태 관리
│       ├── router.tsx    # React Router 설정
│       └── theme/        # MUI 테마 설정
├── docs/                 # 설계 및 운영 문서
├── infra/                # 인프라 및 배포 스크립트
├── .pre-commit-config.yaml
├── pnpm-workspace.yaml
└── pyproject.toml
```

## 개발 환경 설정

### 의존성 설치

```bash
# Python 의존성
cd backend
uv venv .venv
uv sync --python .venv/bin/python --extra dev

# Node 패키지
pnpm install
```

### 환경 변수 구성

**백엔드 환경 변수** (`backend/.env`):

- `SHARELEDGER_SUPABASE_URL`: Supabase 프로젝트 REST URL
- `SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY`: Service Role 키
- `SHARELEDGER_CORS_ORIGINS`: CORS 허용 Origin (콤마 구분)

**프론트엔드 환경 변수** (`frontend/.env`):

- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anon 키
- `VITE_API_URL`: 백엔드 API URL (기본값: `http://localhost:8000`)

### pre-commit 훅 설치

```bash
pnpm dlx husky init
pre-commit install
```

**중요**: 커밋 전 반드시 pre-commit 훅을 통과해야 하며, `--no-verify` 옵션으로 절대 건너뛰지 않습니다.

## 개발 명령어

### 백엔드

```bash
# 개발 서버 실행
uv run --python backend/.venv/bin/python uvicorn app.main:app --reload

# 테스트 실행
cd backend
.venv/bin/python -m pytest
.venv/bin/python -m pytest tests/test_specific.py  # 특정 테스트만
.venv/bin/python -m pytest -k test_function_name   # 함수명으로 필터
```

### 프론트엔드

```bash
# 개발 서버
pnpm --filter frontend dev

# 빌드
pnpm --filter frontend build

# 프리뷰
pnpm --filter frontend preview

# 테스트 (추후 Vitest 사용 예정)
pnpm --filter frontend test
```

### 코드 품질 관리

```bash
# 전체 린트
pnpm lint

# 전체 포맷
pnpm format

# pre-commit 훅 실행
pre-commit run --all-files
```

## 아키텍처

### 백엔드 구조 (`backend/app/`)

```
app/
├── main.py          # FastAPI 애플리케이션 생성, CORS, 예외 핸들러
├── config.py        # Pydantic Settings (환경 변수: SHARELEDGER_* prefix)
├── db.py            # Supabase 클라이언트 초기화 및 DI
├── routers/         # API 엔드포인트 (auth, books, entries)
├── services/        # 비즈니스 로직 (BookService, EntryService)
├── models/          # Pydantic 스키마 (요청/응답 모델)
└── schemas/         # 내부 데이터 구조 (SupabaseUser 등)
```

**핵심 패턴**:

- **의존성 주입**: `get_supabase_client()`, `get_current_user()`, `get_book_service()` 등 FastAPI Depends 패턴 사용
- **서비스 계층**: 각 도메인별 Service 클래스가 비즈니스 로직 담당 (예: `BookService`, `EntryService`)
- **인증**: Supabase Auth REST API 래퍼 (`services/auth.py`), JWT Bearer 토큰 검증 (`get_current_user`)
- **예외 처리**: 서비스 계층에서 `ServiceError` 발생 → 라우터에서 `raise_http_exception`으로 HTTP 예외 변환
- **트랜잭션**: Supabase RPC 함수 사용 (예: `create_entry_with_history`, `restore_entry_from_history`)

### 프론트엔드 구조 (`frontend/src/`)

**현재 상태**: 기본 구조만 있음 (React + Vite + MUI 템플릿). 인증 UI, 가계부 관리, 내역 CRUD, 히스토리 UI는 아직 미구현.

**계획된 스택**:

- **상태 관리**: Zustand (`authStore`, `booksStore`)
- **데이터 페칭**: React Query
- **실시간 동기화**: Supabase JS SDK Realtime (`realtime:books:{book_id}` 채널 구독)

### 데이터베이스 & Supabase

**스키마 (PostgreSQL)**:

- `users` (Supabase Auth 스키마)
- `account_books`: 가계부 (사용자당 최대 5개 제한)
- `book_members`: 가계부 공유 멤버 (공유 가계부 최대 5개 제한)
- `entries`: 수입/지출 내역
- `entry_history`: 변경 이력 (가계부당 최대 100건 유지)
- `recurring_entries`: 반복 내역 설정 (추후 구현)

**제약 조건**:

- 가계부 생성 제한: `enforce_book_limits()` 트리거
- 히스토리 100건 제한: `prune_entry_history()` 트리거
- 반복 내역 중복 방지: `check_recurring_conflict()` 함수

**Supabase 작업 규칙**:

- **절대** 로컬에서 직접 SQL 실행 금지
- 모든 DDL 작업은 `infra/migrations/*.sql` 파일 작성 → Supabase MCP `apply_migration` 사용
- 조회/DML은 Supabase Python/JS SDK 또는 MCP `execute_sql` 사용
- 프로젝트 정보: `docs/supabase.md` 참조 (프로젝트 ID: `aluzsrazjvutvarvstci`)

### 실시간 동기화 아키텍처

백엔드는 데이터 변경 시 `pg_notify('realtime:books:{book_id}', ...)` 호출하여 이벤트 발행.
프론트엔드는 Supabase Realtime 채널 구독하여 실시간 동기화 (추후 구현 예정).

## 코딩 표준

### Python (백엔드)

- **포맷터**: Ruff + Black (4-space, 100 chars, double quotes)
- **Import 정렬**: `from __future__ import annotations` 최상단 배치
- **타입 힌트**: 모든 함수 시그니처에 타입 힌트 필수
- **설정 파일**: `ruff.toml`, `pyproject.toml`
- **테스트**: pytest, 파일명은 `test_*.py` 형식, `backend/tests/` 디렉터리에 위치

### TypeScript (프론트엔드)

- **린터**: ESLint (TypeScript ESLint, React hooks, React Refresh)
- **포맷터**: Prettier
- **파일명**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **테스트**: Vitest + Testing Library (추후 도입 예정), 컴포넌트 테스트는 `__tests__/` 폴더에 위치

### 커밋 & Git 워크플로

**Commit 메시지 형식**: `<type>(<scope>): <summary>`

예시:

- `feat(api): add entry history endpoints`
- `feat(frontend): implement dark mode toggle`
- `fix(auth): resolve token refresh issue`
- `chore: update dependencies`
- `docs: update API documentation`

**중요 규칙**:

- AI 관련 표현 절대 금지
- Git config: `user.name = "mp"`, `user.email = "mp@mp.mp"`
- 커밋 전 체크리스트:
  1. pre-commit 훅 통과 확인 (ruff, black, ESLint, Prettier)
  2. `plan.md` 상태 갱신 (`⏳` → `✅`) - gitignore됨
  3. 관련 테스트 실행 및 통과 확인

### Pull Request 가이드라인

- PR 설명에 관련 이슈 링크 포함
- 주요 변경사항 목록 작성
- UI 변경 시 스크린샷 포함
- API 엔드포인트 변경 시 예제 포함
- `pre-commit run --all-files` 성공 확인
- 프로젝트 테스트 통과 확인
- Supabase MCP 작업 수행 시 요약 포함

## 테스트 가이드라인

### 백엔드 테스트

- `backend/tests/`: 단위 및 통합 테스트 (pytest)
- `backend/tests/integration/`: Supabase 실환경 테스트 (환경 변수 없으면 자동 skip)
- 인증 테스트는 `httpx.MockTransport`로 Supabase Auth REST 호출 모킹
- 새로운 기능은 최소한 smoke test 포함

### 프론트엔드 테스트

- Vitest + Testing Library 사용 예정
- 컴포넌트 테스트는 `__tests__/` 폴더에 위치
- UI 플로우 검증을 위한 테스트 포함

## Known Quirks & Caveats

### 백엔드

- **Supabase SDK 호환성**: `supabase-py` + httpx 조합에서 일부 런타임 패치 필요 (현재 `db.py`에서 처리)
- **트랜잭션 처리**: Postgres 트랜잭션은 Supabase RPC 함수로 구현 (`infra/migrations/0002_entry_history_rpc.sql`)
- **테스트 실행**: 반드시 `backend` 디렉터리에서 `.venv/bin/python -m pytest` 형태로 실행 (경로 문제 방지)

### 프론트엔드

- **실시간 동기화**: Supabase Realtime 채널 구독 시 `pg_notify` 이벤트 수신 구현 필요
- **React Query**: Realtime 이벤트 수신 시 cache 무효화(`queryClient.invalidateQueries`)로 자동 리프레시

### Supabase

- **무료 플랜 제한**: 7일간 활동 없으면 프로젝트 일시 중지 (Keep-Alive 워크플로 예정)
- **RLS 정책**: 현재 Service Role 키 사용으로 RLS 우회 중. 프로덕션 배포 시 RLS 정책 추가 필수

## 핵심 비즈니스 규칙

1. **가계부 제한**: 사용자당 소유 가계부 최대 5개, 공유받은 가계부 최대 5개
2. **히스토리 보존**: 가계부당 최신 100건의 변경 이력만 유지
3. **역할 시스템**: OWNER (삭제 가능), EDITOR (수정 가능), VIEWER (조회만, 추후 구현)
4. **복원 기능**: 히스토리에서 특정 시점 선택 → `restore_entry_from_history` RPC로 복원

## 참고 문서

- `README.md`: 빠른 시작 가이드
- `spec.md`: 기술 명세서 (기능, API 엔드포인트, 스키마)
- `docs/supabase.md`: Supabase 프로젝트 정보
- `plan.md`: 단계별 구현 로드맵 (gitignore됨, 버전 관리 안 함)
- `AGENTS.md`: 레거시 문서 (현재는 DEVELOPMENT.md 참조)
- `CLAUDE.md`: 레거시 문서 (현재는 DEVELOPMENT.md 참조)
