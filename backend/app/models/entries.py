"""가계부 내역 및 히스토리 모델."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class Entry(BaseModel):
    """가계부 내역 단일 항목."""

    id: UUID
    book_id: UUID
    user_id: UUID
    entry_date: date
    description: str
    amount: int
    category: str | None
    created_at: datetime
    updated_at: datetime


class EntryCreate(BaseModel):
    """가계부 내역 생성 요청 본문."""

    entry_date: date
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(description="금액(단위: 원)", ne=0)
    category: str | None = Field(default=None, max_length=80)


class EntryUpdate(BaseModel):
    """가계부 내역 수정 요청 본문."""

    entry_date: date
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(description="금액(단위: 원)", ne=0)
    category: str | None = Field(default=None, max_length=80)


class EntryHistoryAction(str, Enum):
    """히스토리 액션 종류."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    RESTORED = "restored"


class EntryHistoryItem(BaseModel):
    """가계부 내역 변경 이력 항목."""

    id: UUID
    entry_id: UUID | None
    book_id: UUID
    changed_by: UUID | None
    changed_at: datetime
    action_type: EntryHistoryAction
    snapshot: dict[str, Any]
