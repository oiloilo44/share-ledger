"""가계부 내역 및 히스토리 서비스."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from app.db import get_supabase_client
from app.models import (
    BookRole,
    Entry,
    EntryBulkImportResult,
    EntryBulkImportResultItem,
    EntryCreate,
    EntryHistoryAction,
    EntryHistoryItem,
    EntryStats,
    EntryStatsCategory,
    EntryStatsSummary,
    EntryStatsTopEntry,
    EntryStatsTrendPoint,
    EntryType,
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
class EntryListFilters:
    """내역 목록 필터."""

    from_date: date | None = None
    to_date: date | None = None
    categories: tuple[str, ...] = tuple()
    member_ids: tuple[UUID, ...] = tuple()
    min_amount: int | None = None
    max_amount: int | None = None
    entry_type: EntryType | None = None
    search: str | None = None
    include_uncategorized: bool = False


@dataclass(slots=True)
class EntryStatsParams:
    """통계 조회 파라미터."""

    start_date: date | None = None
    end_date: date | None = None
    top_limit: int = 5


@dataclass(slots=True)
class EntryService:
    """Supabase 기반 내역 및 수정 이력 서비스."""

    client: Client

    async def list_entries(
        self,
        book_id: UUID,
        user: SupabaseUser,
        filters: EntryListFilters | None = None,
    ) -> list[Entry]:
        """가계부 내역 목록을 반환한다."""
        filters = filters or EntryListFilters()
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        try:
            rows = await asyncio.to_thread(self._list_entries_sync, book_id, filters)
        except PostgrestAPIError as exc:  # pragma: no cover - 로컬 재현 어려움
            raise self._convert_error(exc) from exc
        entries = [self._row_to_entry(row) for row in rows]
        if filters.categories or filters.include_uncategorized:
            entries = self._filter_by_categories(
                entries, filters.categories, filters.include_uncategorized
            )
        return entries

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

    async def bulk_import_entries(
        self,
        book_id: UUID,
        user: SupabaseUser,
        rows: Sequence[EntryCreate],
    ) -> EntryBulkImportResult:
        """내역을 일괄 업로드한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)

        results: list[EntryBulkImportResultItem] = []
        success_count = 0
        for index, payload in enumerate(rows):
            try:
                row = await asyncio.to_thread(
                    self._create_entry_with_history_sync,
                    book_id,
                    user.id,
                    payload,
                )
                entry = self._row_to_entry(row)
                success_count += 1
                results.append(EntryBulkImportResultItem(index=index, success=True, entry=entry))
                await self._emit_book_event(
                    entry.book_id,
                    action="entry_imported",
                    entity="entry",
                    data={"id": str(entry.id)},
                )
            except EntryServiceError as exc:
                results.append(
                    EntryBulkImportResultItem(index=index, success=False, error=exc.detail)
                )
            except PostgrestAPIError as exc:  # pragma: no cover - 네트워크 예외
                converted = self._convert_error(exc)
                results.append(
                    EntryBulkImportResultItem(index=index, success=False, error=converted.detail)
                )

        total = len(rows)
        failure_count = total - success_count
        return EntryBulkImportResult(
            total=total,
            success_count=success_count,
            failure_count=failure_count,
            rows=results,
        )

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

    async def get_stats(
        self,
        book_id: UUID,
        user: SupabaseUser,
        params: EntryStatsParams,
    ) -> EntryStats:
        """가계부 통계 데이터를 반환한다."""
        filters = EntryListFilters(
            from_date=params.start_date,
            to_date=params.end_date,
        )
        entries = await self.list_entries(book_id, user, filters)
        return self._build_stats(entries, params)

    def _build_stats(self, entries: Sequence[Entry], params: EntryStatsParams) -> EntryStats:
        summary = self._calculate_summary(entries)
        category_distribution = self._calculate_category_distribution(
            entries, summary.total_expense
        )
        trend = self._calculate_trend(entries, params.start_date, params.end_date)
        top_expenses = self._calculate_top_expenses(entries, params.top_limit)
        return EntryStats(
            summary=summary,
            category_distribution=category_distribution,
            trend=trend,
            top_expenses=top_expenses,
            total_entries=len(entries),
        )

    def _calculate_summary(self, entries: Sequence[Entry]) -> EntryStatsSummary:
        total_income = sum(entry.amount for entry in entries if entry.amount > 0)
        total_expense = sum(-entry.amount for entry in entries if entry.amount < 0)
        net_amount = total_income - total_expense
        return EntryStatsSummary(
            total_income=total_income,
            total_expense=total_expense,
            net_amount=net_amount,
        )

    def _calculate_category_distribution(
        self,
        entries: Sequence[Entry],
        total_expense: int,
    ) -> list[EntryStatsCategory]:
        if not entries or total_expense <= 0:
            return []

        buckets: dict[str, int] = defaultdict(int)
        for entry in entries:
            if entry.amount >= 0:
                continue
            category = entry.category or "미분류"
            buckets[category] += -entry.amount

        if not buckets:
            return []

        distribution: list[EntryStatsCategory] = []
        for category, amount in sorted(buckets.items(), key=lambda item: item[1], reverse=True):
            ratio = amount / total_expense if total_expense else 0
            distribution.append(
                EntryStatsCategory(
                    category=category,
                    amount=amount,
                    ratio=round(ratio, 4),
                )
            )
        return distribution

    def _calculate_trend(
        self,
        entries: Sequence[Entry],
        start_date: date | None,
        end_date: date | None,
    ) -> list[EntryStatsTrendPoint]:
        if not entries:
            return []

        buckets: dict[date, dict[str, int]] = defaultdict(lambda: {"income": 0, "expense": 0})
        for entry in entries:
            period = entry.entry_date.replace(day=1)
            if entry.amount >= 0:
                buckets[period]["income"] += entry.amount
            else:
                buckets[period]["expense"] += -entry.amount

        min_date = start_date or min(entry.entry_date for entry in entries)
        max_date = end_date or max(entry.entry_date for entry in entries)
        current = min_date.replace(day=1)
        last = max_date.replace(day=1)

        trend: list[EntryStatsTrendPoint] = []
        while current <= last:
            bucket = buckets.get(current, {"income": 0, "expense": 0})
            trend.append(
                EntryStatsTrendPoint(
                    period=current,
                    income=bucket["income"],
                    expense=bucket["expense"],
                )
            )
            current = self._add_month(current)
        return trend

    def _calculate_top_expenses(
        self,
        entries: Sequence[Entry],
        limit: int,
    ) -> list[EntryStatsTopEntry]:
        if not entries or limit <= 0:
            return []

        expenses = [entry for entry in entries if entry.amount < 0]
        expenses.sort(key=lambda entry: entry.amount)  # 금액은 음수, 절댓값 큰 순으로 정렬
        top_items = expenses[:limit]

        return [
            EntryStatsTopEntry(
                id=item.id,
                description=item.description,
                amount=-item.amount,
                entry_date=item.entry_date,
                category=item.category,
            )
            for item in top_items
        ]

    def _add_month(self, value: date) -> date:
        year = value.year + (1 if value.month == 12 else 0)
        month = 1 if value.month == 12 else value.month + 1
        return date(year, month, 1)

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

    def _list_entries_sync(self, book_id: UUID, filters: EntryListFilters) -> list[dict[str, Any]]:
        query = self.client.table("entries").select("*").eq("book_id", str(book_id))
        query = self._apply_filters_to_query(query, filters)
        query = query.order("entry_date", desc=True).order("created_at", desc=True)
        response = query.execute()
        return response.data or []

    def _apply_filters_to_query(self, query: Any, filters: EntryListFilters | None) -> Any:
        if not filters:
            return query

        if filters.from_date:
            query = query.gte("entry_date", filters.from_date.isoformat())
        if filters.to_date:
            query = query.lte("entry_date", filters.to_date.isoformat())

        if filters.categories and not filters.include_uncategorized:
            query = query.in_("category", list(filters.categories))

        if filters.member_ids:
            query = query.in_("user_id", [str(member_id) for member_id in filters.member_ids])

        if filters.min_amount is not None:
            query = query.gte("amount", str(filters.min_amount))
        if filters.max_amount is not None:
            query = query.lte("amount", str(filters.max_amount))

        if filters.entry_type == EntryType.INCOME:
            query = query.gte("amount", "0")
        elif filters.entry_type == EntryType.EXPENSE:
            query = query.lte("amount", "0")

        if filters.search:
            pattern = f"%{filters.search}%"
            query = query.ilike("description", pattern)

        return query

    def _filter_by_categories(
        self,
        entries: Sequence[Entry],
        categories: Sequence[str],
        include_uncategorized: bool,
    ) -> list[Entry]:
        if not categories and not include_uncategorized:
            return list(entries)

        allowed = set(categories)
        filtered: list[Entry] = []
        for entry in entries:
            if entry.category is not None and entry.category in allowed:
                filtered.append(entry)
                continue
            if include_uncategorized and entry.category is None:
                filtered.append(entry)
        return filtered

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
        params = {
            "p_book_id": str(book_id),
            "p_user_id": str(user_id),
            "p_entry_date": payload.entry_date.isoformat(),
            "p_description": payload.description,
            "p_amount": str(payload.amount),
            "p_category": self._normalize_category(payload.category),
            "p_frequency": payload.frequency,
        }
        # 반복 내역 파라미터 추가
        if payload.end_date is not None:
            params["p_end_date"] = payload.end_date.isoformat()
        if payload.day_of_month is not None:
            params["p_day_of_month"] = payload.day_of_month
        if payload.day_of_week is not None:
            params["p_day_of_week"] = payload.day_of_week

        response = self.client.rpc("create_entry_with_history", params).execute()
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
        params = {
            "p_entry_id": str(entry_id),
            "p_book_id": str(book_id),
            "p_user_id": str(user_id),
            "p_entry_date": payload.entry_date.isoformat(),
            "p_description": payload.description,
            "p_amount": str(payload.amount),
            "p_category": self._normalize_category(payload.category),
            "p_frequency": payload.frequency,
        }
        # 반복 내역 파라미터 추가
        if payload.end_date is not None:
            params["p_end_date"] = payload.end_date.isoformat()
        if payload.day_of_month is not None:
            params["p_day_of_month"] = payload.day_of_month
        if payload.day_of_week is not None:
            params["p_day_of_week"] = payload.day_of_week

        response = self.client.rpc("update_entry_with_history", params).execute()
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
            end_date=self._parse_date(row["end_date"]) if row.get("end_date") is not None else None,
            frequency=row.get("frequency", "once"),
            day_of_month=row.get("day_of_month"),
            day_of_week=row.get("day_of_week"),
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
        rounded = decimal_value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return int(rounded)

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
