"""반복 내역 서비스 단위 테스트."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import MagicMock, Mock
from uuid import UUID, uuid4

import pytest
from postgrest.exceptions import APIError as PostgrestAPIError

from app.models import RecurringFrequency
from app.schemas.auth import SupabaseUser
from app.services.recurring import RecurringService, RecurringServiceError


@pytest.fixture
def mock_supabase_client():
    """Supabase 클라이언트 모킹."""
    return MagicMock()


@pytest.fixture
def service(mock_supabase_client):
    """RecurringService 인스턴스."""
    return RecurringService(client=mock_supabase_client)


@pytest.fixture
def test_user():
    """테스트 사용자."""
    return SupabaseUser(id=uuid4(), email="test@example.com", full_name="Test User")


@pytest.fixture
def test_book_id():
    """테스트 가계부 ID."""
    return uuid4()


def _mock_recurring_row(
    recurring_id: UUID | None = None,
    book_id: UUID | None = None,
    user_id: UUID | None = None,
    amount: int = -15000,
    frequency: str = "monthly",
    day_of_month: int | None = 15,
    day_of_week: int | None = None,
    start_date: str = "2024-01-01",
    end_date: str | None = None,
    last_created_date: str | None = None,
) -> dict:
    """반복 내역 행 데이터 생성."""
    return {
        "id": str(recurring_id or uuid4()),
        "book_id": str(book_id or uuid4()),
        "user_id": str(user_id or uuid4()),
        "description": "정기 구독료",
        "amount": str(amount),
        "category": "구독",
        "frequency": frequency,
        "day_of_month": day_of_month,
        "day_of_week": day_of_week,
        "start_date": start_date,
        "end_date": end_date,
        "last_created_date": last_created_date,
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    }


def test_parse_amount_valid(service):
    """정상적인 금액 파싱."""
    assert service._parse_amount("15000") == 15000
    assert service._parse_amount("-15000") == -15000
    assert service._parse_amount(Decimal("100")) == 100


def test_parse_amount_invalid_decimal(service):
    """소수점이 있는 금액 파싱 실패."""
    with pytest.raises(RecurringServiceError) as exc_info:
        service._parse_amount("15000.50")
    assert exc_info.value.status_code == 500
    assert "정수여야 합니다" in exc_info.value.detail


def test_parse_datetime(service):
    """datetime 파싱."""
    # ISO 포맷
    result = service._parse_datetime("2024-01-15T10:30:00+00:00")
    assert isinstance(result, datetime)
    assert result.year == 2024

    # Z 포맷
    result = service._parse_datetime("2024-01-15T10:30:00Z")
    assert isinstance(result, datetime)

    # datetime 객체 그대로
    dt = datetime(2024, 1, 15)
    assert service._parse_datetime(dt) == dt


def test_parse_date(service):
    """date 파싱."""
    # 문자열
    result = service._parse_date("2024-01-15")
    assert isinstance(result, date)
    assert result == date(2024, 1, 15)

    # date 객체
    d = date(2024, 1, 15)
    assert service._parse_date(d) == d

    # datetime 객체
    dt = datetime(2024, 1, 15, 10, 30)
    assert service._parse_date(dt) == date(2024, 1, 15)


def test_parse_optional_date(service):
    """선택적 date 파싱."""
    assert service._parse_optional_date(None) is None
    assert service._parse_optional_date("2024-01-15") == date(2024, 1, 15)


def test_to_python_weekday(service):
    """Supabase 요일을 Python 요일로 변환."""
    # Supabase: 0=일요일, 1=월요일, ..., 6=토요일
    # Python: 0=월요일, 1=화요일, ..., 6=일요일
    assert service._to_python_weekday(0) == 6  # 일요일
    assert service._to_python_weekday(1) == 0  # 월요일
    assert service._to_python_weekday(6) == 5  # 토요일


def test_is_active_not_ended(service):
    """종료일이 지나지 않은 활성 반복 내역."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 1),
        end_date=date(2025, 12, 31),
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=date(2024, 6, 15),
        is_active=True,
    )
    assert service._is_active(entry, date(2024, 6, 15)) is True


def test_is_active_ended(service):
    """종료일이 지난 비활성 반복 내역."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31),
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    assert service._is_active(entry, None) is False


def test_is_active_no_next_occurrence(service):
    """다음 발생일이 없으면 비활성."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 1),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    assert service._is_active(entry, None) is False


