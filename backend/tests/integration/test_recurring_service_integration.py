"""반복 내역 서비스 통합 테스트 (Supabase 실환경)."""

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
from fastapi import status
from supabase import Client, create_client

from app.models import RecurringEntryCreate, RecurringEntryUpdate, RecurringFrequency
from app.schemas.auth import SupabaseUser
from app.services.recurring import RecurringService, RecurringServiceError

pytestmark = pytest.mark.integration


def _get_supabase_client() -> Client:
    url = os.getenv("SHARELEDGER_SUPABASE_URL")
    key = os.getenv("SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        pytest.skip("Supabase 환경 변수가 설정되어 있지 않아 통합 테스트를 건너뜁니다.")

    if "your-project" in url or key.endswith("service-role-key"):
        pytest.skip("샘플 Supabase 환경 값이므로 통합 테스트를 건너뜁니다.")

    host = urlparse(url).hostname
    if not host:
        pytest.skip("Supabase URL이 올바르지 않아 통합 테스트를 건너뜁니다.")
    try:
        socket.getaddrinfo(host, 443)
    except socket.gaierror as exc:
        pytest.skip(f"Supabase DNS 조회 실패로 통합 테스트를 건너뜁니다: {exc}")

    return create_client(url, key)


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


def test_create_and_list_recurring() -> None:
    """반복 내역 생성 및 조회를 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            payload = RecurringEntryCreate(
                description="통합 테스트 구독료",
                amount=-9900,
                category="구독",
                frequency=RecurringFrequency.MONTHLY,
                day_of_month=10,
                day_of_week=None,
                start_date=date(2024, 1, 1),
                end_date=None,
            )

            # 생성
            created = await service.create_recurring(book_id, test_user, payload)
            assert created.description == "통합 테스트 구독료"
            assert created.amount == -9900
            assert created.frequency == RecurringFrequency.MONTHLY
            assert created.day_of_month == 10

            # 조회
            entries = await service.list_recurring(book_id, test_user)
            assert len(entries) > 0
            assert any(e.id == created.id for e in entries)

            # 정리
            await service.delete_recurring(created.id, test_user)

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_update_recurring() -> None:
    """반복 내역 수정을 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            # 생성
            payload = RecurringEntryCreate(
                description="수정 전",
                amount=-5000,
                category="테스트",
                frequency=RecurringFrequency.WEEKLY,
                day_of_month=None,
                day_of_week=1,
                start_date=date(2024, 1, 1),
                end_date=None,
            )
            created = await service.create_recurring(book_id, test_user, payload)

            # 수정
            update_payload = RecurringEntryUpdate(
                description="수정 후",
                amount=-7000,
                category="테스트2",
                frequency=RecurringFrequency.WEEKLY,
                day_of_month=None,
                day_of_week=2,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31),
            )
            updated = await service.update_recurring(created.id, test_user, update_payload)
            assert updated.description == "수정 후"
            assert updated.amount == -7000
            assert updated.day_of_week == 2
            assert updated.end_date == date(2024, 12, 31)

            # 정리
            await service.delete_recurring(created.id, test_user)

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_retry_recurring() -> None:
    """반복 내역 재시도를 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            # 생성
            payload = RecurringEntryCreate(
                description="재시도 테스트",
                amount=-3000,
                category="테스트",
                frequency=RecurringFrequency.MONTHLY,
                day_of_month=5,
                day_of_week=None,
                start_date=date(2024, 1, 1),
                end_date=None,
            )
            created = await service.create_recurring(book_id, test_user, payload)

            # 재시도
            retried = await service.retry_recurring(created.id, test_user)
            assert retried.last_created_date == date.today()

            # 정리
            await service.delete_recurring(created.id, test_user)

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_delete_recurring() -> None:
    """반복 내역 삭제를 검증한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            # 생성
            payload = RecurringEntryCreate(
                description="삭제 테스트",
                amount=-1000,
                category="테스트",
                frequency=RecurringFrequency.MONTHLY,
                day_of_month=1,
                day_of_week=None,
                start_date=date(2024, 1, 1),
                end_date=None,
            )
            created = await service.create_recurring(book_id, test_user, payload)

            # 삭제
            await service.delete_recurring(created.id, test_user)

            # 조회 시 404
            with pytest.raises(RecurringServiceError) as exc_info:
                await service.update_recurring(created.id, test_user, payload)
            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_update_nonexistent_recurring() -> None:
    """존재하지 않는 반복 내역 수정 시 404를 반환한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        try:
            fake_id = uuid4()
            payload = RecurringEntryUpdate(
                description="존재하지 않음",
                amount=-1000,
                category="테스트",
                frequency=RecurringFrequency.MONTHLY,
                day_of_month=1,
                day_of_week=None,
                start_date=date(2024, 1, 1),
                end_date=None,
            )

            with pytest.raises(RecurringServiceError) as exc_info:
                await service.update_recurring(fake_id, test_user, payload)
            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

        finally:
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_delete_nonexistent_recurring() -> None:
    """존재하지 않는 반복 내역 삭제 시 404를 반환한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        try:
            fake_id = uuid4()

            with pytest.raises(RecurringServiceError) as exc_info:
                await service.delete_recurring(fake_id, test_user)
            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

        finally:
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_retry_nonexistent_recurring() -> None:
    """존재하지 않는 반복 내역 재시도 시 404를 반환한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 생성
        email_suffix = uuid4().hex[:8]
        email = f"integration+recurring+{email_suffix}@shareledger.app"
        password = f"Test{email_suffix}!"
        full_name = "Recurring Test User"

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

        test_user = SupabaseUser(id=user_id, email=email, full_name=full_name)

        try:
            fake_id = uuid4()

            with pytest.raises(RecurringServiceError) as exc_info:
                await service.retry_recurring(fake_id, test_user)
            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

        finally:
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id)).execute()
            client.auth.admin.delete_user(user_id)

    _run_with_supabase_guard(_run)


def test_list_recurring_no_membership() -> None:
    """권한 없는 사용자의 조회 시 403을 반환한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 1 생성 (가계부 소유자)
        email_suffix_1 = uuid4().hex[:8]
        email_1 = f"integration+recurring+owner+{email_suffix_1}@shareledger.app"
        password_1 = f"Test{email_suffix_1}!"
        full_name_1 = "Book Owner"

        auth_user_1 = client.auth.admin.create_user(
            {
                "email": email_1,
                "password": password_1,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_1},
            }
        )
        user_id_1 = UUID(auth_user_1.user.id)

        client.table("users").insert(
            {
                "id": str(user_id_1),
                "email": email_1,
                "full_name": full_name_1,
            }
        ).execute()

        test_user = SupabaseUser(id=user_id_1, email=email_1, full_name=full_name_1)

        # 사용자 2 생성 (권한 없음)
        email_suffix_2 = uuid4().hex[:8]
        email_2 = f"integration+recurring+unauthorized+{email_suffix_2}@shareledger.app"
        password_2 = f"Test{email_suffix_2}!"
        full_name_2 = "Unauthorized User"

        auth_user_2 = client.auth.admin.create_user(
            {
                "email": email_2,
                "password": password_2,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_2},
            }
        )
        user_id_2 = UUID(auth_user_2.user.id)

        client.table("users").insert(
            {
                "id": str(user_id_2),
                "email": email_2,
                "full_name": full_name_2,
            }
        ).execute()

        unauthorized_user = SupabaseUser(id=user_id_2, email=email_2, full_name=full_name_2)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            with pytest.raises(RecurringServiceError) as exc_info:
                await service.list_recurring(book_id, unauthorized_user)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id_1)).execute()
            client.table("users").delete().eq("id", str(user_id_2)).execute()
            client.auth.admin.delete_user(user_id_1)
            client.auth.admin.delete_user(user_id_2)

    _run_with_supabase_guard(_run)


