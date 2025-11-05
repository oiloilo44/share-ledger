from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.models import (
    RecurringEntry,
    RecurringEntryCreate,
    RecurringEntryUpdate,
    RecurringFrequency,
)
from app.schemas.auth import SupabaseUser
from app.services.auth import get_current_user
from app.services.recurring import (
    RecurringServiceError,
    get_recurring_service,
)


class DummyRecurringService:
    def __init__(self) -> None:
        self.calls: dict[str, list[tuple[Any, ...]]] = {"list_recurring": []}
        self.list_result: list[RecurringEntry] = []
        self.create_result: RecurringEntry | None = None
        self.update_result: RecurringEntry | None = None
        self.retry_result: RecurringEntry | None = None
        self.list_error: RecurringServiceError | None = None
        self.create_error: RecurringServiceError | None = None
        self.update_error: RecurringServiceError | None = None
        self.retry_error: RecurringServiceError | None = None
        self.delete_error: RecurringServiceError | None = None

    async def list_recurring(self, book_id: UUID, user: SupabaseUser) -> list[RecurringEntry]:
        self.calls.setdefault("list_recurring", []).append((book_id, user))
        if self.list_error:
            raise self.list_error
        return self.list_result

    async def create_recurring(
        self,
        book_id: UUID,
        user: SupabaseUser,
        payload: RecurringEntryCreate,
    ) -> RecurringEntry:
        self.calls.setdefault("create_recurring", []).append((book_id, user, payload))
        if self.create_error:
            raise self.create_error
        assert self.create_result is not None
        return self.create_result

    async def update_recurring(
        self,
        recurring_id: UUID,
        user: SupabaseUser,
        payload: RecurringEntryUpdate,
    ) -> RecurringEntry:
        self.calls.setdefault("update_recurring", []).append((recurring_id, user, payload))
        if self.update_error:
            raise self.update_error
        assert self.update_result is not None
        return self.update_result

    async def retry_recurring(self, recurring_id: UUID, user: SupabaseUser) -> RecurringEntry:
        self.calls.setdefault("retry_recurring", []).append((recurring_id, user))
        if self.retry_error:
            raise self.retry_error
        assert self.retry_result is not None
        return self.retry_result

    async def delete_recurring(self, recurring_id: UUID, user: SupabaseUser) -> None:
        self.calls.setdefault("delete_recurring", []).append((recurring_id, user))
        if self.delete_error:
            raise self.delete_error


@pytest.fixture
def current_user() -> SupabaseUser:
    return SupabaseUser(id=uuid4(), email="tester@example.com", full_name="Tester")


@pytest.fixture
def dummy_service() -> DummyRecurringService:
    return DummyRecurringService()


@pytest.fixture
def test_client(dummy_service: DummyRecurringService, current_user: SupabaseUser) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_recurring_service] = lambda: dummy_service
    app.dependency_overrides[get_current_user] = lambda: current_user
    return TestClient(app)


def _recurring_entry() -> RecurringEntry:
    now = datetime.now(UTC)
    entry_id = uuid4()
    book_id = uuid4()
    user_id = uuid4()
    return RecurringEntry(
        id=entry_id,
        book_id=book_id,
        user_id=user_id,
        description="정기 구독료",
        amount=-15000,
        category="구독",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 1),
        end_date=None,
        last_created_date=None,
        created_at=now,
        updated_at=now,
        next_occurrence=date(2024, 1, 15),
        is_active=True,
    )


def test_list_recurring_entries(
    test_client: TestClient, dummy_service: DummyRecurringService
) -> None:
    entry = _recurring_entry()
    dummy_service.list_result = [entry]

    response = test_client.get(f"/books/{entry.book_id}/recurring")

    assert response.status_code == 200
    assert response.json()[0]["description"] == "정기 구독료"
    assert dummy_service.calls["list_recurring"]


def test_create_recurring_entry(
    test_client: TestClient, dummy_service: DummyRecurringService
) -> None:
    entry = _recurring_entry()
    dummy_service.create_result = entry
    payload = {
        "description": "정기 구독료",
        "amount": -15000,
        "category": "구독",
        "frequency": "monthly",
        "day_of_month": 15,
        "start_date": "2024-01-01",
    }

    response = test_client.post(f"/books/{entry.book_id}/recurring", json=payload)

    assert response.status_code == 201
    assert response.json()["frequency"] == "monthly"
    assert dummy_service.calls["create_recurring"]


def test_retry_recurring_entry(
    test_client: TestClient, dummy_service: DummyRecurringService
) -> None:
    entry = _recurring_entry()
    dummy_service.retry_result = entry

    response = test_client.post(f"/recurring/{entry.id}/retry")

    assert response.status_code == 200
    assert response.json()["id"] == str(entry.id)
    assert dummy_service.calls["retry_recurring"]
