from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import Entry, EntryHistoryAction, EntryHistoryItem
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.entries import EntryServiceError, get_entry_service


class DummyEntryService:
    """테스트 전용 EntryService 스텁."""

    def __init__(self) -> None:
        self.calls: dict[str, list[tuple[Any, ...]]] = defaultdict(list)
        self.list_entries_result: list[Entry] = []
        self.get_entry_result: Entry | None = None
        self.create_entry_result: Entry | None = None
        self.update_entry_result: Entry | None = None
        self.list_history_result: list[EntryHistoryItem] = []
        self.revert_history_result: Entry | None = None
        self.list_entries_error: EntryServiceError | None = None
        self.get_entry_error: EntryServiceError | None = None
        self.create_entry_error: EntryServiceError | None = None
        self.update_entry_error: EntryServiceError | None = None
        self.delete_entry_error: EntryServiceError | None = None
        self.list_history_error: EntryServiceError | None = None
        self.revert_history_error: EntryServiceError | None = None

    async def list_entries(self, book_id: UUID, user: SupabaseUser) -> list[Entry]:
        self.calls["list_entries"].append((book_id, user))
        if self.list_entries_error:
            raise self.list_entries_error
        return self.list_entries_result

    async def get_entry(self, book_id: UUID, entry_id: UUID, user: SupabaseUser) -> Entry:
        self.calls["get_entry"].append((book_id, entry_id, user))
        if self.get_entry_error:
            raise self.get_entry_error
        assert self.get_entry_result is not None
        return self.get_entry_result

    async def create_entry(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: Any,
    ) -> Entry:
        self.calls["create_entry"].append((book_id, user, payload))
        if self.create_entry_error:
            raise self.create_entry_error
        assert self.create_entry_result is not None
        return self.create_entry_result

    async def update_entry(
        self,
        book_id: UUID,
        entry_id: UUID,
        user: SupabaseUser,
        payload: Any,
    ) -> Entry:
        self.calls["update_entry"].append((book_id, entry_id, user, payload))
        if self.update_entry_error:
            raise self.update_entry_error
        assert self.update_entry_result is not None
        return self.update_entry_result

    async def delete_entry(self, book_id: UUID, entry_id: UUID, user: SupabaseUser) -> None:
        self.calls["delete_entry"].append((book_id, entry_id, user))
        if self.delete_entry_error:
            raise self.delete_entry_error

    async def list_history(self, book_id: UUID, user: SupabaseUser) -> list[EntryHistoryItem]:
        self.calls["list_history"].append((book_id, user))
        if self.list_history_error:
            raise self.list_history_error
        return self.list_history_result

    async def revert_history(self, history_id: UUID, user: SupabaseUser) -> Entry:
        self.calls["revert_history"].append((history_id, user))
        if self.revert_history_error:
            raise self.revert_history_error
        assert self.revert_history_result is not None
        return self.revert_history_result


@pytest.fixture
def current_user() -> SupabaseUser:
    return SupabaseUser(id=uuid4(), email="tester@example.com", full_name="Tester")


@pytest.fixture
def dummy_entry_service() -> DummyEntryService:
    return DummyEntryService()


@pytest.fixture
def test_client(dummy_entry_service: DummyEntryService, current_user: SupabaseUser) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_entry_service] = lambda: dummy_entry_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app)


def _entry(amount: int = 1000) -> Entry:
    now = datetime.now(UTC)
    return Entry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        entry_date=date(2024, 1, 1),
        description="커피",
        amount=amount,
        category="식비",
        created_at=now,
        updated_at=now,
    )


def _history_item() -> EntryHistoryItem:
    now = datetime.now(UTC)
    entry = _entry()
    return EntryHistoryItem(
        id=uuid4(),
        entry_id=entry.id,
        book_id=entry.book_id,
        changed_by=entry.user_id,
        changed_at=now,
        action_type=EntryHistoryAction.UPDATED,
        snapshot={"id": str(entry.id), "book_id": str(entry.book_id)},
    )


def test_list_entries_returns_items(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    dummy_entry_service.list_entries_result = [_entry()]
    book_id = uuid4()

    response = test_client.get(f"/books/{book_id}/entries")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["description"] == "커피"
    assert dummy_entry_service.calls["list_entries"]


def test_create_entry_returns_created_item(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    entry = _entry()
    dummy_entry_service.create_entry_result = entry

    response = test_client.post(
        f"/books/{entry.book_id}/entries",
        json={
            "entry_date": "2024-01-01",
            "description": "커피",
            "amount": 1000,
            "category": "식비",
        },
    )

    assert response.status_code == 201
    assert response.json()["amount"] == 1000
    assert dummy_entry_service.calls["create_entry"]


def test_update_entry_propagates_service_error(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    entry = _entry()
    dummy_entry_service.update_entry_error = EntryServiceError(
        "존재하지 않는 내역입니다.",
        status_code=404,
    )

    response = test_client.put(
        f"/books/{entry.book_id}/entries/{entry.id}",
        json={
            "entry_date": "2024-01-02",
            "description": "점심",
            "amount": 12000,
            "category": "식비",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "존재하지 않는 내역입니다."}


def test_delete_entry_returns_no_content(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    entry = _entry()

    response = test_client.delete(f"/books/{entry.book_id}/entries/{entry.id}")

    assert response.status_code == 204
    assert dummy_entry_service.calls["delete_entry"]


def test_list_history_returns_items(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    history_item = _history_item()
    dummy_entry_service.list_history_result = [history_item]
    book_id = history_item.book_id

    response = test_client.get(f"/books/{book_id}/history")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["action_type"] == EntryHistoryAction.UPDATED.value
    assert dummy_entry_service.calls["list_history"]


def test_revert_history_returns_entry(
    test_client: TestClient,
    dummy_entry_service: DummyEntryService,
) -> None:
    entry = _entry()
    dummy_entry_service.revert_history_result = entry
    history_id = uuid4()

    response = test_client.post(f"/history/{history_id}/revert")

    assert response.status_code == 200
    assert response.json()["id"] == str(entry.id)
    assert dummy_entry_service.calls["revert_history"]
