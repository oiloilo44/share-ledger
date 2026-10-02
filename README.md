# ShareLedger

여러 사람이 하나의 장부에서 수입과 지출을 기록하고, 변경 내역을 함께 확인하는 공유 가계부 웹 앱입니다. React 화면부터 FastAPI API, Supabase 데이터베이스 마이그레이션까지 한 저장소에서 관리합니다.

장부를 공유할 때 필요한 멤버 권한, 거래 수정 이력, 반복 지출 표현에 초점을 맞췄습니다. 현재는 로컬 실행과 기능 검증을 위한 개발 프로젝트이며, 실제 금융 데이터를 저장하기 전에는 아래의 [제약과 보완 과제](#제약과-보완-과제)를 확인해야 합니다.

## 구현 범위

- **공유 장부**: 장부 생성·수정·삭제, 등록된 사용자의 이메일로 멤버 추가, 소유자와 편집자 권한 구분
- **거래 관리**: 수입·지출 입력, 날짜·카테고리·금액·작성자·검색어 필터, CSV 일괄 등록, CSV/XLSX 내보내기
- **변경 이력**: 거래 생성·수정·삭제 시 스냅샷 기록, 이력에서 거래 복원. 장부별 최신 100건을 보관
- **반복 내역**: 단건·매주·매월 주기를 거래에 저장하고, 장부 상세 화면에서 선택한 월의 발생 내역을 계산
- **통계 화면**: 저장된 거래 기준 수입·지출 합계, 카테고리 분포, 월별 추이, 주요 지출 조회
- **모바일 UI**: 반응형 화면, 바텀 시트, PWA 매니페스트와 서비스 워커, 오프라인 신규 입력 대기열

프런트엔드 화면·상태 관리, API·권한 검사, SQL 스키마·이력 함수, 테스트 코드가 포함되어 있습니다. 계정 인증과 데이터베이스 기반 기능은 Supabase를 사용합니다.

## 구조와 설계

```text
React / TypeScript
  ├─ Supabase Auth: 로그인, 세션 복원, 비밀번호 재설정
  └─ Bearer 토큰 → FastAPI
                     ├─ routers: 요청·응답, 인증 의존성
                     ├─ services: 멤버십·권한 확인, 조회·집계
                     └─ Supabase Postgres / RPC: 장부, 거래, 변경 이력
```

- **라우터와 서비스 분리**: API 입출력과 장부·거래 처리 로직을 나눴습니다. 라우터 테스트에서는 서비스 의존성을 대체하고, 실제 DB 연동은 별도 통합 테스트로 확인합니다.
- **거래와 이력의 일관성**: 거래 변경과 스냅샷 기록을 PostgreSQL RPC 함수에서 함께 처리합니다. API는 먼저 해당 장부에 접근할 수 있는 사용자인지 확인합니다.
- **반복 내역의 범위 저장**: 발생할 거래를 매번 생성하지 않고 시작일·종료일·주기를 한 행에 저장합니다. 현재 화면 전개와 서버 통계의 계산 기준은 다르며, 통합이 필요한 부분입니다.
- **서버 상태와 UI 상태 분리**: TanStack Query로 조회·변경 요청을 관리하고, Zustand로 인증·알림 등 클라이언트 상태를 관리합니다. 거래 변경에는 낙관적 업데이트와 오류 시 롤백이 들어 있습니다.

### 기술 스택

| 영역        | 사용 기술                                                            |
| ----------- | -------------------------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite 7, MUI, TanStack Query, Zustand, Recharts |
| Backend     | Python 3.11, FastAPI, Pydantic, Supabase Python SDK                  |
| Data / Auth | Supabase Auth, PostgreSQL, SQL RPC                                   |
| 검증        | pytest, Vitest, Testing Library, ESLint, Ruff, Black                 |
| 개발 환경   | pnpm workspace, uv, Storybook                                        |

### 디렉터리

```text
backend/app/          API 라우터, 모델, 서비스, 설정
backend/tests/        단위·라우터 테스트 및 Supabase 통합 테스트
frontend/src/         화면, 공통 컴포넌트, 상태 관리, API 클라이언트
infra/migrations/     0001~0007 SQL 마이그레이션
docs/                설정·스키마·아키텍처 문서
```

## 로컬 실행

### 1. 준비

Python **3.11**, Node.js **24**, pnpm **10.20.0**, uv가 필요합니다. 버전 기준은 `.python-version`, `.nvmrc`, `package.json`에 있습니다.

```bash
git clone https://github.com/oiloilo44/share-ledger.git
cd share-ledger

# Corepack을 사용하는 경우 저장소에 지정된 pnpm 버전으로 설치
corepack pnpm install --frozen-lockfile

cd backend
uv sync --locked --extra dev
cd ..

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

이후 명령의 `corepack pnpm`은 pnpm 10.20.0이 이미 설치되어 있다면 `pnpm`으로 실행해도 됩니다. Windows PowerShell에서는 `cp` 대신 `Copy-Item`을 사용할 수 있습니다.

### 2. Supabase 설정

별도의 개발용 Supabase 프로젝트를 준비하고, SQL Editor에서 `infra/migrations/0001_init.sql`부터 `0007_fix_recurring_end_date.sql`까지 **번호 순서대로 한 번씩** 적용합니다. 기존 DB에 초기화 목적으로 재실행하지 마세요. `0006`은 이전 `recurring_entries` 테이블을 삭제합니다.

두 `.env` 파일에 같은 프로젝트의 값을 입력합니다.

| 파일            | 변수                              | 값                                           |
| --------------- | --------------------------------- | -------------------------------------------- |
| `backend/.env`  | `SHARELEDGER_SUPABASE_URL`        | Supabase 프로젝트 URL                        |
| `backend/.env`  | `SHARELEDGER_SUPABASE_SERVER_KEY` | 서버 전용 service role key                   |
| `backend/.env`  | `SHARELEDGER_CORS_ORIGINS`        | `["http://localhost:5173"]` 형태의 JSON 배열 |
| `frontend/.env` | `VITE_SUPABASE_URL`               | 같은 Supabase 프로젝트 URL                   |
| `frontend/.env` | `VITE_SUPABASE_ANON_KEY`          | 브라우저용 anon key                          |
| `frontend/.env` | `VITE_API_URL`                    | `http://localhost:8000`                      |

service role key는 프런트엔드에 넣지 않습니다. `VITE_` 접두사 값은 브라우저 번들에 포함됩니다. 예제 값만으로 화면과 개발 서버는 띄울 수 있지만 로그인과 데이터 저장에는 실제 개발 프로젝트가 필요합니다.

이메일 확인·재설정 링크와 선택 기능인 Google/Kakao 로그인은 Supabase Auth의 URL·공급자 설정이 필요합니다. 자세한 순서와 주의 사항은 [Supabase 설정](docs/supabase.md)에 정리했습니다.

### 3. 서버 실행

터미널 A:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

터미널 B, 저장소 루트에서:

```bash
corepack pnpm --filter frontend dev
```

- 앱: <http://localhost:5173>
- API 문서: <http://localhost:8000/docs>
- 헬스 체크: <http://localhost:8000/health-check>

헬스 체크는 Supabase 클라이언트 생성까지만 확인합니다. DB 연결, 스키마 적용, 로그인 성공을 보장하는 검사는 아닙니다.

## 테스트와 빌드

아래 검증은 실제 Supabase 계정 없이 실행할 수 있습니다.

```bash
# backend/에서: 외부 DB에 접근하는 테스트 제외
uv run pytest -m "not integration"
uv run ruff check app tests
uv run black --check app tests

# 저장소 루트에서
corepack pnpm --filter frontend test
corepack pnpm --filter frontend lint
corepack pnpm --filter frontend build
```

2026-10-02 로컬 검증에서는 백엔드 33개, 프런트엔드 145개 테스트가 통과했습니다. Ruff·Black·ESLint 검사와 프런트엔드 production build도 통과했습니다. 검증 환경은 Python 3.11, Node.js 24, pnpm 10.20.0이며, 실제 Supabase 통합 테스트 4개는 연결 정보 없이 건너뛰었습니다.

백엔드 테스트는 인증·장부·거래 라우터와 오류 응답, 모의 HTTP 응답을 이용한 인증 서비스를 확인합니다. 프런트엔드 기본 테스트는 공통 컴포넌트의 렌더링과 상호작용을 다루며, Storybook 스냅샷과 전체 사용자 흐름 E2E 테스트는 기본 실행 범위에 포함되지 않습니다.

실제 DB 검증이 필요할 때만 **데이터가 없는 테스트 전용 프로젝트**를 설정하고 실행합니다.

```bash
cd backend
uv run pytest -m integration -rs
```

통합 테스트는 테스트 사용자·장부·거래를 생성하고 삭제합니다. 환경 변수가 없거나 예제 값이면 건너뛰며, 네트워크 오류도 건너뛰기로 처리하므로 결과의 `skipped` 사유를 반드시 확인해야 합니다.

## 제약과 보완 과제

- **배포 전 권한 검토**: 현재 SQL에는 RLS 정책과 RPC 실행 권한 제한이 없습니다. API의 권한 검사만으로 DB 직접 접근까지 보호된다고 볼 수 없습니다. 실제 개인정보나 금융 데이터를 넣기 전에 DB 접근 정책을 설계·검증해야 합니다.
- **실시간 동기화**: 서버는 `pg_notify`, 브라우저는 Supabase Broadcast를 사용하지만 둘을 연결하는 전달 계층은 저장소에 없습니다. 여러 사용자의 변경 사항이 자동 반영되는 흐름은 추가 구현과 검증이 필요합니다.
- **반복 거래 일관성**: 상세 화면의 반복 전개와 서버의 날짜 필터·통계는 아직 동일한 계산 경로를 쓰지 않습니다. 기간 경계, 시간대, 내보내기 결과까지 맞추는 작업이 남아 있습니다. 이전 `recurring` 라우터·서비스 파일은 남아 있지만 앱에 등록되지 않습니다.
- **오프라인 범위**: 로컬 대기열은 신규 거래 입력을 재전송하는 수준입니다. 수정·삭제, 반복 필드 재전송, 충돌 해결, 중복 방지까지 갖춘 동기화는 아닙니다.
- **검증 범위**: 단위 테스트 통과가 실제 인증·DB·브라우저 연동을 보장하지는 않습니다. 운영 배포, 부하 성능, 브라우저별 동작은 별도 확인이 필요합니다.

## 관련 문서

- [백엔드 실행](backend/README.md)
- [백엔드 아키텍처](docs/backend-architecture.md)
- [데이터베이스 스키마](docs/database.md)
- [Supabase 설정](docs/supabase.md)
