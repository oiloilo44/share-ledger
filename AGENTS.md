# Repository Guidelines

> **중요:** 모든 커뮤니케이션과 문서는 반드시 한국어로 작성합니다.

## Project Structure & Module Organization

- `backend/`: FastAPI application code under `app/` with tests in `backend/tests/`.
- `frontend/`: React + Vite client; routes in `src/router.tsx`, UI state in `src/stores/`, MUI theme in `src/theme/`.
- `docs/`: Operational references such as `docs/supabase.md`.
- `infra/`: Reserved for deployment and database artifacts (e.g., upcoming migrations).
- Root config files (`pyproject.toml`, `package.json`, `.pre-commit-config.yaml`) define shared tooling and should be updated in tandem.

## Build, Test, and Development Commands

```bash
# Install dependencies
uv venv backend/.venv
uv sync --python backend/.venv/bin/python --extra dev
pnpm install

# Run services
uv run --python backend/.venv/bin/python uvicorn app.main:app --reload
pnpm --filter frontend dev

# Quality gates
pnpm lint          # runs workspace lint targets
pnpm format        # runs workspace formatting targets
pre-commit run --all-files
```

## Coding Style & Naming Conventions

- Python follows Ruff + Black with 4-space indentation and double quotes; import order is enforced (see `ruff.toml`).
- TypeScript uses ESLint (with TypeScript ESLint, React hooks, React Refresh) and Prettier; JSX components live in `PascalCase` files.
- Keep environment-specific secrets out of the repo; leverage `.env.example` for documenting required variables.
- Always run the `pre-commit` hook (installed via `pnpm prepare && pre-commit install`) before committing.
- `pre-commit` 훅은 `--no-verify` 등의 옵션으로 절대 건너뛰지 않는다.

## Testing Guidelines

- Python tests use `pytest`; name files `test_*.py` under `backend/tests/`.
- Frontend unit tests will use Vitest + Testing Library (`pnpm --filter frontend test`). Add component tests next to source files in `__tests__/` folders when introduced.
- Ensure new features include at least smoke tests validating API endpoints or UI flows.

## Commit & Pull Request Guidelines

- Commit messages follow `<type>: <summary>` (e.g., `feat(api): ...`, `chore: ...`). Stage-wide checkpoints should mirror the plan in `plan.md`.
- Before opening a PR, confirm `pre-commit run --all-files` and project tests succeed, update `plan.md` status icons, and summarize Supabase MCP actions performed.
- PR descriptions should link related issues, list key changes, and include screenshots or API examples when editing UI or endpoint contracts.
