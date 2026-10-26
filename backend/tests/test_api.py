"""Integration tests for UK Wind Analytics API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_health_endpoint(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/health returns ok status and accurate record counts."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["total_records"] > 0
    assert data["period_covered"] == "2026-01"
    assert "data_completeness_pct" in data


def test_metrics_overview(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/metrics/overview returns summary statistics."""
    response = client.get("/api/v1/metrics/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["mae"] >= 0
    assert data["rmse"] >= 0
    assert 0 <= data["overforecast_pct"] <= 100
    assert 0 <= data["underforecast_pct"] <= 100
    assert "data_completeness_pct" in data


def test_daily_valid_date(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/daily/{date} returns 48 periods for a valid day in Jan 2026."""
    response = client.get("/api/v1/daily/2026-01-01")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-01"
    assert len(data["periods"]) == 48
    assert data["periods"][0]["settlement_period"] == 1
    assert "data_completeness_pct" in data


def test_daily_invalid_date(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/daily/{date} with date outside January 2026 returns 422."""
    response = client.get("/api/v1/daily/2026-02-01")
    assert response.status_code == 422


def test_daily_custom_demand_baseline(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/daily/{date} thermal procurement calculation with custom baseline."""
    response = client.get("/api/v1/daily/2026-01-01?demand_baseline_mw=30000")
    assert response.status_code == 200
    data = response.json()
    # Verify thermal procurement uses the custom baseline
    for period in data["periods"]:
        if period["forecast_mw"] is not None:
            expected = max(0, 30000 - period["forecast_mw"])
            assert abs(period["implied_thermal_procurement_mw"] - expected) < 0.01


def test_error_profile(client: TestClient, seeded_db: Session) -> None:
    """Test GET /api/v1/analytics/error-profile returns diurnal breakdown and distribution."""
    response = client.get("/api/v1/analytics/error-profile")
    assert response.status_code == 200
    data = response.json()
    assert len(data["by_settlement_period"]) == 48
    assert len(data["error_distribution"]) == 6  # 6 histogram buckets
    total_pct = sum(b["percentage"] for b in data["error_distribution"])
    assert abs(total_pct - 100.0) < 0.1
    assert "data_completeness_pct" in data
