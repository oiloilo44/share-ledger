"""가계부 내역 및 히스토리 라우터."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.models import (
    Entry,
    EntryBulkImportRequest,
    EntryBulkImportResult,
    EntryCreate,
    EntryHistoryItem,
    EntryStats,
    EntryType,
    EntryUpdate,
)
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.entries import (
    EntryListFilters,
    EntryService,
    EntryServiceError,
    EntryStatsParams,
    get_entry_service,
    raise_entry_http_exception,
)

router = APIRouter(prefix="/books/{book_id}", tags=["entries"])
history_router = APIRouter(prefix="/history", tags=["entries"])


@router.get("/entries", response_model=list[Entry])
async def list_entries(
    book_id: UUID,
    from_date: date | None = Query(None, description="검색 시작일"),
    to_date: date | None = Query(None, description="검색 종료일"),
    categories: list[str] | None = Query(
        None,
        description="카테고리 필터 (복수 지정 시 &categories=값 형태)",
    ),
    include_uncategorized: bool = Query(
        False,
        description="카테고리 미분류 포함 여부",
        alias="includeUncategorized",
    ),
    member_ids: list[UUID] | None = Query(
        None,
        description="작성자 필터",
        alias="memberIds",
    ),
    min_amount: int | None = Query(None, description="최소 금액"),
    max_amount: int | None = Query(None, description="최대 금액"),
    entry_type: EntryType | None = Query(None, alias="type", description="수입/지출 필터"),
    search: str | None = Query(None, description="메모/설명 검색"),
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> list[Entry]:
    """가계부 내역 목록을 조회한다."""
    try:
        normalized_categories = tuple(
            cat for cat in (categories or []) if cat != "__uncategorized__"
        )
        include_uncategorized = include_uncategorized or ("__uncategorized__" in (categories or []))
        filters = EntryListFilters(
            from_date=from_date,
            to_date=to_date,
            categories=normalized_categories,
            member_ids=tuple(member_ids or []),
            min_amount=min_amount,
            max_amount=max_amount,
            entry_type=entry_type,
            search=search,
            include_uncategorized=include_uncategorized,
        )
        return await service.list_entries(book_id, current_user, filters)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.get("/entries/{entry_id}", response_model=Entry)
async def get_entry(
    book_id: UUID,
    entry_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> Entry:
    """단일 내역을 조회한다."""
    try:
        return await service.get_entry(book_id, entry_id, current_user)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.get("/stats", response_model=EntryStats)
async def get_stats(
    book_id: UUID,
    month: str | None = Query(None, description="집계 기준 월(YYYY-MM)"),
    from_date: date | None = Query(None, description="집계 시작일"),
    to_date: date | None = Query(None, description="집계 종료일"),
    top_limit: int = Query(5, ge=1, le=20, description="상위 지출 항목 개수"),
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryStats:
    """가계부 통계 데이터를 조회한다."""
    start_date, end_date = _resolve_stats_range(month, from_date, to_date)
    params = EntryStatsParams(start_date=start_date, end_date=end_date, top_limit=top_limit)
    try:
        return await service.get_stats(book_id, current_user, params)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.post("/entries", response_model=Entry, status_code=status.HTTP_201_CREATED)
async def create_entry(
    book_id: UUID,
    payload: EntryCreate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> Entry:
    """새 내역을 생성한다."""
    try:
        return await service.create_entry(book_id, current_user, payload)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.post(
    "/entries/import", response_model=EntryBulkImportResult, status_code=status.HTTP_201_CREATED
)
async def import_entries(
    book_id: UUID,
    payload: EntryBulkImportRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> EntryBulkImportResult:
    """CSV 등 일괄 업로드 데이터를 저장한다."""
    try:
        return await service.bulk_import_entries(book_id, current_user, payload.rows)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.put("/entries/{entry_id}", response_model=Entry)
async def update_entry(
    book_id: UUID,
    entry_id: UUID,
    payload: EntryUpdate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> Entry:
    """기존 내역을 수정한다."""
    try:
        return await service.update_entry(book_id, entry_id, current_user, payload)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    book_id: UUID,
    entry_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> Response:
    """내역을 삭제한다."""
    try:
        await service.delete_entry(book_id, entry_id, current_user)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/history", response_model=list[EntryHistoryItem])
async def list_history(
    book_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> list[EntryHistoryItem]:
    """가계부 내역 히스토리를 조회한다."""
    try:
        return await service.list_history(book_id, current_user)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


@history_router.post("/{history_id}/revert", response_model=Entry)
async def revert_history(
    history_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> Entry:
    """히스토리 스냅샷으로 되돌린다."""
    try:
        return await service.revert_history(history_id, current_user)
    except EntryServiceError as exc:
        raise_entry_http_exception(exc)


def _resolve_stats_range(
    month: str | None,
    from_date: date | None,
    to_date: date | None,
) -> tuple[date | None, date | None]:
    if from_date and to_date:
        return from_date, to_date

    if month:
        try:
            parsed = datetime.strptime(month, "%Y-%m").date()
        except ValueError as exc:  # pragma: no cover - FastAPI에서 검증
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="month 파라미터는 YYYY-MM 형식이어야 합니다.",
            ) from exc

        start = parsed.replace(day=1)
        last_day = monthrange(parsed.year, parsed.month)[1]
        end = date(parsed.year, parsed.month, last_day)

        from_date = from_date or start
        to_date = to_date or end

    return from_date, to_date
