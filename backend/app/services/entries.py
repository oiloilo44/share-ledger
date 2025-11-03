"""가계부 내역 및 히스토리 서비스."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from app.db import get_supabase_client
from app.models import (
    BookRole,
    Entry,
    EntryCreate,
    EntryHistoryAction,
    EntryHistoryItem,
    EntryUpdate,
)
from app.schemas.auth import SupabaseUser

logger = logging.getLogger("shareledger.services.entries")


class EntryServiceError(RuntimeError):
    """엔트리 서비스 예외."""

    def __init__(self, detail: str, *, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass(slots=True)
class EntryService:
    """Supabase 기반 내역 및 수정 이력 서비스."""

    client: Client

    async def list_entries(self, book_id: UUID, user: SupabaseUser) -> list[Entry]:
        """가계부 내역 목록을 반환한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            rows = await asyncio.to_thread(self._list_entries_sync, book_id)
        except PostgrestAPIError as exc:  # pragma: no cover - 로컬 재현 어려움
            raise self._convert_error(exc) from exc
        return [self._row_to_entry(row) for row in rows]

    async def get_entry(self, book_id: UUID, entry_id: UUID, user: SupabaseUser) -> Entry:
        """단일 내역을 반환한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            row = await asyncio.to_thread(self._get_entry_sync, book_id, entry_id)
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc
        if row is None:
            raise EntryServiceError(
                "존재하지 않는 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return self._row_to_entry(row)

    async def create_entry(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: EntryCreate,
    ) -> Entry:
        """내역을 생성하고 히스토리를 기록한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            row = await asyncio.to_thread(
                self._create_entry_with_history_sync,
                book_id,
                user.id,
                payload,
            )
        except EntryServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="entry_created",
            entity="entry",
            data={"id": str(entry.id)},
        )
        return entry

    async def update_entry(
        self,
        book_id: UUID,
        entry_id: UUID,
        user: SupabaseUser,
        payload: EntryUpdate,
    ) -> Entry:
        """내역을 수정하고 변경 전 상태를 히스토리에 기록한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            row = await asyncio.to_thread(
                self._update_entry_with_history_sync,
                book_id,
                entry_id,
                user.id,
                payload,
            )
        except EntryServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="entry_updated",
            entity="entry",
            data={"id": str(entry.id)},
        )
        return entry

    async def delete_entry(self, book_id: UUID, entry_id: UUID, user: SupabaseUser) -> None:
        """내역을 삭제하고 삭제 전 상태를 히스토리에 기록한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            row = await asyncio.to_thread(
                self._delete_entry_with_history_sync,
                book_id,
                entry_id,
                user.id,
            )
        except EntryServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        if row is None:
            raise EntryServiceError(
                "존재하지 않는 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        await self._emit_book_event(
            UUID(row["book_id"]),
            action="entry_deleted",
            entity="entry",
            data={"id": row["id"]},
        )

    async def list_history(self, book_id: UUID, user: SupabaseUser) -> list[EntryHistoryItem]:
        """가계부 내역 히스토리를 최신순으로 반환한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            rows = await asyncio.to_thread(self._list_history_sync, book_id)
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc
        return [self._row_to_history(row) for row in rows]

    async def revert_history(self, history_id: UUID, user: SupabaseUser) -> Entry:
        """히스토리 스냅샷으로 되돌린다."""
        history_row = await asyncio.to_thread(self._get_history_meta_sync, history_id)
        if history_row is None:
            raise EntryServiceError(
                "존재하지 않는 히스토리 항목입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        book_id = UUID(history_row["book_id"])
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)

        try:
            row = await asyncio.to_thread(
                self._restore_entry_from_history_sync,
                history_id,
                user.id,
            )
        except EntryServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        entry = self._row_to_entry(row)
        await self._emit_book_event(
            entry.book_id,
            action="entry_restored",
            entity="entry",
            data={"id": str(entry.id), "history_id": str(history_id)},
        )
        return entry

    # ----- 동기 헬퍼 메서드 -----

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
            raise EntryServiceError(
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
            raise EntryServiceError(
                "해당 가계부에 대한 권한이 없습니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return BookRole(membership_data[0]["role"])

    def _list_entries_sync(self, book_id: UUID) -> list[dict[str, Any]]:
        response = (
            self.client.table("entries")
            .select("*")
            .eq("book_id", str(book_id))
            .order("entry_date", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    def _get_entry_sync(self, book_id: UUID, entry_id: UUID) -> dict[str, Any] | None:
        response = (
            self.client.table("entries")
            .select("*")
            .eq("book_id", str(book_id))
            .eq("id", str(entry_id))
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def _create_entry_with_history_sync(
        self,
        book_id: UUID,
        user_id: UUID,
        payload: EntryCreate,
    ) -> dict[str, Any]:
        response = self.client.rpc(
            "create_entry_with_history",
            {
                "p_book_id": str(book_id),
                "p_user_id": str(user_id),
                "p_entry_date": payload.entry_date.isoformat(),
                "p_description": payload.description,
                "p_amount": str(payload.amount),
                "p_category": self._normalize_category(payload.category),
            },
        ).execute()
        data = response.data
        if not data:
            raise EntryServiceError(
                "내역 생성에 실패했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return self._ensure_json_object(data)

    def _update_entry_with_history_sync(
        self,
        book_id: UUID,
        entry_id: UUID,
        user_id: UUID,
        payload: EntryUpdate,
    ) -> dict[str, Any]:
        response = self.client.rpc(
            "update_entry_with_history",
            {
                "p_entry_id": str(entry_id),
                "p_book_id": str(book_id),
                "p_user_id": str(user_id),
                "p_entry_date": payload.entry_date.isoformat(),
                "p_description": payload.description,
                "p_amount": str(payload.amount),
                "p_category": self._normalize_category(payload.category),
            },
        ).execute()
        data = response.data
        if not data:
            raise EntryServiceError(
                "존재하지 않는 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return self._ensure_json_object(data)

    def _delete_entry_with_history_sync(
        self,
        book_id: UUID,
        entry_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any] | None:
        response = self.client.rpc(
            "delete_entry_with_history",
            {
                "p_entry_id": str(entry_id),
                "p_book_id": str(book_id),
                "p_user_id": str(user_id),
            },
        ).execute()
        data = response.data
        if not data:
            return None
        return self._ensure_json_object(data)

    def _list_history_sync(self, book_id: UUID) -> list[dict[str, Any]]:
        response = (
            self.client.table("entry_history")
            .select("*")
            .eq("book_id", str(book_id))
            .order("changed_at", desc=True)
            .limit(100)
            .execute()
        )
        return response.data or []

    def _get_history_meta_sync(self, history_id: UUID) -> dict[str, Any] | None:
        response = (
            self.client.table("entry_history")
            .select("id, book_id")
            .eq("id", str(history_id))
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def _restore_entry_from_history_sync(
        self,
        history_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any]:
        response = self.client.rpc(
            "restore_entry_from_history",
            {
                "p_history_id": str(history_id),
                "p_user_id": str(user_id),
            },
        ).execute()
        data = response.data
        if not data:
            raise EntryServiceError(
                "복원 가능한 내역이 없습니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return self._ensure_json_object(data)

    def _ensure_json_object(self, data: Any) -> dict[str, Any]:
        if isinstance(data, dict):
            return data
        if isinstance(data, list) and data:
            first = data[0]
            if isinstance(first, dict):
                return first
        raise EntryServiceError(
            "Supabase 응답 형식이 올바르지 않습니다.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def _row_to_entry(self, row: dict[str, Any]) -> Entry:
        return Entry(
            id=UUID(row["id"]),
            book_id=UUID(row["book_id"]),
            user_id=UUID(row["user_id"]),
            entry_date=self._parse_date(row["entry_date"]),
            description=row["description"],
            amount=self._parse_amount(row["amount"]),
            category=row.get("category"),
            created_at=self._parse_datetime(row["created_at"]),
            updated_at=self._parse_datetime(row["updated_at"]),
        )

    def _row_to_history(self, row: dict[str, Any]) -> EntryHistoryItem:
        snapshot = row.get("snapshot") or {}
        if isinstance(snapshot, str):
            try:
                snapshot = json.loads(snapshot)
            except json.JSONDecodeError:  # pragma: no cover - 방어적
                snapshot = {}

        entry_id_value = row.get("entry_id")
        changed_by_value = row.get("changed_by")
        return EntryHistoryItem(
            id=UUID(row["id"]),
            entry_id=UUID(entry_id_value) if entry_id_value else None,
            book_id=UUID(row["book_id"]),
            changed_by=UUID(changed_by_value) if changed_by_value else None,
            changed_at=self._parse_datetime(row["changed_at"]),
            action_type=EntryHistoryAction(row["action_type"]),
            snapshot=snapshot,
        )

    async def _emit_book_event(
        self,
        book_id: UUID,
        *,
        action: str,
        entity: str,
        data: dict[str, Any],
    ) -> None:
        payload = json.dumps({"action": action, "entity": entity, "data": data}, ensure_ascii=False)
        channel = f"realtime:books:{book_id}"

        def _notify() -> None:
            self.client.rpc("pg_notify", {"channel": channel, "payload": payload}).execute()

        try:
            await asyncio.to_thread(_notify)
        except PostgrestAPIError as exc:  # pragma: no cover - 로깅만 수행
            logger.warning(
                "pg_notify 실패 book_id=%s action=%s code=%s message=%s",
                book_id,
                action,
                getattr(exc, "code", None),
                getattr(exc, "message", None),
            )
        except Exception:  # pragma: no cover - 로깅만 수행
            logger.warning(
                "pg_notify 실패 book_id=%s action=%s",
                book_id,
                action,
                exc_info=True,
            )

    def _parse_datetime(self, value: str | datetime) -> datetime:
        if isinstance(value, datetime):
            return value
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)

    def _parse_date(self, value: str | date | datetime) -> date:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return datetime.fromisoformat(f"{value}T00:00:00").date()

    def _parse_amount(self, value: Any) -> int:
        decimal_value = Decimal(str(value))
        if decimal_value != decimal_value.to_integral_value():
            raise EntryServiceError(
                "금액은 정수여야 합니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return int(decimal_value)

    def _normalize_category(self, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    def _convert_error(self, exc: PostgrestAPIError) -> EntryServiceError:
        message = getattr(exc, "message", None) or "요청 처리 중 오류가 발생했습니다."
        details = getattr(exc, "details", "") or ""
        combined = f"{message} {details}".strip()
        code = getattr(exc, "code", "")

        if code == "P0002" or "존재하지 않는 내역" in combined:
            return EntryServiceError(
                "존재하지 않는 내역입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if code == "23514" and "amount" in details:
            return EntryServiceError(
                "금액은 0이 될 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        logger.error("Supabase 오류 code=%s message=%s details=%s", code, message, details)
        return EntryServiceError(
            "내역 처리 중 오류가 발생했습니다.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


async def get_entry_service(client: Client = Depends(get_supabase_client)) -> EntryService:
    """FastAPI 의존성으로 EntryService를 제공한다."""
    return EntryService(client=client)


def raise_entry_http_exception(error: EntryServiceError) -> None:
    """EntryServiceError를 FastAPI HTTPException으로 변환한다."""
    raise HTTPException(status_code=error.status_code, detail=error.detail)
