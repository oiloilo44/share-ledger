"""반복 내역 서비스."""

from __future__ import annotations

import asyncio
import json
import logging
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends, status
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from app.db import get_supabase_client
from app.models import (
    BookRole,
    RecurringEntry,
    RecurringEntryCreate,
    RecurringEntryUpdate,
    RecurringFrequency,
)
from app.schemas.auth import SupabaseUser

logger = logging.getLogger("shareledger.services.recurring")


class RecurringServiceError(RuntimeError):
    """반복 내역 서비스 예외."""

    def __init__(self, detail: str, *, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass(slots=True)
class RecurringService:
    """Supabase 기반 반복 내역 서비스."""

    client: Client

    async def list_recurring(self, book_id: UUID, user: SupabaseUser) -> list[RecurringEntry]:
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        rows = await asyncio.to_thread(self._list_recurring_sync, book_id)
        return [self._row_to_entry(row) for row in rows]

    async def create_recurring(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: RecurringEntryCreate,
    ) -> RecurringEntry:
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            row = await asyncio.to_thread(self._create_recurring_sync, book_id, user.id, payload)
        except PostgrestAPIError as exc:  # pragma: no cover - 네트워크 예외
            raise self._convert_error(exc) from exc
        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="recurring_created",
            data={"id": str(entry.id)},
        )
        return entry

    async def update_recurring(
        self,
        recurring_id: UUID,
        user: SupabaseUser,
        payload: RecurringEntryUpdate,
    ) -> RecurringEntry:
        meta = await asyncio.to_thread(self._get_recurring_meta_sync, recurring_id)
        if meta is None:
            raise RecurringServiceError(
                "존재하지 않는 반복 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        book_id = UUID(meta["book_id"])
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)

        try:
            row = await asyncio.to_thread(self._update_recurring_sync, recurring_id, payload)
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="recurring_updated",
            data={"id": str(entry.id)},
        )
        return entry

    async def retry_recurring(self, recurring_id: UUID, user: SupabaseUser) -> RecurringEntry:
        meta = await asyncio.to_thread(self._get_recurring_meta_sync, recurring_id)
        if meta is None:
            raise RecurringServiceError(
                "존재하지 않는 반복 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        book_id = UUID(meta["book_id"])
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)

        try:
            row = await asyncio.to_thread(self._retry_recurring_sync, recurring_id, date.today())
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="recurring_retry",
            data={"id": str(entry.id)},
        )
        return entry

    async def delete_recurring(self, recurring_id: UUID, user: SupabaseUser) -> None:
        meta = await asyncio.to_thread(self._get_recurring_meta_sync, recurring_id)
        if meta is None:
            raise RecurringServiceError(
                "존재하지 않는 반복 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        book_id = UUID(meta["book_id"])
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)

        try:
            await asyncio.to_thread(self._delete_recurring_sync, recurring_id)
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        await self._emit_book_event(
            book_id,
            action="recurring_deleted",
            data={"id": str(recurring_id)},
        )

    # ----- 동기 헬퍼 -----

    def _require_membership_sync(self, book_id: UUID, user_id: UUID) -> BookRole:
        response = (
            self.client.table("account_books")
            .select("owner_id")
            .eq("id", str(book_id))
            .limit(1)
            .execute()
        )
        data = response.data or []
        if not data:
            raise RecurringServiceError(
                "존재하지 않는 가계부입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        row = data[0]
        if row["owner_id"] == str(user_id):
            return BookRole.OWNER

        membership_resp = (
            self.client.table("book_members")
            .select("role")
            .eq("book_id", str(book_id))
            .eq("user_id", str(user_id))
            .limit(1)
            .execute()
        )
        membership_data = membership_resp.data or []
        if not membership_data:
            raise RecurringServiceError(
                "해당 가계부에 대한 권한이 없습니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return BookRole(membership_data[0]["role"])

    def _list_recurring_sync(self, book_id: UUID) -> list[dict[str, Any]]:
        response = (
            self.client.table("recurring_entries")
            .select("*")
            .eq("book_id", str(book_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    def _create_recurring_sync(
        self,
        book_id: UUID,
        user_id: UUID,
        payload: RecurringEntryCreate,
    ) -> dict[str, Any]:
        data = {
            "book_id": str(book_id),
            "user_id": str(user_id),
            "description": payload.description,
            "amount": str(payload.amount),
            "category": payload.category,
            "frequency": payload.frequency.value,
            "day_of_month": payload.day_of_month,
            "day_of_week": payload.day_of_week,
            "start_date": payload.start_date.isoformat(),
            "end_date": payload.end_date.isoformat() if payload.end_date else None,
        }
        response = self.client.table("recurring_entries").insert(data).execute()
        rows = response.data or []
        if not rows:
            raise RecurringServiceError(
                "반복 내역 생성에 실패했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return rows[0]

    def _update_recurring_sync(
        self,
        recurring_id: UUID,
        payload: RecurringEntryUpdate,
    ) -> dict[str, Any]:
        update_data = {
            "description": payload.description,
            "amount": str(payload.amount),
            "category": payload.category,
            "frequency": payload.frequency.value,
            "day_of_month": payload.day_of_month,
            "day_of_week": payload.day_of_week,
            "start_date": payload.start_date.isoformat(),
            "end_date": payload.end_date.isoformat() if payload.end_date else None,
        }
        response = (
            self.client.table("recurring_entries")
            .update(update_data)
            .eq("id", str(recurring_id))
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise RecurringServiceError(
                "존재하지 않는 반복 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return rows[0]

    def _retry_recurring_sync(self, recurring_id: UUID, as_of: date) -> dict[str, Any]:
        response = (
            self.client.table("recurring_entries")
            .update({"last_created_date": as_of.isoformat()})
            .eq("id", str(recurring_id))
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise RecurringServiceError(
                "존재하지 않는 반복 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return rows[0]

    def _delete_recurring_sync(self, recurring_id: UUID) -> None:
        self.client.table("recurring_entries").delete().eq("id", str(recurring_id)).execute()

    def _get_recurring_meta_sync(self, recurring_id: UUID) -> dict[str, Any] | None:
        response = (
            self.client.table("recurring_entries")
            .select("id, book_id")
            .eq("id", str(recurring_id))
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0] if rows else None

    def _row_to_entry(self, row: dict[str, Any]) -> RecurringEntry:
        entry = RecurringEntry(
            id=UUID(row["id"]),
            book_id=UUID(row["book_id"]),
            user_id=UUID(row["user_id"]),
            description=row["description"],
            amount=self._parse_amount(row["amount"]),
            category=row.get("category"),
            frequency=RecurringFrequency(row["frequency"]),
            day_of_month=row.get("day_of_month"),
            day_of_week=row.get("day_of_week"),
            start_date=self._parse_date(row["start_date"]),
            end_date=self._parse_optional_date(row.get("end_date")),
            last_created_date=self._parse_optional_date(row.get("last_created_date")),
            created_at=self._parse_datetime(row["created_at"]),
            updated_at=self._parse_datetime(row["updated_at"]),
            next_occurrence=None,
            is_active=True,
        )
        next_occurrence = self._calculate_next_occurrence(entry)
        is_active = self._is_active(entry, next_occurrence)
        return entry.model_copy(update={"next_occurrence": next_occurrence, "is_active": is_active})

    def _is_active(self, entry: RecurringEntry, next_occurrence: date | None) -> bool:
        if entry.end_date and entry.end_date < date.today():
            return False
        return next_occurrence is not None

    def _calculate_next_occurrence(self, entry: RecurringEntry) -> date | None:
        if entry.last_created_date is None:
            candidate = self._align_first_occurrence(entry.start_date, entry)
        else:
            candidate = self._advance_from(entry.last_created_date, entry)

        while candidate < date.today():
            candidate = self._advance_from(candidate, entry)

        if entry.end_date and candidate > entry.end_date:
            return None
        return candidate

    def _align_first_occurrence(self, start: date, entry: RecurringEntry) -> date:
        if entry.frequency == RecurringFrequency.MONTHLY:
            day = entry.day_of_month or entry.start_date.day
            year = start.year
            month = start.month
            if start.day > day:
                month += 1
                if month > 12:
                    month = 1
                    year += 1
            last_day = monthrange(year, month)[1]
            day = min(day, last_day)
            return date(year, month, day)

        python_target = self._to_python_weekday(entry.day_of_week or start.weekday())
        delta = (python_target - start.weekday()) % 7
        return start + timedelta(days=delta)

    def _advance_from(self, current: date, entry: RecurringEntry) -> date:
        if entry.frequency == RecurringFrequency.MONTHLY:
            day = entry.day_of_month or entry.start_date.day
            year = current.year
            month = current.month
            if current.day >= day:
                month += 1
                if month > 12:
                    month = 1
                    year += 1
            else:
                # 동일 월 내 다음 스케줄
                pass
            last_day = monthrange(year, month)[1]
            day = min(day, last_day)
            candidate = date(year, month, day)
            if candidate <= current:
                # 안전장치: 다음 달로 이동
                month += 1
                if month > 12:
                    month = 1
                    year += 1
                last_day = monthrange(year, month)[1]
                day = min(day, last_day)
                candidate = date(year, month, day)
            return candidate

        python_target = self._to_python_weekday(entry.day_of_week or entry.start_date.weekday())
        delta = (python_target - current.weekday()) % 7
        if delta == 0:
            delta = 7
        return current + timedelta(days=delta)

    def _to_python_weekday(self, supabase_day: int) -> int:
        return (supabase_day + 6) % 7

    def _parse_amount(self, value: Any) -> int:
        decimal_value = Decimal(str(value))
        if decimal_value != decimal_value.to_integral_value():
            raise RecurringServiceError(
                "금액은 정수여야 합니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return int(decimal_value)

    def _parse_datetime(self, value: str | datetime) -> datetime:
        if isinstance(value, datetime):
            return value
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)

    def _parse_date(self, value: str | date | datetime) -> date:
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        return datetime.fromisoformat(f"{value}T00:00:00").date()

    def _parse_optional_date(self, value: Any) -> date | None:
        if value is None:
            return None
        return self._parse_date(value)

    def _convert_error(self, exc: PostgrestAPIError) -> RecurringServiceError:
        message = getattr(exc, "message", None) or "요청 처리 중 오류가 발생했습니다."
        details = getattr(exc, "details", "") or ""
        combined = f"{message} {details}".strip()
        code = getattr(exc, "code", "")

        if code == "23514":
            return RecurringServiceError(
                "입력한 값이 허용 범위를 벗어났습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if code == "P0001" and "conflict" in combined.lower():
            return RecurringServiceError(
                "동일한 일정의 반복 내역이 이미 존재합니다.",
                status_code=status.HTTP_409_CONFLICT,
            )

        logger.error(
            "Supabase 오류 code=%s message=%s details=%s",
            code,
            message,
            details,
        )
        return RecurringServiceError(
            "반복 내역 처리 중 오류가 발생했습니다.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    async def _emit_book_event(
        self,
        book_id: UUID,
        *,
        action: str,
        data: dict[str, Any],
    ) -> None:
        payload = {"action": action, "entity": "recurring", "data": data}

        def _notify() -> None:
            self.client.rpc(
                "pg_notify",
                {"channel": f"realtime:books:{book_id}", "payload": json_dumps(payload)},
            ).execute()

        try:
            await asyncio.to_thread(_notify)
        except PostgrestAPIError as exc:  # pragma: no cover - 로깅만
            logger.warning(
                "pg_notify 실패 book_id=%s action=%s code=%s message=%s",
                book_id,
                action,
                getattr(exc, "code", None),
                getattr(exc, "message", None),
            )
        except Exception:  # pragma: no cover - 로깅만
            logger.warning(
                "pg_notify 실패 book_id=%s action=%s",
                book_id,
                action,
                exc_info=True,
            )


def json_dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False)


async def get_recurring_service(client: Client = Depends(get_supabase_client)) -> RecurringService:
    """FastAPI 의존성으로 RecurringService를 제공한다."""
    return RecurringService(client=client)


def raise_recurring_http_exception(error: RecurringServiceError) -> None:
    """RecurringServiceError를 FastAPI HTTPException으로 변환한다."""
    from fastapi import HTTPException

    raise HTTPException(status_code=error.status_code, detail=error.detail)
