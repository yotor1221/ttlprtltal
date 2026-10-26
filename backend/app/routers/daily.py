"""FastAPI router for daily wind generation settlement periods and thermal procurement."""

from datetime import date as dt_date, datetime, timezone
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SettlementRecord
from app.schemas import DailyResponse, SettlementPeriodDetail

router = APIRouter(prefix="/api/v1")


@router.get(
    "/daily/{date}",
    response_model=DailyResponse,
    summary="Get daily settlement periods and thermal requirements",
    description="Retrieve half-hourly wind generation, day-ahead forecast, and implied thermal dispatch for a date in January 2026.",
    tags=["daily"],
)
def get_daily_settlement(
    date: str,
    demand_baseline_mw: float = Query(
        default=25000.0,
        description="Assumed national electrical demand baseline in MW for calculating thermal gap.",
    ),
    db: Session = Depends(get_db),
) -> DailyResponse:
    """Retrieve settlement period details and daily performance metrics for a specified day in January 2026."""
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date format '{date}'. Date must be in YYYY-MM-DD format.",
        )

    if not (dt_date(2026, 1, 1) <= parsed_date <= dt_date(2026, 1, 31)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Date '{date}' is out of range. Date must be within January 2026 (2026-01-01 to 2026-01-31).",
        )

    stmt = (
        select(SettlementRecord)
        .where(SettlementRecord.settlement_date == parsed_date)
        .order_by(SettlementRecord.settlement_period.asc())
    )
    records = list(db.scalars(stmt).all())

    period_details: list[SettlementPeriodDetail] = []
    valid_errors: list[float] = []

    for rec in records:
        # Format UTC ISO string for start_time
        if rec.start_time.tzinfo is None:
            start_iso = rec.start_time.replace(tzinfo=timezone.utc).isoformat()
        else:
            start_iso = rec.start_time.astimezone(timezone.utc).isoformat()

        # Format UTC ISO string for publish_time
        publish_iso: str | None = None
        if rec.publish_time is not None:
            if rec.publish_time.tzinfo is None:
                publish_iso = rec.publish_time.replace(tzinfo=timezone.utc).isoformat()
            else:
                publish_iso = rec.publish_time.astimezone(timezone.utc).isoformat()

        implied_thermal = (
            max(0.0, demand_baseline_mw - rec.forecast_mw)
            if rec.forecast_mw is not None
            else None
        )
        actual_thermal = (
            max(0.0, demand_baseline_mw - rec.actual_mw)
            if rec.actual_mw is not None
            else None
        )

        detail = SettlementPeriodDetail(
            settlement_period=rec.settlement_period,
            start_time=start_iso,
            actual_mw=rec.actual_mw,
            forecast_mw=rec.forecast_mw,
            error_mw=rec.error_mw,
            publish_time=publish_iso,
            implied_thermal_procurement_mw=implied_thermal,
            actual_thermal_needed_mw=actual_thermal,
        )
        period_details.append(detail)

        if rec.actual_mw is not None and rec.forecast_mw is not None:
            err = rec.error_mw if rec.error_mw is not None else (rec.forecast_mw - rec.actual_mw)
            valid_errors.append(err)

    # Standard settlement day has 48 half-hour periods
    total_periods = max(len(records), 48) if records else 48
    completeness_pct = round((len(valid_errors) / total_periods) * 100.0, 2)

    if valid_errors:
        daily_mae = round(sum(abs(e) for e in valid_errors) / len(valid_errors), 2)
        daily_rmse = round(math.sqrt(sum(e**2 for e in valid_errors) / len(valid_errors)), 2)
        daily_bias = round(sum(valid_errors) / len(valid_errors), 2)
    else:
        daily_mae = None
        daily_rmse = None
        daily_bias = None

    return DailyResponse(
        date=date,
        periods=period_details,
        daily_mae=daily_mae,
        daily_rmse=daily_rmse,
        daily_bias=daily_bias,
        data_completeness_pct=completeness_pct,
    )
