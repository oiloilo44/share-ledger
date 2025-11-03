"""가계부 및 멤버 관리 서비스."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from app.db import get_supabase_client
from app.models import (
    Book,
    BookCreate,
    BookListItem,
    BookMember,
    BookMemberInvite,
    BookMemberUpdate,
    BookRole,
    BookUpdate,
)
from app.schemas.auth import SupabaseUser

logger = logging.getLogger("shareledger.services.books")


class BookServiceError(RuntimeError):
    """도메인 수준 예외."""

    def __init__(self, detail: str, *, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _parse_datetime(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


@dataclass(slots=True)
class BookService:
    """Supabase 기반 가계부/멤버 서비스."""

    client: Client

    async def list_books(self, user: SupabaseUser) -> list[BookListItem]:
        """사용자가 접근 가능한 가계부 목록을 반환한다."""

        def _work() -> list[BookListItem]:
            user_id = str(user.id)
            owned_resp = (
                self.client.table("account_books").select("*").eq("owner_id", user_id).execute()
            )
            book_map: dict[UUID, tuple[dict[str, Any], BookRole]] = {}
            for row in owned_resp.data or []:
                book_id = UUID(row["id"])
                book_map[book_id] = (row, BookRole.OWNER)

            membership_resp = (
                self.client.table("book_members")
                .select("book_id, role")
                .eq("user_id", user_id)
                .execute()
            )

            membership_lookup: dict[UUID, BookRole] = {}
            for row in membership_resp.data or []:
                book_id = UUID(row["book_id"])
                role = BookRole(row["role"])
                if book_id in book_map:
                    # 멤버십에 owner가 포함되어 있어도 최신 역할로 덮어쓴다.
                    book_map[book_id] = (book_map[book_id][0], role)
                else:
                    membership_lookup[book_id] = role

            if membership_lookup:
                fetch_resp = (
                    self.client.table("account_books")
                    .select("*")
                    .in_("id", [str(book_id) for book_id in membership_lookup])
                    .execute()
                )
                for row in fetch_resp.data or []:
                    book_id = UUID(row["id"])
                    role = membership_lookup.get(book_id, BookRole.EDITOR)
                    book_map[book_id] = (row, role)

            items = []
            for row, role in book_map.values():
                book = self._row_to_book(row)
                items.append(BookListItem(**book.model_dump(), current_role=role))

            items.sort(key=lambda item: item.created_at)
            return items

        return await asyncio.to_thread(_work)

    async def create_book(self, user: SupabaseUser, payload: BookCreate) -> BookListItem:
        """가계부를 생성한다."""
        try:
            row = await asyncio.to_thread(self._create_book_sync, user.id, payload)
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover - 변환 로직 확인용
            raise self._convert_error(exc) from exc
        except Exception as exc:  # pragma: no cover - 예기치 못한 오류
            logger.exception("create_book unexpected error")
            raise BookServiceError(
                "가계부 생성 중 오류가 발생했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ) from exc

        book = self._row_to_book(row)
        item = BookListItem(**book.model_dump(), current_role=BookRole.OWNER)
        await self._emit_book_event(
            book.id,
            action="created",
            entity="book",
            data={"id": str(book.id), "name": book.name},
        )
        return item

    async def update_book(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: BookUpdate,
    ) -> BookListItem:
        """가계부 정보를 수정한다."""
        await asyncio.to_thread(self._ensure_owner_sync, book_id, user.id)

        try:
            row = await asyncio.to_thread(self._update_book_sync, book_id, payload)
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc
        except Exception as exc:  # pragma: no cover
            logger.exception("update_book unexpected error")
            raise BookServiceError(
                "가계부 수정 중 오류가 발생했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ) from exc

        book = self._row_to_book(row)
        item = BookListItem(**book.model_dump(), current_role=BookRole.OWNER)
        await self._emit_book_event(
            book.id,
            action="updated",
            entity="book",
            data={"id": str(book.id), "name": book.name},
        )
        return item

    async def delete_book(self, book_id: UUID, user: SupabaseUser) -> None:
        """가계부를 삭제한다."""
        await asyncio.to_thread(self._ensure_owner_sync, book_id, user.id)
        try:
            await asyncio.to_thread(self._delete_book_sync, book_id)
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc
        except Exception as exc:  # pragma: no cover
            logger.exception("delete_book unexpected error")
            raise BookServiceError(
                "가계부 삭제 중 오류가 발생했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            ) from exc

        await self._emit_book_event(
            book_id,
            action="deleted",
            entity="book",
            data={"id": str(book_id)},
        )

    async def list_members(self, book_id: UUID, user: SupabaseUser) -> list[BookMember]:
        """가계부 멤버 목록을 반환한다."""
        await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        return await asyncio.to_thread(self._list_members_sync, book_id)

    async def invite_member(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: BookMemberInvite,
    ) -> BookMember:
        """가계부에 새로운 멤버를 초대한다."""
        await asyncio.to_thread(self._ensure_owner_sync, book_id, user.id)
        target = await asyncio.to_thread(self._get_user_by_email_sync, payload.email)
        if target is None:
            raise BookServiceError(
                "해당 이메일의 사용자를 찾을 수 없습니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        target_id = UUID(target["id"])
        if target_id == user.id:
            raise BookServiceError(
                "자기 자신은 초대할 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            row = await asyncio.to_thread(
                self._add_member_sync,
                book_id,
                target_id,
                payload.role,
            )
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        member = BookMember(
            book_id=book_id,
            user_id=target_id,
            email=target["email"],
            full_name=target.get("full_name"),
            role=payload.role,
            joined_at=_parse_datetime(row["joined_at"]),
        )

        await self._emit_book_event(
            book_id,
            action="member_invited",
            entity="member",
            data={"user_id": str(target_id), "role": payload.role.value},
        )
        return member

    async def update_member_role(
        self,
        book_id: UUID,
        member_user_id: UUID,
        user: SupabaseUser,
        payload: BookMemberUpdate,
    ) -> BookMember:
        """멤버 역할을 변경한다."""
        await asyncio.to_thread(self._ensure_owner_sync, book_id, user.id)
        if member_user_id == user.id:
            raise BookServiceError(
                "자기 자신의 역할은 변경할 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            row = await asyncio.to_thread(
                self._update_member_role_sync,
                book_id,
                member_user_id,
                payload.role,
            )
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        target = await asyncio.to_thread(self._get_user_by_id_sync, member_user_id)
        email = target["email"] if target else "unknown@example.com"
        full_name = target.get("full_name") if target else None

        member = BookMember(
            book_id=book_id,
            user_id=member_user_id,
            email=email,
            full_name=full_name,
            role=payload.role,
            joined_at=_parse_datetime(row["joined_at"]),
        )

        await self._emit_book_event(
            book_id,
            action="member_role_updated",
            entity="member",
            data={"user_id": str(member_user_id), "role": payload.role.value},
        )
        return member

    async def remove_member(
        self,
        book_id: UUID,
        member_user_id: UUID,
        user: SupabaseUser,
    ) -> None:
        """멤버를 삭제한다."""
        current_role = await asyncio.to_thread(self._require_membership_sync, book_id, user.id)
        if member_user_id == user.id and current_role is BookRole.OWNER:
            raise BookServiceError(
                "가계부 소유자는 스스로 탈퇴할 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if member_user_id != user.id and current_role is not BookRole.OWNER:
            raise BookServiceError(
                "멤버를 제거할 권한이 없습니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            row = await asyncio.to_thread(self._remove_member_sync, book_id, member_user_id)
        except BookServiceError:
            raise
        except PostgrestAPIError as exc:  # pragma: no cover
            raise self._convert_error(exc) from exc

        if BookRole(row["role"]) is BookRole.OWNER:
            raise BookServiceError(
                "가계부 소유자는 삭제할 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        await self._emit_book_event(
            book_id,
            action="member_removed",
            entity="member",
            data={"user_id": str(member_user_id)},
        )

    # ----- 동기 헬퍼 메서드 -----

    def _row_to_book(self, row: dict[str, Any]) -> Book:
        return Book(
            id=UUID(row["id"]),
            owner_id=UUID(row["owner_id"]),
            name=row["name"],
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"]),
        )

    def _create_book_sync(self, owner_id: UUID, payload: BookCreate) -> dict[str, Any]:
        response = (
            self.client.table("account_books")
            .insert({"owner_id": str(owner_id), "name": payload.name})
            .execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "가계부 생성에 실패했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        book_row = data[0]
        try:
            self.client.table("book_members").insert(
                {
                    "book_id": book_row["id"],
                    "user_id": str(owner_id),
                    "role": BookRole.OWNER.value,
                }
            ).execute()
        except PostgrestAPIError:
            self.client.table("account_books").delete().eq("id", book_row["id"]).execute()
            raise

        return book_row

    def _ensure_owner_sync(self, book_id: UUID, user_id: UUID) -> dict[str, Any]:
        response = (
            self.client.table("account_books").select("*").eq("id", str(book_id)).limit(1).execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "존재하지 않는 가계부입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        row = data[0]
        if row["owner_id"] != str(user_id):
            raise BookServiceError(
                "해당 가계부에 대한 권한이 없습니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return row

    def _update_book_sync(self, book_id: UUID, payload: BookUpdate) -> dict[str, Any]:
        response = (
            self.client.table("account_books")
            .update({"name": payload.name})
            .eq("id", str(book_id))
            .execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "가계부 수정에 실패했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return data[0]

    def _delete_book_sync(self, book_id: UUID) -> None:
        response = self.client.table("account_books").delete().eq("id", str(book_id)).execute()
        data = response.data or []
        if not data:
            raise BookServiceError(
                "존재하지 않는 가계부입니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

    def _require_membership_sync(self, book_id: UUID, user_id: UUID) -> BookRole:
        response = (
            self.client.table("book_members")
            .select("role")
            .eq("book_id", str(book_id))
            .eq("user_id", str(user_id))
            .limit(1)
            .execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "해당 가계부에 참여하고 있지 않습니다.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return BookRole(data[0]["role"])

    def _list_members_sync(self, book_id: UUID) -> list[BookMember]:
        response = (
            self.client.table("book_members")
            .select("book_id, user_id, role, joined_at")
            .eq("book_id", str(book_id))
            .order("joined_at")
            .execute()
        )
        rows = response.data or []
        if not rows:
            return []

        user_ids = [row["user_id"] for row in rows]
        users_resp = (
            self.client.table("users").select("id, email, full_name").in_("id", user_ids).execute()
        )
        users = {row["id"]: row for row in users_resp.data or []}

        members: list[BookMember] = []
        for row in rows:
            user_row = users.get(row["user_id"])
            email = user_row["email"] if user_row else "unknown@example.com"
            full_name = user_row.get("full_name") if user_row else None
            members.append(
                BookMember(
                    book_id=UUID(row["book_id"]),
                    user_id=UUID(row["user_id"]),
                    email=email,
                    full_name=full_name,
                    role=BookRole(row["role"]),
                    joined_at=_parse_datetime(row["joined_at"]),
                )
            )
        members.sort(key=lambda member: member.joined_at)
        return members

    def _get_user_by_email_sync(self, email: str) -> dict[str, Any] | None:
        response = (
            self.client.table("users")
            .select("id, email, full_name")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def _get_user_by_id_sync(self, user_id: UUID) -> dict[str, Any] | None:
        response = (
            self.client.table("users")
            .select("id, email, full_name")
            .eq("id", str(user_id))
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def _add_member_sync(
        self,
        book_id: UUID,
        user_id: UUID,
        role: BookRole,
    ) -> dict[str, Any]:
        response = (
            self.client.table("book_members")
            .insert(
                {
                    "book_id": str(book_id),
                    "user_id": str(user_id),
                    "role": role.value,
                }
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "멤버 초대에 실패했습니다.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return data[0]

    def _update_member_role_sync(
        self,
        book_id: UUID,
        member_user_id: UUID,
        role: BookRole,
    ) -> dict[str, Any]:
        existing_resp = (
            self.client.table("book_members")
            .select("book_id, user_id, role, joined_at")
            .eq("book_id", str(book_id))
            .eq("user_id", str(member_user_id))
            .limit(1)
            .execute()
        )
        existing = existing_resp.data or []
        if not existing:
            raise BookServiceError(
                "해당 멤버를 찾을 수 없습니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        current_role = BookRole(existing[0]["role"])
        if current_role is BookRole.OWNER:
            raise BookServiceError(
                "가계부 소유자의 역할은 변경할 수 없습니다.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        response = (
            self.client.table("book_members")
            .update({"role": role.value})
            .eq("book_id", str(book_id))
            .eq("user_id", str(member_user_id))
            .execute()
        )
        data = response.data or []
        if data:
            return data[0]

        existing[0]["role"] = role.value
        return existing[0]

    def _remove_member_sync(self, book_id: UUID, member_user_id: UUID) -> dict[str, Any]:
        response = (
            self.client.table("book_members")
            .delete()
            .eq("book_id", str(book_id))
            .eq("user_id", str(member_user_id))
            .execute()
        )
        data = response.data or []
        if not data:
            raise BookServiceError(
                "해당 멤버를 찾을 수 없습니다.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return data[0]

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
            (self.client.rpc("pg_notify", {"channel": channel, "payload": payload})).execute()

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

    def _convert_error(self, exc: PostgrestAPIError) -> BookServiceError:
        message = getattr(exc, "message", None) or "요청 처리 중 오류가 발생했습니다."
        details = getattr(exc, "details", "") or ""
        combined = f"{message} {details}".strip()
        code = getattr(exc, "code", "")

        if "최대 5개의 가계부" in combined:
            return BookServiceError(
                "가계부는 최대 5개까지 생성할 수 있습니다.",
                status_code=status.HTTP_409_CONFLICT,
            )
        if "최대 5개의 공유 가계부" in combined:
            return BookServiceError(
                "해당 사용자는 이미 5개의 가계부에 참여 중입니다.",
                status_code=status.HTTP_409_CONFLICT,
            )
        if "duplicate key" in combined or code == "23505":
            return BookServiceError(
                "이미 가계부 멤버입니다.",
                status_code=status.HTTP_409_CONFLICT,
            )

        return BookServiceError(
            message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


async def get_book_service(client: Client = Depends(get_supabase_client)) -> BookService:
    """FastAPI 의존성으로 BookService를 제공한다."""
    return BookService(client=client)


def raise_http_exception(error: BookServiceError) -> None:
    """BookServiceError를 FastAPI HTTPException으로 변환한다."""
    raise HTTPException(status_code=error.status_code, detail=error.detail)
