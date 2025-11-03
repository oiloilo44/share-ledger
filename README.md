# ShareLedger

공동 가계부 협업 도구 ShareLedger의 모놀리포입니다. FastAPI 기반 백엔드와 React + Vite 기반 프런트엔드, 그리고 Supabase 인프라 구성을 포함합니다.

## 프로젝트 구조

```
├── backend/              # FastAPI 애플리케이션
├── frontend/             # React + Vite PWA
├── docs/                 # 설계 및 운영 문서
├── infra/                # 인프라 및 배포 스크립트
├── .pre-commit-config.yaml
├── pnpm-workspace.yaml
└── pyproject.toml
```

## 개발 환경

- Python 3.11 (uv 기반 가상환경 관리)
- FastAPI, Uvicorn
- React 18, Vite, pnpm, MUI, Zustand, React Router
- Supabase (Postgres, Auth, Storage, Edge Functions)

## 빠른 시작

1. **Python 의존성 설치**

   ```bash
   uv venv backend/.venv
   uv sync --python backend/.venv/bin/python --extra dev
   ```

   > `uv run --python backend/.venv/bin/python`으로 FastAPI 앱을 실행하세요.

2. **Node 패키지 설치**

   ```bash
   pnpm install
   ```

3. **환경 변수 구성**

   백엔드와 프론트엔드는 각각 독립적인 환경 변수를 사용합니다.

   **백엔드 환경 변수**:

   ```bash
   cp backend/.env.example backend/.env
   ```

   `backend/.env`에 다음 값을 설정:
   - `SHARELEDGER_SUPABASE_URL`: Supabase 프로젝트 REST URL
   - `SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY`: Service Role 키 (민감 정보)
   - `SHARELEDGER_CORS_ORIGINS`: CORS 허용 도메인

   **프론트엔드 환경 변수**:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   `frontend/.env`에 다음 값을 설정:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL (백엔드와 동일)
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon 키 (클라이언트용 공개 키)
   - `VITE_API_URL`: 백엔드 API URL (기본값: `http://localhost:8000`)

4. **pre-commit / husky 설치**

   ```bash
   pnpm dlx husky init
   pre-commit install
   ```

   - 커밋 전에 자동으로 ruff, black, ESLint, Prettier가 실행됩니다.
   - lint-staged 설정은 프런트엔드 파일을 pnpm 스크립트와 동일한 옵션으로 정리합니다.

5. **개발 서버 실행**
   - 백엔드: `uv run --python backend/.venv/bin/python backend/app/main.py`
   - 프런트엔드: `pnpm --filter frontend dev`

## 테스트

- 백엔드 단위 및 통합 테스트: `backend/.venv/bin/python -m pytest`
  - `backend/tests/test_auth_service.py`는 Supabase Auth REST 호출을 MockTransport로 검증합니다.

## Supabase

- 프로젝트 ID: `aluzsrazjvutvarvstci`
- 조직 ID: `kyweykrqmewzmmshekiq`
- 리전: `ap-southeast-1`

추가 세부 정보는 `docs/supabase.md`에서 관리합니다.
