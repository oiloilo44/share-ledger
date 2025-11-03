"""가계부 및 멤버 관리 라우터."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.models import (
    BookCreate,
    BookListItem,
    BookMember,
    BookMemberInvite,
    BookMemberUpdate,
    BookUpdate,
)
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.books import BookService, BookServiceError, get_book_service, raise_http_exception

router = APIRouter(prefix="/books", tags=["books"])


@router.get("", response_model=list[BookListItem])
async def list_books(
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> list[BookListItem]:
    """가계부 목록 조회."""
    try:
        return await service.list_books(current_user)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.post("", response_model=BookListItem, status_code=status.HTTP_201_CREATED)
async def create_book(
    payload: BookCreate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> BookListItem:
    """가계부 생성."""
    try:
        return await service.create_book(current_user, payload)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.patch("/{book_id}", response_model=BookListItem)
async def update_book(
    book_id: UUID,
    payload: BookUpdate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> BookListItem:
    """가계부 수정."""
    try:
        return await service.update_book(book_id, current_user, payload)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> Response:
    """가계부 삭제."""
    try:
        await service.delete_book(book_id, current_user)
    except BookServiceError as exc:
        raise_http_exception(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{book_id}/members", response_model=list[BookMember])
async def list_members(
    book_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> list[BookMember]:
    """가계부 멤버 목록 조회."""
    try:
        return await service.list_members(book_id, current_user)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.post("/{book_id}/members", response_model=BookMember, status_code=status.HTTP_201_CREATED)
async def invite_member(
    book_id: UUID,
    payload: BookMemberInvite,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> BookMember:
    """가계부에 멤버 초대."""
    try:
        return await service.invite_member(book_id, current_user, payload)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.patch("/{book_id}/members/{member_user_id}", response_model=BookMember)
async def update_member_role(
    book_id: UUID,
    member_user_id: UUID,
    payload: BookMemberUpdate,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> BookMember:
    """멤버 역할 변경."""
    try:
        return await service.update_member_role(book_id, member_user_id, current_user, payload)
    except BookServiceError as exc:
        raise_http_exception(exc)


@router.delete("/{book_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    book_id: UUID,
    member_user_id: UUID,
    current_user: SupabaseUser = Depends(get_current_user),
    service: BookService = Depends(get_book_service),
) -> Response:
    """멤버 제거."""
    try:
        await service.remove_member(book_id, member_user_id, current_user)
    except BookServiceError as exc:
        raise_http_exception(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
