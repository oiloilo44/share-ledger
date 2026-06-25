# ShareLedger

공유 가계부를 위한 FastAPI + React 모놀리포입니다. 여러 사용자가 같은 장부에서 수입, 지출, 반복 거래, 통계를 관리하는 흐름을 구현했습니다.

## 주요 기능

- Supabase Auth 기반 로그인과 세션 처리
- 공유 장부, 거래 내역, 반복 거래 API
- React PWA 프런트엔드와 모바일 대응 UI
- 단위 테스트와 Supabase 연동 테스트 분리

## 기술 스택

- Backend: Python 3.11, FastAPI, Pydantic, Supabase SDK, pytest
- Frontend: React 18, Vite, TypeScript, MUI, Zustand, React Query
- Tooling: pnpm workspace, uv, ruff, black, ESLint, Prettier

## 실행

```bash
pnpm install

cd backend
uv sync --extra dev
cp .env.example .env

cd ../frontend
cp .env.example .env
pnpm dev
```

백엔드는 별도 터미널에서 실행합니다.

```bash
cd backend
uv run uvicorn app.main:app --reload
```

`.env.example` 값은 모두 예시입니다. 실제 Supabase URL, anon key, service role key는 각자 생성한 프로젝트 값을 사용해야 합니다.

## 테스트

```bash
cd backend
uv run pytest

cd ../frontend
pnpm test
pnpm lint
```

Supabase 실환경 통합 테스트는 필요한 환경 변수가 있을 때만 실행합니다.
