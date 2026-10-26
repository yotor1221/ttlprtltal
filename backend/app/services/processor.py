"""Core matching logic for Day-Ahead Gate Closure forecast-to-actual alignment.

Ensures strict zero-data-leakage compliance by choosing only the freshest
forecast published before Day-Ahead Gate Closure: (D-1) at 11:00:00 UTC.
"""

from datetime import date, datetime, timedelta, timezone
import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def compute_gate_closure_cutoff(delivery_date: date) -> datetime:
    """Day-Ahead Gate Closure = (D-1) at 11:00:00 UTC."""
    d_minus_1 = delivery_date - timedelta(days=1)
    return datetime(
        d_minus_1.year,
        d_minus_1.month,
        d_minus_1.day,
        11,
        0,
        0,
        tzinfo=timezone.utc,
    )


def _to_utc_datetime(val: Any) -> datetime | None:
    """Convert input to a UTC-aware datetime object."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, pd.Timestamp):
        if val.tz is None:
            return val.tz_localize("UTC").to_pydatetime()
        return val.tz_convert("UTC").to_pydatetime()
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
    if isinstance(val, str):
        # Handle trailing Z or ISO formats
        clean_str = val.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            ts = pd.to_datetime(val, utc=True)
            return ts.to_pydatetime()
    return None


def match_forecasts_to_actuals(
    actuals: list[dict[str, Any]],
    forecasts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Match half-hourly actual generation to Day-Ahead pre-gate-closure forecasts.

    For each actual generation half-hour record:
    1. Compute delivery date D = start_time.date()
    2. Compute cutoff = (D-1) at 11:00:00 UTC
    3. Filter forecasts where startTime == target start_time AND publishTime <= cutoff
    4. Pick the forecast with the latest publishTime (freshest pre-gate-closure info)
    5. Compute error_mw = forecast_mw - actual_mw (positive = over-forecast)
    6. Compute abs_error_mw = abs(error_mw)

    Returns:
        list of dicts ready for DB insertion:
        {
            'start_time': datetime,
            'settlement_date': date,
            'settlement_period': int,
            'actual_mw': float | None,
            'forecast_mw': float | None,
            'publish_time': datetime | None,
            'error_mw': float | None,
            'abs_error_mw': float | None
        }
    """
    if not actuals:
        logger.warning("No actuals provided to match_forecasts_to_actuals.")
        return []

    # Step 1: Normalize and parse actuals
    normalized_actuals: list[dict[str, Any]] = []
    for item in actuals:
        raw_st = item.get("startTime") or item.get("start_time")
        st_utc = _to_utc_datetime(raw_st)
        if st_utc is None:
            continue

        raw_gen = item.get("generation") if "generation" in item else item.get("actual_mw")
        actual_val = float(raw_gen) if raw_gen is not None and not pd.isna(raw_gen) else None

        normalized_actuals.append(
            {
                "start_time": st_utc,
                "actual_mw": actual_val,
            }
        )

    if not normalized_actuals:
        logger.warning("No valid actuals with parseable start_time.")
        return []

    actuals_df = pd.DataFrame(normalized_actuals)
    # Deduplicate actuals by start_time, keeping the latest record if duplicates exist
    actuals_df = actuals_df.drop_duplicates(subset=["start_time"], keep="last")

    # Step 2: Normalize and parse forecasts
    normalized_forecasts: list[dict[str, Any]] = []
    for item in forecasts:
        raw_st = item.get("startTime") or item.get("start_time")
        st_utc = _to_utc_datetime(raw_st)
        if st_utc is None:
            continue

        raw_pt = item.get("publishTime") or item.get("publish_time")
        pt_utc = _to_utc_datetime(raw_pt)
        if pt_utc is None:
            continue

        raw_gen = item.get("generation") if "generation" in item else item.get("forecast_mw")
        fc_val = float(raw_gen) if raw_gen is not None and not pd.isna(raw_gen) else None

        normalized_forecasts.append(
            {
                "start_time": st_utc,
                "publish_time": pt_utc,
                "forecast_mw": fc_val,
            }
        )

    best_forecasts: pd.DataFrame
    if normalized_forecasts:
        forecasts_df = pd.DataFrame(normalized_forecasts)

        # For each forecast row, compute gate closure cutoff for its target delivery date
        forecasts_df["cutoff"] = forecasts_df["start_time"].apply(
            lambda st: compute_gate_closure_cutoff(st.date())
        )

        # Retain only pre-gate-closure forecasts (publish_time <= cutoff)
        pre_closure = forecasts_df[forecasts_df["publish_time"] <= forecasts_df["cutoff"]].copy()

        if not pre_closure.empty:
            # Sort by start_time and publish_time ascending, drop duplicates keeping last (max publish_time)
            best_forecasts = pre_closure.sort_values(
                by=["start_time", "publish_time"]
            ).drop_duplicates(subset=["start_time"], keep="last")[
                ["start_time", "forecast_mw", "publish_time"]
            ]
        else:
            logger.warning("No forecasts met the pre-gate-closure cutoff criteria.")
            best_forecasts = pd.DataFrame(columns=["start_time", "forecast_mw", "publish_time"])
    else:
        logger.warning("No forecasts provided.")
        best_forecasts = pd.DataFrame(columns=["start_time", "forecast_mw", "publish_time"])

    # Step 3: Join actuals with best forecasts
    merged_df = pd.merge(actuals_df, best_forecasts, on="start_time", how="left")

    # Step 4: Build final records with calculated settlement_period, error_mw, abs_error_mw
    results: list[dict[str, Any]] = []
    missing_forecast_count = 0
    missing_actual_count = 0

    for _, row in merged_df.iterrows():
        st: datetime = row["start_time"]
        delivery_date: date = st.date()

        # settlement period: period = (hour * 2) + (minute // 30) + 1 (range 1-48)
        settlement_period = (st.hour * 2) + (st.minute // 30) + 1

        actual_mw: float | None = (
            float(row["actual_mw"]) if pd.notna(row["actual_mw"]) else None
        )
        forecast_mw: float | None = (
            float(row["forecast_mw"]) if pd.notna(row["forecast_mw"]) else None
        )

        pt_val = row.get("publish_time")
        publish_time: datetime | None = (
            _to_utc_datetime(pt_val) if pd.notna(pt_val) else None
        )

        if actual_mw is None:
            missing_actual_count += 1
        if forecast_mw is None:
            missing_forecast_count += 1

        if actual_mw is not None and forecast_mw is not None:
            error_mw: float | None = round(forecast_mw - actual_mw, 2)
            abs_error_mw: float | None = round(abs(error_mw), 2)
        else:
            error_mw = None
            abs_error_mw = None

        results.append(
            {
                "start_time": st,
                "settlement_date": delivery_date,
                "settlement_period": settlement_period,
                "actual_mw": round(actual_mw, 2) if actual_mw is not None else None,
                "forecast_mw": round(forecast_mw, 2) if forecast_mw is not None else None,
                "publish_time": publish_time,
                "error_mw": error_mw,
                "abs_error_mw": abs_error_mw,
            }
        )

    if missing_forecast_count > 0:
        logger.warning(
            "%d out of %d settlement periods have missing or post-closure forecasts.",
            missing_forecast_count,
            len(results),
        )
    if missing_actual_count > 0:
        logger.warning(
            "%d out of %d settlement periods have missing actuals.",
            missing_actual_count,
            len(results),
        )

    # Sort deterministically by start_time ascending
    results.sort(key=lambda r: r["start_time"])
    return results
