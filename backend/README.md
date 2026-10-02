# ShareLedger Backend

FastAPI API 서비스입니다. `app/main.py`의 `create_app()`에서 인증, 장부, 거래, 변경 이력 라우터를 등록합니다.

## 실행

저장소 루트의 `.python-version`과 `pyproject.toml`은 Python 3.11을 기준으로 합니다. 아래 명령은 `backend/`에서 실행합니다.

```bash
uv sync --locked --extra dev
cp .env.example .env
# .env에 개발용 Supabase 프로젝트 URL과 서버 키 입력
uv run uvicorn app.main:app --reload --port 8000
```

환경 변수는 실행 디렉터리의 `.env`에서 읽습니다. SQL 마이그레이션과 프런트엔드 설정은 [루트 README](../README.md#로컬-실행)를 참고하세요.

- API 문서: <http://localhost:8000/docs>
- 헬스 체크: <http://localhost:8000/health-check>

헬스 체크는 SDK 클라이언트 초기화만 확인하며 실제 DB 쿼리를 실행하지 않습니다.

## 검증

```bash
uv run pytest -m "not integration"
uv run ruff check app tests
uv run black --check app tests
```

통합 테스트는 Supabase에 사용자와 데이터를 생성·삭제하므로 테스트 전용 프로젝트에서만 실행합니다.

```bash
uv run pytest -m integration -rs
```

예제 환경 변수 또는 네트워크 오류로 건너뛴 테스트는 실환경 검증 성공으로 간주하지 않습니다.
