from __future__ import annotations

import asyncio
import os
from uuid import UUID, uuid4

import pytest
from supabase import Client, create_client

from app.models import BookCreate, BookRole, BookUpdate
from app.schemas.auth import SupabaseUser
from app.services.books import BookService, BookServiceError

pytestmark = pytest.mark.integration


def _get_supabase_client() -> Client:
    url = os.getenv("SHARELEDGER_SUPABASE_URL")
    key = os.getenv("SHARELEDGER_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        pytest.skip("Supabase 환경 변수가 설정되어 있지 않아 통합 테스트를 건너뜁니다.")

    if "your-project" in url or key.endswith("service-role-key"):
        pytest.skip("샘플 Supabase 환경 값이므로 통합 테스트를 건너뜁니다.")

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
            client.auth.admin.delete_user(user_id)

    asyncio.run(_run())
