"""Pytest configuration and shared fixtures for backend test suite."""

from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import SettlementRecord

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture(autouse=True)
def prevent_background_seed(monkeypatch: pytest.MonkeyPatch) -> None:
    """Disable background Elexon seeding during tests."""
    async def noop_seed() -> None:
        pass

    monkeypatch.setattr("app.main.seed_in_background", noop_seed)


@pytest.fixture(scope="function")
def test_db() -> Generator[Session, None, None]:
    """Create a fresh in-memory SQLite database for each test."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(test_db: Session) -> Generator[TestClient, None, None]:
    """TestClient instance configured with test database session override."""
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded_db(test_db: Session) -> Session:
    """Pre-populate test_db with 3 days of realistic settlement records (144 records).

    Days: 2026-01-01, 2026-01-02, 2026-01-03 (48 periods each).
    Errors are distributed across the 6 standard error buckets:
      - '< -1000': 12 records
      - '-1000 to -500': 24 records
      - '-500 to 0': 36 records
      - '0 to 500': 36 records
      - '500 to 1000': 24 records
      - '> 1000': 12 records
    Total records: 144. Bucket percentages sum precisely to 100.0%.
    """
    records: list[SettlementRecord] = []

    # Distribution of errors across 144 items (3 days * 48 periods)
    error_pattern: list[float] = (
        [-1200.0] * 12
        + [-700.0] * 24
        + [-200.0] * 36
        + [200.0] * 36
        + [700.0] * 24
        + [1200.0] * 12
    )

    idx = 0
    for day in range(1, 4):
        settlement_date = date(2026, 1, day)
        # Gate closure is (D-1) 11:00 UTC; publish time at (D-1) 10:30 UTC
        prev_date = settlement_date - timedelta(days=1)
        publish_time = datetime(
            prev_date.year,
            prev_date.month,
            prev_date.day,
            10,
            30,
            0,
            tzinfo=timezone.utc,
        )

        for period in range(1, 49):
            hour = (period - 1) // 2
            minute = ((period - 1) % 2) * 30
            st = datetime(2026, 1, day, hour, minute, 0, tzinfo=timezone.utc)

            base_actual = 6000.0 + (period * 50.0) + (day * 150.0)
            err = error_pattern[idx]
            fc = max(500.0, base_actual + err)
            idx += 1

            rec = SettlementRecord(
                start_time=st,
                settlement_date=settlement_date,
                settlement_period=period,
                actual_mw=round(base_actual, 2),
                forecast_mw=round(fc, 2),
                publish_time=publish_time,
                error_mw=round(err, 2),
                abs_error_mw=round(abs(err), 2),
            )
            records.append(rec)

    test_db.add_all(records)
    test_db.commit()
    return test_db
