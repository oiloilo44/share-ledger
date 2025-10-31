# ShareLedger Backend

FastAPI 기반 API 서비스. 애플리케이션 코드는 `app/` 디렉터리에 배치하며, `create_app()` 팩토리를 진입점으로 사용합니다.

## 개발

```bash
uv venv .venv-backend
uv pip install --python .venv-backend/bin/python -r requirements-dev.txt
uv run --python .venv-backend/bin/python uvicorn app.main:app --reload
```
