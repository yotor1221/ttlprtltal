"""FastAPI application entry point for UK Wind Analytics backend."""

import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import BackgroundTasks, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine, get_db, init_db
from app.models import SettlementRecord
from app.routers import daily, metrics
from app.schemas import HealthResponse

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


async def seed_in_background() -> None:
    """Seed database in background if empty. Falls back to mock data on API failure."""
    logger.info("Starting background database seeding...")
    try:
        from app.services.elexon_client import fetch_all_data
        from app.services.processor import match_forecasts_to_actuals

        logger.info("Background seeding: Fetching data from Elexon BMRS...")
        actuals, forecasts = await fetch_all_data()
        records = match_forecasts_to_actuals(actuals, forecasts)

        db = SessionLocal()
        try:
            for rec in records:
                db.add(rec if isinstance(rec, SettlementRecord) else SettlementRecord(**rec))
            db.commit()
            logger.info("Background seeding complete: %d records inserted.", len(records))
        finally:
            db.close()
    except Exception as e:
        logger.warning("Live API seeding failed: %s. Falling back to mock data...", e)
        try:
            from app.fixtures.mock_data import generate_mock_settlement_records

            mock_records = generate_mock_settlement_records()
            db = SessionLocal()
            try:
                for rec in mock_records:
                    db.add(rec if isinstance(rec, SettlementRecord) else SettlementRecord(**rec))
                db.commit()
                logger.info("Mock data seeding complete: %d records inserted.", len(mock_records))
            finally:
                db.close()
        except Exception as mock_err:
            logger.error("Mock data seeding failed: %s", mock_err)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling database initialization and background seeding."""
    init_db()

    db = SessionLocal()
    try:
        has_records = db.scalar(select(func.count(SettlementRecord.id))) or 0
    finally:
        db.close()

    if has_records == 0:
        logger.info("Database empty on startup; scheduling background seeding task...")
        asyncio.create_task(seed_in_background())
    else:
        logger.info("Database has %d existing records; skipping seed.", has_records)

    yield


app = FastAPI(
    title="UK Wind Analytics API",
    description="Backend API analyzing UK wind generation actuals vs day-ahead forecasts for January 2026.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(metrics.router)
app.include_router(daily.router)


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    summary="Health Check",
    tags=["health"],
)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """Return API health status, record count, and completeness for January 2026 data."""
    total_count = db.scalar(select(func.count(SettlementRecord.id))) or 0
    non_null_count = (
        db.scalar(
            select(func.count(SettlementRecord.id)).where(
                SettlementRecord.actual_mw.is_not(None),
                SettlementRecord.forecast_mw.is_not(None),
            )
        )
        or 0
    )
    data_completeness_pct = (
        round((non_null_count / total_count * 100.0), 2) if total_count > 0 else 0.0
    )

    return HealthResponse(
        status="ok",
        total_records=total_count,
        period_covered=settings.target_month,
        data_completeness_pct=data_completeness_pct,
    )
