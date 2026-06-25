"""가계부 및 멤버 관련 Pydantic 모델."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class BookRole(str, Enum):
    """가계부 멤버 역할."""

    OWNER = "owner"
    EDITOR = "editor"


class Book(BaseModel):
    """가계부 단일 항목."""

    id: UUID
    owner_id: UUID
    name: str
    created_at: datetime
    updated_at: datetime


class BookListItem(Book):
    """목록 조회 응답."""

    current_role: BookRole


class BookCreate(BaseModel):
    """가계부 생성 요청."""

    name: str = Field(min_length=1, max_length=80)


class BookUpdate(BaseModel):
    """가계부 수정 요청."""

    name: str = Field(min_length=1, max_length=80)


class BookMember(BaseModel):
    """가계부 멤버 정보."""

    book_id: UUID
    user_id: UUID
    email: EmailStr
    full_name: str | None
    role: BookRole
    joined_at: datetime


class BookMemberInvite(BaseModel):
    """멤버 초대 요청."""

    email: EmailStr
    role: BookRole = BookRole.EDITOR


class BookMemberUpdate(BaseModel):
    """멤버 역할 수정 요청."""

    role: BookRole