def test_create_recurring_no_membership() -> None:
    """권한 없는 사용자의 생성 시 403을 반환한다."""

    async def _run() -> None:
        client = _get_supabase_client()
        service = RecurringService(client=client)

        # 사용자 1 생성 (가계부 소유자)
        email_suffix_1 = uuid4().hex[:8]
        email_1 = f"integration+recurring+owner+{email_suffix_1}@shareledger.app"
        password_1 = f"Test{email_suffix_1}!"
        full_name_1 = "Book Owner"

        auth_user_1 = client.auth.admin.create_user(
            {
                "email": email_1,
                "password": password_1,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_1},
            }
        )
        user_id_1 = UUID(auth_user_1.user.id)

        client.table("users").insert(
            {
                "id": str(user_id_1),
                "email": email_1,
                "full_name": full_name_1,
            }
        ).execute()

        test_user = SupabaseUser(id=user_id_1, email=email_1, full_name=full_name_1)

        # 사용자 2 생성 (권한 없음)
        email_suffix_2 = uuid4().hex[:8]
        email_2 = f"integration+recurring+unauthorized+{email_suffix_2}@shareledger.app"
        password_2 = f"Test{email_suffix_2}!"
        full_name_2 = "Unauthorized User"

        auth_user_2 = client.auth.admin.create_user(
            {
                "email": email_2,
                "password": password_2,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name_2},
            }
        )
        user_id_2 = UUID(auth_user_2.user.id)

        client.table("users").insert(
            {
                "id": str(user_id_2),
                "email": email_2,
                "full_name": full_name_2,
            }
        ).execute()

        unauthorized_user = SupabaseUser(id=user_id_2, email=email_2, full_name=full_name_2)

        # 가계부 생성
        book_id = uuid4()
        client.table("account_books").insert(
            {
                "id": str(book_id),
                "owner_id": str(test_user.id),
                "name": "테스트 가계부",
            }
        ).execute()

        try:
            payload = RecurringEntryCreate(
                description="권한 없음",
                amount=-1000,
                category="테스트",
                frequency=RecurringFrequency.MONTHLY,
                day_of_month=1,
                day_of_week=None,
                start_date=date(2024, 1, 1),
                end_date=None,
            )

            with pytest.raises(RecurringServiceError) as exc_info:
                await service.create_recurring(book_id, unauthorized_user, payload)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

        finally:
            # 가계부 삭제
            client.table("account_books").delete().eq("id", str(book_id)).execute()
            # 사용자 삭제
            client.table("users").delete().eq("id", str(user_id_1)).execute()
            client.table("users").delete().eq("id", str(user_id_2)).execute()
            client.auth.admin.delete_user(user_id_1)
            client.auth.admin.delete_user(user_id_2)

    _run_with_supabase_guard(_run)
