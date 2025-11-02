from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.auth import AuthSession, PasswordHelpResponse, SupabaseUser
from app.services.auth import (
    AuthServiceError,
    extract_bearer_token,
    get_auth_service,
    get_current_user,
)


class DummyAuthService:
    """테스트 전용 AuthService 스텁."""

    def __init__(self) -> None:
        self.sign_up_calls: list[tuple[str, str, str | None]] = []
        self.sign_in_calls: list[tuple[str, str]] = []
        self.sign_out_calls: list[tuple[str, str | None]] = []
        self.user_to_return = SupabaseUser(id=uuid4(), email="user@example.com", full_name=None)

    async def sign_up(
        self, email: str, password: str, *, full_name: str | None = None
    ) -> AuthSession:
        self.sign_up_calls.append((email, password, full_name))
        return _build_session(email=email, full_name=full_name)

    async def sign_in(self, email: str, password: str) -> AuthSession:
        self.sign_in_calls.append((email, password))
        return _build_session(email=email)

    async def sign_out(self, access_token: str, refresh_token: str | None = None) -> None:
        self.sign_out_calls.append((access_token, refresh_token))

    async def get_user(self, access_token: str) -> SupabaseUser:
        if access_token == "invalid":
            raise AuthServiceError(status_code=401, detail="invalid token")
        return self.user_to_return


def _create_app_with_service(service: DummyAuthService) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_auth_service] = lambda: service

    @app.get("/whoami")
    async def whoami(
        current_user: SupabaseUser = Depends(get_current_user),
    ) -> SupabaseUser:  # pragma: no cover - FastAPI wiring
        return current_user

    return TestClient(app)


def _build_session(email: str, full_name: str | None = None) -> AuthSession:
    return AuthSession(
        access_token="access-token",
        refresh_token="refresh-token",
        token_type="bearer",
        expires_in=3600,
        user=SupabaseUser(id=uuid4(), email=email, full_name=full_name),
    )


def test_signup_returns_session() -> None:
    client = _create_app_with_service(DummyAuthService())
    response = client.post(
        "/auth/signup",
        json={"email": "alice@example.com", "password": "secret123", "full_name": "Alice"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"] == "access-token"
    assert data["user"]["email"] == "alice@example.com"


def test_signup_propagates_service_error() -> None:
    class FailingAuthService(DummyAuthService):
        async def sign_up(self, *args: Any, **kwargs: Any) -> AuthSession:
            raise AuthServiceError(status_code=400, detail="이미 가입된 이메일입니다.")

    client = _create_app_with_service(FailingAuthService())
    response = client.post(
        "/auth/signup",
        json={"email": "alice@example.com", "password": "secret123"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "이미 가입된 이메일입니다."}


def test_login_returns_session() -> None:
    client = _create_app_with_service(DummyAuthService())
    response = client.post(
        "/auth/login",
        json={"email": "bob@example.com", "password": "secret123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "access-token"
    assert data["user"]["email"] == "bob@example.com"


def test_login_propagates_service_error() -> None:
    class FailingLoginService(DummyAuthService):
        async def sign_in(self, *args: Any, **kwargs: Any) -> AuthSession:
            raise AuthServiceError(status_code=401, detail="잘못된 자격 증명입니다.")

    client = _create_app_with_service(FailingLoginService())
    response = client.post(
        "/auth/login",
        json={"email": "bob@example.com", "password": "wrongpass"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "잘못된 자격 증명입니다."}


def test_logout_calls_service_with_tokens() -> None:
    service = DummyAuthService()
    client = _create_app_with_service(service)
    response = client.post(
        "/auth/logout",
        headers={"Authorization": "Bearer access-token"},
        json={"refresh_token": "refresh-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "로그아웃이 완료되었습니다."}
    assert service.sign_out_calls == [("access-token", "refresh-token")]


def test_logout_requires_bearer_token() -> None:
    client = _create_app_with_service(DummyAuthService())
    response = client.post(
        "/auth/logout",
        headers={"Authorization": "Token wrong"},
        json={"refresh_token": "refresh-token"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "유효한 인증 토큰이 필요합니다."}


def test_logout_propagates_service_error() -> None:
    class FailingLogoutService(DummyAuthService):
        async def sign_out(self, *args: Any, **kwargs: Any) -> None:
            raise AuthServiceError(status_code=500, detail="로그아웃 실패")

    client = _create_app_with_service(FailingLogoutService())
    response = client.post(
        "/auth/logout",
        headers={"Authorization": "Bearer access-token"},
        json={"refresh_token": "refresh-token"},
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "로그아웃 실패"}


def test_password_help_returns_fixed_message() -> None:
    client = _create_app_with_service(DummyAuthService())
    response = client.get("/auth/password-help")

    assert response.status_code == 200
    assert (
        PasswordHelpResponse(**response.json()).message
        == "관리자에게 문의해주세요: support@shareledger.app"
    )


def test_get_current_user_dependency_returns_user() -> None:
    service = DummyAuthService()
    client = _create_app_with_service(service)
    response = client.get("/whoami", headers={"Authorization": "Bearer access-token"})

    assert response.status_code == 200
    assert response.json()["email"] == service.user_to_return.email


def test_get_current_user_handles_invalid_token() -> None:
    service = DummyAuthService()
    client = _create_app_with_service(service)
    response = client.get("/whoami", headers={"Authorization": "Bearer invalid"})

    assert response.status_code == 401
    assert response.json() == {"detail": "인증이 필요합니다."}


def test_extract_bearer_token_parses_valid_header() -> None:
    token = extract_bearer_token("Bearer abc123")
    assert token == "abc123"


def test_extract_bearer_token_raises_on_invalid_header() -> None:
    with pytest.raises(HTTPException):
        extract_bearer_token("Token missing")
