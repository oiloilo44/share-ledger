from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """프로젝트 환경 변수 설정."""

    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8",
        env_prefix="SHARELEDGER_",
        extra="ignore",
    )

    environment: str = Field(default="development", description="실행 환경 식별자")
    supabase_url: str = Field(
        default="http://localhost:54321",
        description="Supabase 프로젝트 REST URL",
    )
    supabase_service_role_key: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-dev",
        description="Supabase Service Role 키",
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        description="허용할 CORS Origin 목록",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Settings 인스턴스를 캐시해 재사용한다."""
    return Settings()
