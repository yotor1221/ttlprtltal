"""Embedded fallback fixture generator for January 2026 UK Wind Analytics."""

from datetime import date, datetime, timedelta, timezone
import math
from typing import Any

import numpy as np


def generate_mock_settlement_records() -> list[dict[str, Any]]:
    """Generate 1488 realistic mock settlement records for January 2026.

    Used as fallback when BMRS API is unavailable.

    Wind generation follows realistic diurnal patterns:
    - Higher generation overnight/early morning (periods 1-12, ~6000-10000 MW)
    - Lower midday (periods 13-30, ~4000-7000 MW)
    - Rising again evening (periods 31-48, ~5000-9000 MW)
    - Day-to-day variability (windy vs calm days)
    - Forecast errors: normally distributed with ~300 MW std dev
    - Slight positive bias (over-forecasting tendency ~50 MW)

    Returns:
        List of 1488 dicts with keys:
        - start_time: datetime (UTC)
        - settlement_date: date
        - settlement_period: int (1-48)
        - actual_mw: float
        - forecast_mw: float
        - publish_time: datetime (UTC, pre-gate-closure)
        - error_mw: float
        - abs_error_mw: float
    """
    rng = np.random.default_rng(seed=42)

    records: list[dict[str, Any]] = []

    # Generate daily weather factors for 31 days (stormy vs calm days)
    # Range: ~0.65 to 1.35
    daily_factors = 0.65 + 0.70 * rng.random(32)

    for day in range(1, 32):
        settlement_date = date(2026, 1, day)
        day_factor = float(daily_factors[day])
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
            start_time = datetime(2026, 1, day, hour, minute, 0, tzinfo=timezone.utc)

            # Diurnal baseline:
            # Periods 1-12: ~6000-10000 MW (overnight / morning wind peak)
            # Periods 13-30: ~4000-7000 MW (midday thermal convection lull)
            # Periods 31-48: ~5000-9000 MW (evening rise)
            t = (period - 1) / 48.0
            # Base sinusoidal curve centered at ~6800 MW with ~1800 MW amplitude
            base_mw = (
                6800.0
                + 1900.0 * math.cos(2.0 * math.pi * t + 0.25)
                + 400.0 * math.cos(4.0 * math.pi * t)
            )

            # Apply day factor and intra-period random noise (~120 MW std dev)
            actual_noise = float(rng.normal(loc=0.0, scale=120.0))
            actual_mw = (base_mw * day_factor) + actual_noise
            actual_mw = max(1200.0, actual_mw)  # Keep within realistic bounds

            # Forecast error: normal distribution with ~50 MW positive bias, ~300 MW std dev
            forecast_noise = float(rng.normal(loc=50.0, scale=300.0))
            forecast_mw = max(500.0, actual_mw + forecast_noise)

            actual_mw_rounded = round(actual_mw, 2)
            forecast_mw_rounded = round(forecast_mw, 2)
            error_mw = round(forecast_mw_rounded - actual_mw_rounded, 2)
            abs_error_mw = round(abs(error_mw), 2)

            records.append(
                {
                    "start_time": start_time,
                    "settlement_date": settlement_date,
                    "settlement_period": period,
                    "actual_mw": actual_mw_rounded,
                    "forecast_mw": forecast_mw_rounded,
                    "publish_time": publish_time,
                    "error_mw": error_mw,
                    "abs_error_mw": abs_error_mw,
                }
            )

    return records
