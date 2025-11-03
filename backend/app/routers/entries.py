"""가계부 내역 및 히스토리 라우터."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.models import Entry, EntryCreate, EntryHistoryItem, EntryUpdate
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.entries import (
    EntryService,
    EntryServiceError,
    get_entry_service,
    raise_entry_http_exception,
)

router = APIRouter(prefix="/books/{book_id}", tags=["entries"])
history_router = APIRouter(prefix="/history", tags=["entries"])


@router.get("/entries", response_model=list[Entry])
async def list_entries(
    book_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: EntryService = Depends(get_entry_service),
) -> list[Entry]:
    """가계부 내역 목록을 조회한다."""
    try:
        return await service.list_entries(book_id, current_user)
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
