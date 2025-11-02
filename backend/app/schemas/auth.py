"""인증 관련 Pydantic 스키마."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class SupabaseUser(BaseModel):
    """Supabase 인증 사용자 정보."""

    id: UUID
    email: EmailStr | None = None
    full_name: str | None = None

    @classmethod
    def from_supabase_payload(cls, payload: dict[str, Any]) -> SupabaseUser:
        """Supabase Auth API 응답을 내부 모델로 변환한다."""
        metadata = payload.get("user_metadata") or {}
        return cls(
            id=payload["id"],
            email=payload.get("email"),
            full_name=metadata.get("full_name"),
        )


class AuthSession(BaseModel):
    """Supabase Auth 세션 토큰."""

    access_token: str = Field(..., alias="access_token")
    refresh_token: str | None = Field(default=None, alias="refresh_token")
    token_type: str = Field(default="bearer", alias="token_type")
    expires_in: int | None = Field(default=None, alias="expires_in")
    user: SupabaseUser

    @classmethod
    def from_supabase_payload(cls, payload: dict[str, Any]) -> AuthSession:
        """Supabase Auth API 세션 응답을 내부 모델로 변환한다."""
        user_payload = payload.get("user") or {}
        return cls(
            access_token=payload.get("access_token") or "",
            refresh_token=payload.get("refresh_token"),
            token_type=payload.get("token_type") or "bearer",
            expires_in=payload.get("expires_in"),
            user=SupabaseUser.from_supabase_payload(user_payload),
        )


class SignUpRequest(BaseModel):
    """회원가입 요청 본문."""

    email: EmailStr
    password: SecretStr = Field(..., min_length=6, max_length=72)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("full_name")
    @classmethod
    def strip_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class SignInRequest(BaseModel):
    """로그인 요청 본문."""

    email: EmailStr
    password: SecretStr = Field(..., min_length=6, max_length=72)


class SignOutRequest(BaseModel):
    """로그아웃 요청 본문."""

    refresh_token: str | None = None


class PasswordHelpResponse(BaseModel):
    """비밀번호 도움말 응답."""

    message: str
