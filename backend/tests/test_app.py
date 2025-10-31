import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_check_returns_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.main.get_supabase_client", lambda: object())
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/health-check")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unhandled_exception_returns_500(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.main.get_supabase_client", lambda: object())
    app = create_app()

    @app.get("/boom")  # type: ignore[misc]
    def boom() -> None:
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "서버 내부 오류가 발생했습니다."}
