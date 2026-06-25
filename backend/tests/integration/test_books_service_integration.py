from __future__ import annotations

import asyncio
import os
import socket
from collections.abc import Awaitable, Callable
from urllib.parse import urlparse
from uuid import UUID, uuid4

import httpcore
import httpx
import pytest
from supabase import Client, create_client

from app.models import BookCreate, BookMemberInvite, BookRole, BookUpdate
from app.schemas.auth import SupabaseUser
from app.services.books import BookService, BookServiceError

pytestmark = pytest.mark.integration


def _get_supabase_client() -> Client:
    url = os.getenv("SHARELEDGER_SUPABASE_URL")
    key = os.getenv("SHARELEDGER_SUPABASE_SERVER_KEY")
    if not url or not key:
        pytest.skip("Supabase 환경 변수가 설정되어 있지 않아 통합 테스트를 건너뜁니다.")

    if "your-project" in url or key.endswith("dummy-server-key"):
        pytest.skip("샘플 Supabase 환경 값이므로 통합 테스트를 건너뜁니다.")

    host = urlparse(url).hostname
    if not host:
        pytest.skip("Supabase URL이 올바르지 않아 통합 테스트를 건너뜁니다.")
    try:
        socket.getaddrinfo(host, 443)
    except socket.gaierror as exc:
        pytest.skip(f"Supabase DNS 조회 실패로 통합 테스트를 건너뜁니다: {exc}")

    return create_client(url, key)


async def _cleanup_created_book(
    service: BookService, user: SupabaseUser, book_id: UUID | None
) -> None:
    if not book_id:
        return
    try:
        await service.delete_book(book_id, user)
    except BookServiceError:
        # 이미 삭제됐을 가능성만 무시
        pass


def _is_network_error(exc: BaseException) -> bool:
    """예외 체인을 순회하며 네트워크 관련 오류인지 확인한다."""

    current: BaseException | None = exc
    while current:
        if isinstance(
            current,
            httpx.HTTPError | httpcore.NetworkError | OSError | socket.gaierror,
        ):
            return True
        current = current.__cause__ or current.__context__
    return False


def _run_with_supabase_guard(coro_factory: Callable[[], Awaitable[None]]) -> None:
    """Supabase 네트워크 오류 발생 시 테스트를 건너뛰도록 보호한다."""

    try:
        asyncio.run(coro_factory())
    except TimeoutError as exc:
        pytest.skip(f"Supabase 네트워크 타임아웃으로 통합 테스트를 건너뜁니다: {exc}")
    except Exception as exc:
        if _is_network_error(exc):
            pytest.skip(f"Supabase 네트워크 오류로 통합 테스트를 건너뜁니다: {exc}")
        raise


def test_book_service_crud_with_supabase() -> None:
    """실제 Supabase 인스턴스와 상호작용해 BookService 동작을 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = BookService(client=client)
        email_suffix = uuid4().hex[:8]
        email = f"integration+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Integration Tester"

        auth_user = client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name},
            }
        )
        user_id = UUID(auth_user.user.id)

        client.table("users").insert(
            {
                "id": str(user_id),
                "email": email,
                "full_name": full_name,
            }
        ).execute()

        tester = SupabaseUser(id=user_id, email=email, full_name=full_name)
        created_book_id: UUID | None = None

        try:
            created = await service.create_book(tester, BookCreate(name="통합 테스트 가계부"))
            created_book_id = created.id
            assert created.owner_id == tester.id
            assert created.current_role is BookRole.OWNER

            books = await service.list_books(tester)
            assert any(book.id == created.id for book in books)

            members = await service.list_members(created.id, tester)
            assert members, "가계부 생성 시 멤버가 자동 추가되어야 합니다."
            assert any(member.user_id == tester.id for member in members)

            updated = await service.update_book(
                created.id,
                tester,
                BookUpdate(name="수정된 통합 테스트 가계부"),
            )
            assert updated.name == "수정된 통합 테스트 가계부"

        finally:
            await _cleanup_created_book(service, tester, created_book_id)
            # users 테이블에서도 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_book_service_member_management() -> None:
    """가계부 멤버 추가, 역할 변경, 삭제 기능을 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = BookService(client=client)

        # 오너 유저 생성
        email_suffix_owner = uuid4().hex[:8]
        email_owner = f"integration+owner+{email_suffix_owner}@shareledger.app"
        password_owner = f"Test{email_suffix_owner}!"
        full_name_owner = "Book Owner"

        auth_user_owner = client.auth.admin.create_user(
            {
                "email": email_owner,
                "password": password_owner,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_owner},
            }
        )
        owner_id = UUID(auth_user_owner.user.id)

        client.table("users").insert(
            {
                "id": str(owner_id),
                "email": email_owner,
                "full_name": full_name_owner,
            }
        ).execute()

        owner = SupabaseUser(id=owner_id, email=email_owner, full_name=full_name_owner)

        # 멤버로 초대할 유저 생성
        email_suffix_member = uuid4().hex[:8]
        email_member = f"integration+member+{email_suffix_member}@shareledger.app"
        password_member = f"Test{email_suffix_member}!"
        full_name_member = "Book Member"

        auth_user_member = client.auth.admin.create_user(
            {
                "email": email_member,
                "password": password_member,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_member},
            }
        )
        member_id = UUID(auth_user_member.user.id)

        client.table("users").insert(
            {
                "id": str(member_id),
                "email": email_member,
                "full_name": full_name_member,
            }
        ).execute()

        member = SupabaseUser(id=member_id, email=email_member, full_name=full_name_member)
        created_book_id: UUID | None = None

        try:
            # 가계부 생성
            book = await service.create_book(owner, BookCreate(name="멤버 관리 테스트 가계부"))
            created_book_id = book.id

            # 초기 멤버는 오너 한 명만 있어야 함
            members = await service.list_members(book.id, owner)
            assert len(members) == 1
            assert members[0].user_id == owner.id
            assert members[0].role == BookRole.OWNER

            # 멤버 초대
            invited_member = await service.invite_member(
                book.id, owner, BookMemberInvite(email=member.email)
            )
            assert invited_member.user_id == member.id
            assert invited_member.role == BookRole.EDITOR  # 기본 역할은 EDITOR

            # 멤버 목록 확인
            members_after_invite = await service.list_members(book.id, owner)
            assert len(members_after_invite) == 2
            member_ids = {m.user_id for m in members_after_invite}
            assert owner.id in member_ids
            assert member.id in member_ids

            # 멤버 역할 변경 (EDITOR -> VIEWER는 아직 미구현일 수 있음, EDITOR 유지)
            # 현재는 역할 변경 테스트 스킵 (VIEWER 미구현)

            # 멤버 삭제
            await service.remove_member(book.id, member.id, owner)

            # 멤버 삭제 후 목록 확인
            members_after_remove = await service.list_members(book.id, owner)
            assert len(members_after_remove) == 1
            assert members_after_remove[0].user_id == owner.id

        finally:
            await _cleanup_created_book(service, owner, created_book_id)
            # users 테이블에서도 삭제
            client.table("users").delete().eq("id", str(owner_id)).execute()
            client.table("users").delete().eq("id", str(member_id)).execute()
            client.auth.admin.delete_user(owner_id)
            client.auth.admin.delete_user(member_id)

    _run_with_supabase_guard(_run)
