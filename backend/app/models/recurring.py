"""반복 내역 모델."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class RecurringFrequency(str, Enum):
    """반복 주기."""

    WEEKLY = "weekly"
    MONTHLY = "monthly"


class RecurringEntryBase(BaseModel):
    """반복 내역 공통 필드."""

    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(description="금액(정수)")
    category: str | None = Field(default=None, max_length=80)
    frequency: RecurringFrequency
    day_of_month: int | None = Field(
        default=None,
        ge=1,
        le=31,
        description="월 반복 시 사용 (1~31)",
    )
    day_of_week: int | None = Field(
        default=None,
        ge=0,
        le=6,
        description="주 반복 시 사용 (0=일요일)",
    )
    start_date: date
    end_date: date | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: int) -> int:
        if value == 0:
            raise ValueError("금액은 0이 될 수 없습니다.")
        return value

    @model_validator(mode="after")
    def validate_schedule(self) -> RecurringEntryBase:
        if self.frequency == RecurringFrequency.MONTHLY:
            if self.day_of_month is None:
                raise ValueError("월 반복은 day_of_month가 필요합니다.")
            self.day_of_week = None
        elif self.frequency == RecurringFrequency.WEEKLY:
            if self.day_of_week is None:
                raise ValueError("주 반복은 day_of_week가 필요합니다.")
            self.day_of_month = None

        if self.end_date and self.end_date < self.start_date:
            raise ValueError("종료일은 시작일 이후여야 합니다.")
        return self


class RecurringEntryCreate(RecurringEntryBase):
    """반복 내역 생성 요청."""


class RecurringEntryUpdate(RecurringEntryBase):
    """반복 내역 수정 요청."""


class RecurringEntry(RecurringEntryBase):
    """반복 내역 응답."""

    id: UUID
    book_id: UUID
    user_id: UUID
    last_created_date: date | None = None
    created_at: datetime
    updated_at: datetime
    next_occurrence: date | None = None
    is_active: bool = True
