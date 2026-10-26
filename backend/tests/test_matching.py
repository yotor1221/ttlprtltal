"""Unit tests for Elexon forecast matching logic in app.services.processor."""

from datetime import date, datetime, timezone

from app.services.processor import compute_gate_closure_cutoff, match_forecasts_to_actuals


def test_correct_forecast_selected() -> None:
    """The forecast with the latest publishTime before cutoff should be selected."""
    target_st = "2026-01-01T14:00:00Z"
    actuals = [{"startTime": target_st, "generation": 5000.0}]

    # Delivery Jan 1: cutoff is Dec 31 at 11:00 UTC
    forecasts = [
        # Early before cutoff
        {"startTime": target_st, "publishTime": "2025-12-31T08:00:00Z", "generation": 4500.0},
        # Late but before cutoff (should be selected)
        {"startTime": target_st, "publishTime": "2025-12-31T10:45:00Z", "generation": 5200.0},
        # After cutoff (must be ignored)
        {"startTime": target_st, "publishTime": "2025-12-31T11:30:00Z", "generation": 6000.0},
    ]

    records = match_forecasts_to_actuals(actuals, forecasts)
    assert len(records) == 1
    selected = records[0]
    assert selected["forecast_mw"] == 5200.0
    expected_pub = datetime(2025, 12, 31, 10, 45, 0, tzinfo=timezone.utc)
    assert selected["publish_time"] == expected_pub


def test_forecast_after_cutoff_excluded() -> None:
    """Forecasts published after gate closure must NOT be used."""
    target_st = "2026-01-02T12:00:00Z"
    actuals = [{"startTime": target_st, "generation": 4000.0}]

    # Cutoff for 2026-01-02 delivery is 2026-01-01 11:00:00 UTC
    # All supplied forecasts are after cutoff
    forecasts = [
        {"startTime": target_st, "publishTime": "2026-01-01T11:01:00Z", "generation": 4200.0},
        {"startTime": target_st, "publishTime": "2026-01-01T15:00:00Z", "generation": 4300.0},
    ]

    records = match_forecasts_to_actuals(actuals, forecasts)
    assert len(records) == 1
    assert records[0]["forecast_mw"] is None
    assert records[0]["publish_time"] is None
    assert records[0]["error_mw"] is None
    assert records[0]["abs_error_mw"] is None


def test_no_forecast_available() -> None:
    """If no forecast exists before cutoff, forecast fields should be None."""
    target_st = "2026-01-03T08:00:00Z"
    actuals = [{"startTime": target_st, "generation": 3500.0}]
    forecasts: list[dict] = []

    records = match_forecasts_to_actuals(actuals, forecasts)
    assert len(records) == 1
    rec = records[0]
    assert rec["actual_mw"] == 3500.0
    assert rec["forecast_mw"] is None
    assert rec["publish_time"] is None
    assert rec["error_mw"] is None
    assert rec["abs_error_mw"] is None


def test_january_1st_cutoff() -> None:
    """Jan 1 delivery: cutoff is Dec 31 at 11:00 UTC."""
    delivery_date = date(2026, 1, 1)
    cutoff = compute_gate_closure_cutoff(delivery_date)
    expected = datetime(2025, 12, 31, 11, 0, 0, tzinfo=timezone.utc)
    assert cutoff == expected
    assert cutoff.tzinfo == timezone.utc


def test_error_computation_signs() -> None:
    """Positive error = over-forecast, negative = under-forecast."""
    # forecast=5000, actual=4000 -> error=+1000 (over-forecast)
    actuals_over = [{"startTime": "2026-01-05T04:00:00Z", "generation": 4000.0}]
    forecasts_over = [
        {
            "startTime": "2026-01-05T04:00:00Z",
            "publishTime": "2026-01-04T10:00:00Z",
            "generation": 5000.0,
        }
    ]
    records_over = match_forecasts_to_actuals(actuals_over, forecasts_over)
    assert records_over[0]["error_mw"] == 1000.0
    assert records_over[0]["abs_error_mw"] == 1000.0

    # forecast=3000, actual=4000 -> error=-1000 (under-forecast)
    actuals_under = [{"startTime": "2026-01-05T05:00:00Z", "generation": 4000.0}]
    forecasts_under = [
        {
            "startTime": "2026-01-05T05:00:00Z",
            "publishTime": "2026-01-04T10:00:00Z",
            "generation": 3000.0,
        }
    ]
    records_under = match_forecasts_to_actuals(actuals_under, forecasts_under)
    assert records_under[0]["error_mw"] == -1000.0
    assert records_under[0]["abs_error_mw"] == 1000.0


def test_settlement_period_computation() -> None:
    """Period 1 = 00:00, Period 2 = 00:30, ..., Period 48 = 23:30."""
    actuals = []
    for period in range(1, 49):
        hour = (period - 1) // 2
        minute = ((period - 1) % 2) * 30
        st = f"2026-01-10T{hour:02d}:{minute:02d}:00Z"
        actuals.append({"startTime": st, "generation": 5000.0})

    records = match_forecasts_to_actuals(actuals, [])
    assert len(records) == 48

    for idx, rec in enumerate(records):
        assert rec["settlement_period"] == idx + 1

    # Verify boundaries explicitly
    assert records[0]["settlement_period"] == 1
    assert records[0]["start_time"] == datetime(2026, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
    assert records[1]["settlement_period"] == 2
    assert records[1]["start_time"] == datetime(2026, 1, 10, 0, 30, 0, tzinfo=timezone.utc)
    assert records[47]["settlement_period"] == 48
    assert records[47]["start_time"] == datetime(2026, 1, 10, 23, 30, 0, tzinfo=timezone.utc)
