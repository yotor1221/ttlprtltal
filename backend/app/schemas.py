"""Pydantic v2 schemas and response models for UK Wind Analytics API."""

from datetime import date as dt_date
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class HealthResponse(BaseModel):
    """Health check response schema."""

    model_config = ConfigDict(from_attributes=True)

    status: str
    total_records: int
    period_covered: str
    data_completeness_pct: float  # percentage of non-null paired observations


class OverviewMetrics(BaseModel):
    """Monthly summary overview metrics schema."""

    model_config = ConfigDict(from_attributes=True)

    mae: float  # Mean Absolute Error (MW)
    rmse: float  # Root Mean Squared Error (MW)
    mean_bias: float  # Mean Error (MW)
    total_actual_mwh: float
    total_forecast_mwh: float
    overforecast_pct: float
    underforecast_pct: float
    max_overforecast_mw: float
    max_underforecast_mw: float
    data_completeness_pct: float


class SettlementPeriodDetail(BaseModel):
    """Half-hour settlement period detail schema."""

    model_config = ConfigDict(from_attributes=True)

    settlement_period: int
    start_time: str  # ISO UTC string
    actual_mw: float | None
    forecast_mw: float | None
    error_mw: float | None
    publish_time: str | None  # ISO UTC string
    implied_thermal_procurement_mw: float | None  # max(0, demand - forecast)
    actual_thermal_needed_mw: float | None  # max(0, demand - actual)

    @field_validator("start_time", mode="before")
    @classmethod
    def serialize_start_time(cls, v: Any) -> str:
        """Serialize start_time datetime to ISO UTC string."""
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            return v.isoformat()
        return str(v)

    @field_validator("publish_time", mode="before")
    @classmethod
    def serialize_publish_time(cls, v: Any) -> str | None:
        """Serialize publish_time datetime to ISO UTC string."""
        if v is None:
            return None
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            return v.isoformat()
        return str(v)


class DailyResponse(BaseModel):
    """Daily breakdown response schema."""

    model_config = ConfigDict(from_attributes=True)

    date: str
    periods: list[SettlementPeriodDetail]
    daily_mae: float | None
    daily_rmse: float | None
    daily_bias: float | None
    data_completeness_pct: float

    @field_validator("date", mode="before")
    @classmethod
    def serialize_date(cls, v: Any) -> str:
        """Serialize date to ISO format string."""
        if isinstance(v, (datetime, dt_date)):
            return v.isoformat()
        return str(v)


class PeriodErrorProfile(BaseModel):
    """Error profile aggregated by settlement period (1-48)."""

    model_config = ConfigDict(from_attributes=True)

    settlement_period: int
    avg_actual_mw: float | None
    avg_forecast_mw: float | None
    avg_mae: float | None


class ErrorBucket(BaseModel):
    """Histogram bucket for forecast error distribution."""

    model_config = ConfigDict(from_attributes=True)

    range_label: str
    count: int
    percentage: float


class ErrorProfileResponse(BaseModel):
    """Forecast error profile response schema."""

    model_config = ConfigDict(from_attributes=True)

    by_settlement_period: list[PeriodErrorProfile]
    error_distribution: list[ErrorBucket]
    data_completeness_pct: float
