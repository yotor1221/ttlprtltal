"""FastAPI router for wind generation metrics and error profile analytics."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ErrorProfileResponse, OverviewMetrics
from app.services.analytics import compute_error_profile, compute_overview

router = APIRouter(prefix="/api/v1")


@router.get(
    "/metrics/overview",
    response_model=OverviewMetrics,
    summary="Get monthly overview metrics",
    description="Compute and return high-level wind generation forecast error metrics for January 2026.",
    tags=["metrics"],
)
def get_metrics_overview(
    db: Session = Depends(get_db),
) -> OverviewMetrics:
    """Retrieve monthly wind generation summary metrics including MAE, RMSE, and bias."""
    return compute_overview(db)


@router.get(
    "/analytics/error-profile",
    response_model=ErrorProfileResponse,
    summary="Get forecast error profile",
    description="Compute settlement period diurnal pattern and distribution histogram of forecast errors.",
    tags=["analytics"],
)
def get_error_profile(
    db: Session = Depends(get_db),
) -> ErrorProfileResponse:
    """Retrieve forecast error diurnal breakdown by settlement period and error distribution."""
    return compute_error_profile(db)
