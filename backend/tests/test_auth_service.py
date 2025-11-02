from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

import httpx
import pytest

from app.config import Settings
from app.services.auth import AuthService, AuthServiceError


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _build_mock_client(settings: Settings, transport: httpx.MockTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=f"{settings.supabase_url.rstrip('/')}/auth/v1",
        transport=transport,
    )


@pytest.mark.anyio("asyncio")
async def test_auth_service_sign_in_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SHARELEDGER_SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY", "service-role-key")

    settings = Settings()
    service = AuthService(settings=settings)

    expected_user_id = uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path.endswith("/token")
        assert request.url.params.get("grant_type") == "password"
        payload = json.loads(request.content.decode())
        assert payload == {"email": "alice@example.com", "password": "secret123"}
        assert request.headers["apikey"] == "service-role-key"
        assert request.headers["authorization"] == "Bearer service-role-key"
        session_payload: dict[str, Any] = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": str(expected_user_id),
                "email": "alice@example.com",
                "user_metadata": {"full_name": "Alice"},
            },
        }
        return httpx.Response(200, json=session_payload)

    mock_transport = httpx.MockTransport(handler)
    service._client_factory = lambda: _build_mock_client(settings, mock_transport)

    session = await service.sign_in(email="alice@example.com", password="secret123")

    assert session.access_token == "access-token"
    assert session.refresh_token == "refresh-token"
    assert session.user.id == expected_user_id
    assert session.user.email == "alice@example.com"
    assert session.user.full_name == "Alice"


@pytest.mark.anyio("asyncio")
async def test_auth_service_sign_in_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SHARELEDGER_SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY", "service-role-key")

    settings = Settings()
    service = AuthService(settings=settings)

    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - assertion only
        return httpx.Response(
            400, json={"message": "잘못된 자격 증명입니다.", "code": "invalid_credentials"}
        )

    mock_transport = httpx.MockTransport(handler)
    service._client_factory = lambda: _build_mock_client(settings, mock_transport)

    with pytest.raises(AuthServiceError) as exc_info:
        await service.sign_in(email="alice@example.com", password="wrong")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "잘못된 자격 증명입니다."
