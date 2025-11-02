"""Supabase Auth REST 래퍼."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import httpx
from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings
from app.schemas.auth import AuthSession, SupabaseUser


class AuthServiceError(RuntimeError):
    """Supabase Auth 호출 실패."""

    def __init__(self, status_code: int, detail: str, *, code: str | None = None) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.code = code


@dataclass(slots=True)
class AuthService:
    """Supabase Auth REST API 연동."""

    settings: Settings
    _client_factory: Callable[[], httpx.AsyncClient] | None = None
    _auth_base_url: str = field(init=False)

    def __post_init__(self) -> None:
        self._auth_base_url = f"{self.settings.supabase_url.rstrip('/')}/auth/v1"

    async def sign_up(
        self, email: str, password: str, *, full_name: str | None = None
    ) -> AuthSession:
        """이메일/비밀번호 회원가입."""
        payload: dict[str, Any] = {"email": email, "password": password}
        if full_name:
            payload["data"] = {"full_name": full_name}
        response = await self._request(
            "POST", "/signup", json=payload, headers=self._service_headers()
        )
        session_payload = response.json()
        return AuthSession.from_supabase_payload(session_payload)

    async def sign_in(self, email: str, password: str) -> AuthSession:
        """이메일/비밀번호 로그인."""
        response = await self._request(
            "POST",
            "/token?grant_type=password",
            json={"email": email, "password": password},
            headers=self._service_headers(),
        )
        session_payload = response.json()
        return AuthSession.from_supabase_payload(session_payload)

    async def sign_out(self, access_token: str, refresh_token: str | None = None) -> None:
        """현재 세션을 로그아웃 처리한다."""
        headers = {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {access_token}",
        }
        json_payload = {"refresh_token": refresh_token} if refresh_token else None
        await self._request("POST", "/logout", json=json_payload, headers=headers)

    async def get_user(self, access_token: str) -> SupabaseUser:
        """Access token으로 사용자 정보를 조회한다."""
        headers = {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {access_token}",
        }
        response = await self._request("GET", "/user", headers=headers)
        return SupabaseUser.from_supabase_payload(response.json())

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        """Supabase Auth REST API에 요청을 수행한다."""
        async with self._make_client() as client:
            response = await client.request(method, path, json=json, headers=headers)

        if response.status_code >= 400:
            raise self._build_error(response)
        return response

    def _make_client(self) -> httpx.AsyncClient:
        if self._client_factory is not None:
            return self._client_factory()

        return httpx.AsyncClient(
            base_url=self._auth_base_url,
            timeout=httpx.Timeout(10.0, connect=5.0),
        )

    def _service_headers(self) -> dict[str, str]:
        return {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
        }

    def _build_error(self, response: httpx.Response) -> AuthServiceError:
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}

        detail = (
            payload.get("message") or payload.get("error") or "인증 서비스 오류가 발생했습니다."
        )
        code = payload.get("code")
        return AuthServiceError(response.status_code, detail, code=code)


async def get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    """FastAPI 의존성으로 AuthService를 제공한다."""
    return AuthService(settings=settings)


async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    auth_service: AuthService = Depends(get_auth_service),
) -> SupabaseUser:
    """요청 헤더에서 Bearer 토큰을 추출해 현재 사용자를 반환한다."""
    token = extract_bearer_token(authorization)
    try:
        return await auth_service.get_user(token)
    except AuthServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다.",
        ) from exc


def extract_bearer_token(header_value: str) -> str:
    scheme, _, token = header_value.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효한 인증 토큰이 필요합니다.",
        )
    return token
