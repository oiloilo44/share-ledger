from __future__ import annotations

import asyncio
import os
import socket
from collections.abc import Awaitable, Callable
from datetime import date
from urllib.parse import urlparse
from uuid import UUID, uuid4

import httpcore
import httpx
import pytest
from supabase import Client, create_client

from app.models import BookCreate, EntryCreate, EntryUpdate
from app.schemas.auth import SupabaseUser
from app.services.books import BookService, BookServiceError
from app.services.entries import EntryService

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


def test_entry_service_crud_with_supabase() -> None:
    """실제 Supabase 인스턴스와 상호작용해 EntryService CRUD 동작을 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        book_service = BookService(client=client)
        entry_service = EntryService(client=client)

        email_suffix = uuid4().hex[:8]
        email = f"integration+entry+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Entry Integration Tester"

        # 테스트 유저 생성
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
            # 가계부 생성 (Entry를 추가하려면 가계부가 필요)
            book = await book_service.create_book(tester, BookCreate(name="Entry 테스트 가계부"))
            created_book_id = book.id

            # Entry 생성
            entry_create = EntryCreate(
                entry_date=date(2025, 1, 1),
                description="테스트 수입",
                amount=100000,
                category="월급",
            )
            created_entry = await entry_service.create_entry(book.id, tester, entry_create)
            assert created_entry.description == "테스트 수입"
            assert created_entry.amount == 100000
            assert created_entry.book_id == book.id

            # Entry 목록 조회
            entries = await entry_service.list_entries(book.id, tester)
            assert len(entries) == 1
            assert entries[0].id == created_entry.id

            # 단일 Entry 조회
            fetched_entry = await entry_service.get_entry(book.id, created_entry.id, tester)
            assert fetched_entry.id == created_entry.id
            assert fetched_entry.description == "테스트 수입"

            # Entry 수정
            entry_update = EntryUpdate(
                entry_date=date(2025, 1, 2),
                description="수정된 수입",
                amount=120000,
                category="보너스",
            )
            updated_entry = await entry_service.update_entry(
                book.id, created_entry.id, tester, entry_update
            )
            assert updated_entry.description == "수정된 수입"
            assert updated_entry.amount == 120000
            assert updated_entry.category == "보너스"

            # 히스토리 확인
            history = await entry_service.list_history(book.id, tester)
            # 생성(created) + 수정(updated) = 최소 2개
            assert len(history) >= 2

            # Entry 삭제
            await entry_service.delete_entry(book.id, created_entry.id, tester)

            # 삭제 후 목록 조회
            entries_after_delete = await entry_service.list_entries(book.id, tester)
            assert len(entries_after_delete) == 0

            # 히스토리에 삭제 기록 확인
            history_after_delete = await entry_service.list_history(book.id, tester)
            # 생성 + 수정 + 삭제 = 최소 3개
            assert len(history_after_delete) >= 3

        finally:
            await _cleanup_created_book(book_service, tester, created_book_id)
            # users 테이블에서도 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_entry_service_history_revert() -> None:
    """Entry 히스토리 복원 기능을 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        book_service = BookService(client=client)
        entry_service = EntryService(client=client)

        email_suffix = uuid4().hex[:8]
        email = f"integration+history+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "History Integration Tester"

        # 테스트 유저 생성
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
            # 가계부 생성
            book = await book_service.create_book(tester, BookCreate(name="History 테스트 가계부"))
            created_book_id = book.id

            # Entry 생성
            entry_create = EntryCreate(
                entry_date=date(2025, 2, 1),
                description="원본 Entry",
                amount=50000,
                category="식비",
            )
            created_entry = await entry_service.create_entry(book.id, tester, entry_create)

            # Entry 수정
            entry_update = EntryUpdate(
                entry_date=date(2025, 2, 2),
                description="수정된 Entry",
                amount=60000,
                category="외식",
            )
            await entry_service.update_entry(book.id, created_entry.id, tester, entry_update)

            # 히스토리 조회
            history = await entry_service.list_history(book.id, tester)
            assert len(history) >= 2

            # 첫 번째 히스토리(생성 시점)로 복원
            # 히스토리는 최신순으로 정렬되므로 마지막이 생성 시점
            original_history = history[-1]
            reverted_entry = await entry_service.revert_history(original_history.id, tester)

            # 복원된 Entry는 원본 값과 일치해야 함
            assert reverted_entry.description == "원본 Entry"
            assert reverted_entry.amount == 50000
            assert reverted_entry.category == "식비"

        finally:
            await _cleanup_created_book(book_service, tester, created_book_id)
            # users 테이블에서도 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)