def test_align_first_occurrence_monthly_same_day(service):
    """월별 반복: 시작일과 같은 날짜."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 10),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._align_first_occurrence(date(2024, 1, 10), entry)
    assert result == date(2024, 1, 15)


def test_align_first_occurrence_monthly_next_month(service):
    """월별 반복: 이미 지난 날짜면 다음 달."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 20),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._align_first_occurrence(date(2024, 1, 20), entry)
    assert result == date(2024, 2, 15)


def test_align_first_occurrence_monthly_leap_year(service):
    """월별 반복: 2월 31일 → 2월 29일 (윤년)."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=31,
        day_of_week=None,
        start_date=date(2024, 1, 31),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._align_first_occurrence(date(2024, 2, 1), entry)
    assert result == date(2024, 2, 29)


def test_align_first_occurrence_weekly(service):
    """주별 반복: 다음 월요일 찾기."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.WEEKLY,
        day_of_month=None,
        day_of_week=1,  # Supabase 월요일
        start_date=date(2024, 1, 8),  # 2024-01-08은 월요일
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    # 2024-01-10 (수요일)부터 시작하면 다음 월요일은 2024-01-15
    result = service._align_first_occurrence(date(2024, 1, 10), entry)
    assert result == date(2024, 1, 15)


def test_advance_from_monthly(service):
    """월별 반복: 다음 달로 진행."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 1),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._advance_from(date(2024, 1, 15), entry)
    assert result == date(2024, 2, 15)


def test_advance_from_monthly_year_rollover(service):
    """월별 반복: 연도 넘김."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.MONTHLY,
        day_of_month=15,
        day_of_week=None,
        start_date=date(2024, 1, 1),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._advance_from(date(2024, 12, 15), entry)
    assert result == date(2025, 1, 15)


def test_advance_from_weekly(service):
    """주별 반복: 다음 주 같은 요일."""
    from app.models import RecurringEntry

    entry = RecurringEntry(
        id=uuid4(),
        book_id=uuid4(),
        user_id=uuid4(),
        description="테스트",
        amount=-10000,
        category="테스트",
        frequency=RecurringFrequency.WEEKLY,
        day_of_month=None,
        day_of_week=1,  # 월요일
        start_date=date(2024, 1, 8),
        end_date=None,
        last_created_date=None,
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
        next_occurrence=None,
        is_active=True,
    )
    result = service._advance_from(date(2024, 1, 8), entry)
    assert result == date(2024, 1, 15)


def test_convert_error_constraint_violation(service):
    """제약 조건 위반 에러 변환."""
    exc = Mock(spec=PostgrestAPIError)
    exc.code = "23514"
    exc.message = "check constraint violated"
    exc.details = ""

    result = service._convert_error(exc)
    assert result.status_code == 400
    assert "허용 범위를 벗어났습니다" in result.detail


def test_convert_error_conflict(service):
    """충돌 에러 변환."""
    exc = Mock(spec=PostgrestAPIError)
    exc.code = "P0001"
    exc.message = "conflict detected"
    exc.details = "recurring entry conflict"

    result = service._convert_error(exc)
    assert result.status_code == 409
    assert "이미 존재합니다" in result.detail


def test_convert_error_generic(service):
    """일반 에러 변환."""
    exc = Mock(spec=PostgrestAPIError)
    exc.code = "XXXXX"
    exc.message = "unknown error"
    exc.details = ""

    result = service._convert_error(exc)
    assert result.status_code == 500
    assert "처리 중 오류가 발생했습니다" in result.detail


def test_row_to_entry(service):
    """DB 행을 RecurringEntry 객체로 변환."""
    row = _mock_recurring_row(
        frequency="monthly",
        day_of_month=15,
        start_date="2024-01-01",
    )
    entry = service._row_to_entry(row)

    assert entry.id == UUID(row["id"])
    assert entry.book_id == UUID(row["book_id"])
    assert entry.description == "정기 구독료"
    assert entry.amount == -15000
    assert entry.frequency == RecurringFrequency.MONTHLY
    assert entry.day_of_month == 15
    assert entry.start_date == date(2024, 1, 1)


def test_row_to_entry_weekly(service):
    """주별 반복 내역 변환."""
    row = _mock_recurring_row(
        frequency="weekly",
        day_of_month=None,
        day_of_week=1,
        start_date="2024-01-08",
    )
    entry = service._row_to_entry(row)

    assert entry.frequency == RecurringFrequency.WEEKLY
    assert entry.day_of_week == 1
    assert entry.day_of_month is None
