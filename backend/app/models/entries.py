"""가계부 내역 및 히스토리 모델."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class Entry(BaseModel):
    """가계부 내역 단일 항목."""

    id: UUID
    book_id: UUID
    user_id: UUID
    entry_date: date
    description: str
    amount: int
    category: str | None
    end_date: date | None = None
    frequency: Literal["once", "monthly", "weekly"] = "once"
    day_of_month: int | None = None
    day_of_week: int | None = None
    created_at: datetime
    updated_at: datetime


class EntryCreate(BaseModel):
    """가계부 내역 생성 요청 본문."""

    entry_date: date
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(description="금액(단위: 원)")
    category: str | None = Field(default=None, max_length=80)
    end_date: date | None = Field(default=None, description="종료일 (반복 내역용)")
    frequency: Literal["once", "monthly", "weekly"] = Field(default="once", description="반복 주기")
    day_of_month: int | None = Field(default=None, ge=1, le=31, description="월간 반복 날짜 (1-31)")
    day_of_week: int | None = Field(
        default=None, ge=0, le=6, description="주간 반복 요일 (0=일요일, 6=토요일)"
    )

    @field_validator("amount")
    @classmethod
    def amount_must_not_be_zero(cls, v: int) -> int:
        """금액은 0이 될 수 없습니다."""
        if v == 0:
            raise ValueError("금액은 0이 될 수 없습니다")
        return v


class EntryType(str, Enum):
    """내역 유형."""

    INCOME = "income"
    EXPENSE = "expense"


class EntryUpdate(BaseModel):
    """가계부 내역 수정 요청 본문."""

    entry_date: date
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(description="금액(단위: 원)")
    category: str | None = Field(default=None, max_length=80)
    end_date: date | None = Field(default=None, description="종료일 (반복 내역용)")
    frequency: Literal["once", "monthly", "weekly"] = Field(default="once", description="반복 주기")
    day_of_month: int | None = Field(default=None, ge=1, le=31, description="월간 반복 날짜 (1-31)")
    day_of_week: int | None = Field(
        default=None, ge=0, le=6, description="주간 반복 요일 (0=일요일, 6=토요일)"
    )

    @field_validator("amount")
    @classmethod
    def amount_must_not_be_zero(cls, v: int) -> int:
        """금액은 0이 될 수 없습니다."""
        if v == 0:
            raise ValueError("금액은 0이 될 수 없습니다")
        return v


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


class EntryStatsSummary(BaseModel):
    """내역 통계 요약 카드."""

    total_income: int
    total_expense: int
    net_amount: int


class EntryStatsCategory(BaseModel):
    """카테고리별 지표."""

    category: str
    amount: int
    ratio: float


class EntryStatsTrendPoint(BaseModel):
    """월별 추이 포인트."""

    period: date
    income: int
    expense: int


class EntryStatsTopEntry(BaseModel):
    """상위 지출 항목."""

    id: UUID
    description: str
    amount: int
    entry_date: date
    category: str | None


class EntryStats(BaseModel):
    """분석 대시보드 응답."""

    summary: EntryStatsSummary
    category_distribution: list[EntryStatsCategory]
    trend: list[EntryStatsTrendPoint]
    top_expenses: list[EntryStatsTopEntry]
    total_entries: int


class EntryBulkImportRequest(BaseModel):
    """일괄 업로드 요청."""

    rows: list[EntryCreate] = Field(min_length=1, description="업로드할 내역 목록")


class EntryBulkImportResultItem(BaseModel):
    """일괄 업로드 결과 행."""

    index: int
    success: bool
    entry: Entry | None = None
    error: str | None = None


class EntryBulkImportResult(BaseModel):
    """일괄 업로드 결과."""

    total: int
    success_count: int
    failure_count: int
    rows: list[EntryBulkImportResultItem]
