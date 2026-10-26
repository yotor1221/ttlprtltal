"""SQLAlchemy database models for UK Wind Analytics."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SettlementRecord(Base):
    """Database model storing half-hourly wind generation and forecast settlement records."""

    __tablename__ = "settlement_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, unique=True)  # UTC
    settlement_date: Mapped[date] = mapped_column(Date, index=True)
    settlement_period: Mapped[int] = mapped_column(Integer)  # 1-48
    actual_mw: Mapped[float | None] = mapped_column(Float, nullable=True)
    forecast_mw: Mapped[float | None] = mapped_column(Float, nullable=True)
    publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # publishTime of chosen forecast
    error_mw: Mapped[float | None] = mapped_column(Float, nullable=True)  # forecast - actual
    abs_error_mw: Mapped[float | None] = mapped_column(Float, nullable=True)  # |error|

    def __repr__(self) -> str:
        return (
            f"<SettlementRecord(id={self.id}, "
            f"start_time='{self.start_time}', "
            f"period={self.settlement_period}, "
            f"actual_mw={self.actual_mw}, "
            f"forecast_mw={self.forecast_mw})>"
        )
