from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import BookListItem, BookMember, BookRole
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.books import BookServiceError, get_book_service


class DummyBookService:
    """테스트 전용 BookService 스텁."""

    def __init__(self) -> None:
        self.calls: dict[str, list[tuple[Any, ...]]] = defaultdict(list)
        self.list_books_result: list[BookListItem] = []
        self.list_books_error: BookServiceError | None = None
        self.create_book_result: BookListItem | None = None
        self.create_book_error: BookServiceError | None = None
        self.update_book_result: BookListItem | None = None
        self.update_book_error: BookServiceError | None = None
        self.delete_book_error: BookServiceError | None = None
        self.list_members_result: list[BookMember] = []
        self.list_members_error: BookServiceError | None = None
        self.invite_member_result: BookMember | None = None
        self.invite_member_error: BookServiceError | None = None
        self.update_member_result: BookMember | None = None
        self.update_member_error: BookServiceError | None = None
        self.remove_member_error: BookServiceError | None = None

    async def list_books(self, user: SupabaseUser) -> list[BookListItem]:
        self.calls["list_books"].append((user,))
        if self.list_books_error:
            raise self.list_books_error
        return self.list_books_result

    async def create_book(self, user: SupabaseUser, payload: Any) -> BookListItem:
        self.calls["create_book"].append((user, payload))
        if self.create_book_error:
            raise self.create_book_error
        assert self.create_book_result is not None
        return self.create_book_result

    async def update_book(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: Any,
    ) -> BookListItem:
        self.calls["update_book"].append((book_id, user, payload))
        if self.update_book_error:
            raise self.update_book_error
        assert self.update_book_result is not None
        return self.update_book_result

    async def delete_book(self, book_id: UUID, user: SupabaseUser) -> None:
        self.calls["delete_book"].append((book_id, user))
        if self.delete_book_error:
            raise self.delete_book_error

    async def list_members(self, book_id: UUID, user: SupabaseUser) -> list[BookMember]:
        self.calls["list_members"].append((book_id, user))
        if self.list_members_error:
            raise self.list_members_error
        return self.list_members_result

    async def invite_member(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: Any,
    ) -> BookMember:
        self.calls["invite_member"].append((book_id, user, payload))
        if self.invite_member_error:
            raise self.invite_member_error
        assert self.invite_member_result is not None
        return self.invite_member_result

    async def update_member_role(
        self,
        book_id: UUID,
        member_user_id: UUID,
        user: SupabaseUser,
        payload: Any,
    ) -> BookMember:
        self.calls["update_member_role"].append((book_id, member_user_id, user, payload))
        if self.update_member_error:
            raise self.update_member_error
        assert self.update_member_result is not None
        return self.update_member_result

    async def remove_member(
        self,
        book_id: UUID,
        member_user_id: UUID,
        user: SupabaseUser,
    ) -> None:
        self.calls["remove_member"].append((book_id, member_user_id, user))
        if self.remove_member_error:
            raise self.remove_member_error


@pytest.fixture
def current_user() -> SupabaseUser:
    return SupabaseUser(id=uuid4(), email="owner@example.com", full_name="Owner")


@pytest.fixture
def dummy_service() -> DummyBookService:
    return DummyBookService()


@pytest.fixture
def test_client(dummy_service: DummyBookService, current_user: SupabaseUser) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_book_service] = lambda: dummy_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app)


def _book_item(name: str = "월간 가계부") -> BookListItem:
    now = datetime.now(UTC)
    return BookListItem(
        id=uuid4(),
        owner_id=uuid4(),
        name=name,
        created_at=now,
        updated_at=now,
        current_role=BookRole.OWNER,
    )


def _book_member(role: BookRole = BookRole.EDITOR) -> BookMember:
    now = datetime.now(UTC)
    return BookMember(
        book_id=uuid4(),
        user_id=uuid4(),
        email="member@example.com",
        full_name="Member",
        role=role,
        joined_at=now,
    )


def test_list_books_returns_items(test_client: TestClient, dummy_service: DummyBookService) -> None:
    dummy_service.list_books_result = [_book_item()]

    response = test_client.get("/books")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["name"] == "월간 가계부"
    assert dummy_service.calls["list_books"]


def test_create_book_returns_created_item(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    dummy_service.create_book_result = _book_item("새 가계부")

    response = test_client.post("/books", json={"name": "새 가계부"})

    assert response.status_code == 201
    assert response.json()["name"] == "새 가계부"
    assert dummy_service.calls["create_book"]


def test_create_book_propagates_service_error(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    dummy_service.create_book_error = BookServiceError(
        "가계부는 최대 5개까지 생성할 수 있습니다.",
        status_code=409,
    )

    response = test_client.post("/books", json={"name": "초과 가계부"})

    assert response.status_code == 409
    assert response.json() == {"detail": "가계부는 최대 5개까지 생성할 수 있습니다."}


def test_update_book_returns_updated_item(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    dummy_service.update_book_result = _book_item("수정된 가계부")
    book_id = uuid4()

    response = test_client.patch(f"/books/{book_id}", json={"name": "수정된 가계부"})

    assert response.status_code == 200
    assert response.json()["name"] == "수정된 가계부"
    assert dummy_service.calls["update_book"]


def test_delete_book_returns_no_content(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    book_id = uuid4()

    response = test_client.delete(f"/books/{book_id}")

    assert response.status_code == 204
    assert dummy_service.calls["delete_book"]


def test_list_members_returns_member_list(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    member = _book_member()
    dummy_service.list_members_result = [member]
    book_id = member.book_id

    response = test_client.get(f"/books/{book_id}/members")

    assert response.status_code == 200
    data = response.json()
    assert data[0]["email"] == "member@example.com"
    assert dummy_service.calls["list_members"]


def test_invite_member_propagates_error(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    dummy_service.invite_member_error = BookServiceError(
        "이미 가계부 멤버입니다.",
        status_code=409,
    )
    book_id = uuid4()

    response = test_client.post(
        f"/books/{book_id}/members",
        json={"email": "member@example.com", "role": "editor"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "이미 가계부 멤버입니다."}


def test_update_member_role_returns_updated_member(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    member = _book_member(BookRole.EDITOR)
    dummy_service.update_member_result = member
    book_id = uuid4()
    member_id = uuid4()

    response = test_client.patch(
        f"/books/{book_id}/members/{member_id}",
        json={"role": "editor"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "editor"
    assert dummy_service.calls["update_member_role"]


def test_remove_member_returns_no_content(
    test_client: TestClient, dummy_service: DummyBookService
) -> None:
    book_id = uuid4()
    member_id = uuid4()

    response = test_client.delete(f"/books/{book_id}/members/{member_id}")

    assert response.status_code == 204
    assert dummy_service.calls["remove_member"]
