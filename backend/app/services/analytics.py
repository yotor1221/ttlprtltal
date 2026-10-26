"""Pure computation service for wind forecast analytics and error profiling."""

import logging
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SettlementRecord
from app.schemas import ErrorBucket, ErrorProfileResponse, OverviewMetrics, PeriodErrorProfile

logger = logging.getLogger(__name__)


def compute_overview(db: Session) -> OverviewMetrics:
    """Compute accuracy metrics for the entire month.

    Queries all records in settlement_records:
    - Filters to only non-null pairs (both actual_mw and forecast_mw present)
    - Computes:
      - mae: Mean Absolute Error across non-null pairs
      - rmse: Root Mean Squared Error across non-null pairs
      - mean_bias: Mean Error across non-null pairs (forecast - actual)
      - total_actual_mwh: sum(actual_mw) * 0.5 (half-hour periods)
      - total_forecast_mwh: sum(forecast_mw) * 0.5
      - overforecast_pct: % of records where error_mw > 0
      - underforecast_pct: % of records where error_mw < 0
      - max_overforecast_mw: max(error_mw)
      - max_underforecast_mw: min(error_mw) (most negative)
      - data_completeness_pct: (non-null pairs / total records) * 100
    """
    stmt = select(SettlementRecord).order_by(SettlementRecord.start_time)
    records = list(db.scalars(stmt).all())
    total_records = len(records)

    # Filter to non-null pairs
    valid_records = [
        r
        for r in records
        if r.actual_mw is not None
        and r.forecast_mw is not None
        and r.error_mw is not None
        and r.abs_error_mw is not None
    ]
    valid_count = len(valid_records)

    data_completeness_pct = (
        round((valid_count / total_records) * 100.0, 2) if total_records > 0 else 0.0
    )

    if valid_count == 0:
        logger.warning("No valid non-null settlement records found for overview metrics.")
        return OverviewMetrics(
            mae=0.0,
            rmse=0.0,
            mean_bias=0.0,
            total_actual_mwh=0.0,
            total_forecast_mwh=0.0,
            overforecast_pct=0.0,
            underforecast_pct=0.0,
            max_overforecast_mw=0.0,
            max_underforecast_mw=0.0,
            data_completeness_pct=data_completeness_pct,
        )

    errors = np.array([r.error_mw for r in valid_records], dtype=float)
    abs_errors = np.array([r.abs_error_mw for r in valid_records], dtype=float)
    actuals = np.array([r.actual_mw for r in valid_records], dtype=float)
    forecasts = np.array([r.forecast_mw for r in valid_records], dtype=float)

    mae = round(float(np.mean(abs_errors)), 2)
    rmse = round(float(np.sqrt(np.mean(errors**2))), 2)
    mean_bias = round(float(np.mean(errors)), 2)

    # Half-hourly periods: MW * 0.5 hours = MWh
    total_actual_mwh = round(float(np.sum(actuals) * 0.5), 2)
    total_forecast_mwh = round(float(np.sum(forecasts) * 0.5), 2)

    overforecast_count = int(np.sum(errors > 0))
    underforecast_count = int(np.sum(errors < 0))

    overforecast_pct = round((overforecast_count / valid_count) * 100.0, 2)
    underforecast_pct = round((underforecast_count / valid_count) * 100.0, 2)

    max_overforecast_mw = round(float(np.max(errors)), 2)
    max_underforecast_mw = round(float(np.min(errors)), 2)

    return OverviewMetrics(
        mae=mae,
        rmse=rmse,
        mean_bias=mean_bias,
        total_actual_mwh=total_actual_mwh,
        total_forecast_mwh=total_forecast_mwh,
        overforecast_pct=overforecast_pct,
        underforecast_pct=underforecast_pct,
        max_overforecast_mw=max_overforecast_mw,
        max_underforecast_mw=max_underforecast_mw,
        data_completeness_pct=data_completeness_pct,
    )


def compute_error_profile(db: Session) -> ErrorProfileResponse:
    """Compute error profile aggregations.

    1. by_settlement_period: Group by settlement_period (1-48)
       For each period: avg actual_mw, avg forecast_mw, avg abs_error_mw (as avg_mae)
       Using only non-null pairs.
    2. error_distribution: Histogram of error_mw partitioned into buckets:
       '< -1000', '-1000 to -500', '-500 to 0', '0 to 500', '500 to 1000', '> 1000'
       Count and percentage for each bucket.
    3. data_completeness_pct: Overall percentage of valid paired records.
    """
    stmt = select(SettlementRecord).order_by(SettlementRecord.settlement_period)
    records = list(db.scalars(stmt).all())
    total_records = len(records)

    # Filter to non-null pairs
    valid_records = [
        r
        for r in records
        if r.actual_mw is not None
        and r.forecast_mw is not None
        and r.error_mw is not None
        and r.abs_error_mw is not None
    ]
    valid_count = len(valid_records)

    data_completeness_pct = (
        round((valid_count / total_records) * 100.0, 2) if total_records > 0 else 0.0
    )

    # 1. By settlement period aggregation (1 through 48)
    period_profiles: list[PeriodErrorProfile] = []
    for period in range(1, 49):
        p_records = [r for r in valid_records if r.settlement_period == period]
        if p_records:
            avg_actual = round(float(np.mean([r.actual_mw for r in p_records])), 2)
            avg_forecast = round(float(np.mean([r.forecast_mw for r in p_records])), 2)
            avg_mae = round(float(np.mean([r.abs_error_mw for r in p_records])), 2)
        else:
            avg_actual = None
            avg_forecast = None
            avg_mae = None

        period_profiles.append(
            PeriodErrorProfile(
                settlement_period=period,
                avg_actual_mw=avg_actual,
                avg_forecast_mw=avg_forecast,
                avg_mae=avg_mae,
            )
        )

    # 2. Histogram error distribution
    bucket_definitions: list[tuple[str, Any]] = [
        ("< -1000", lambda e: e < -1000.0),
        ("-1000 to -500", lambda e: -1000.0 <= e < -500.0),
        ("-500 to 0", lambda e: -500.0 <= e < 0.0),
        ("0 to 500", lambda e: 0.0 <= e < 500.0),
        ("500 to 1000", lambda e: 500.0 <= e <= 1000.0),
        ("> 1000", lambda e: e > 1000.0),
    ]

    errors = [r.error_mw for r in valid_records if r.error_mw is not None]

    error_buckets: list[ErrorBucket] = []
    for label, condition in bucket_definitions:
        count = sum(1 for e in errors if condition(e))
        percentage = round((count / valid_count) * 100.0, 2) if valid_count > 0 else 0.0
        error_buckets.append(
            ErrorBucket(
                range_label=label,
                count=count,
                percentage=percentage,
            )
        )

    return ErrorProfileResponse(
        by_settlement_period=period_profiles,
        error_distribution=error_buckets,
        data_completeness_pct=data_completeness_pct,
    )
