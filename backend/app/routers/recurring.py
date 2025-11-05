"""반복 내역 라우터."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.models import RecurringEntry, RecurringEntryCreate, RecurringEntryUpdate
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.recurring import (
    RecurringService,
    RecurringServiceError,
    get_recurring_service,
    raise_recurring_http_exception,
)

router = APIRouter(prefix="/books/{book_id}/recurring", tags=["recurring"])
item_router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringEntry])
async def list_recurring_entries(
    book_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: RecurringService = Depends(get_recurring_service),
) -> list[RecurringEntry]:
    """가계부 반복 내역 목록을 조회한다."""
    try:
        return await service.list_recurring(book_id, current_user)
    except RecurringServiceError as exc:
        raise_recurring_http_exception(exc)


@router.post("", response_model=RecurringEntry, status_code=status.HTTP_201_CREATED)
async def create_recurring_entry(
    book_id: UUID,
    payload: RecurringEntryCreate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: RecurringService = Depends(get_recurring_service),
) -> RecurringEntry:
    """반복 내역을 생성한다."""
    try:
        return await service.create_recurring(book_id, current_user, payload)
    except RecurringServiceError as exc:
        raise_recurring_http_exception(exc)


@item_router.put("/{recurring_id}", response_model=RecurringEntry)
async def update_recurring_entry(
    recurring_id: UUID,
    payload: RecurringEntryUpdate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: RecurringService = Depends(get_recurring_service),
) -> RecurringEntry:
    """반복 내역을 수정한다."""
    try:
        return await service.update_recurring(recurring_id, current_user, payload)
    except RecurringServiceError as exc:
        raise_recurring_http_exception(exc)


@item_router.post("/{recurring_id}/retry", response_model=RecurringEntry)
async def retry_recurring_entry(
    recurring_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: RecurringService = Depends(get_recurring_service),
) -> RecurringEntry:
    """실패한 반복 내역을 다시 실행하도록 표시한다."""
    try:
        return await service.retry_recurring(recurring_id, current_user)
    except RecurringServiceError as exc:
        raise_recurring_http_exception(exc)


@item_router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_entry(
    recurring_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: RecurringService = Depends(get_recurring_service),
) -> Response:
    """반복 내역을 삭제한다."""
    try:
        await service.delete_recurring(recurring_id, current_user)
    except RecurringServiceError as exc:
        raise_recurring_http_exception(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
