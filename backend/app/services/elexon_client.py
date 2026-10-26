"""Async HTTP client for Elexon BMRS API (FUELHH and WINDFOR streams)."""

import asyncio
from datetime import date, datetime, timedelta, timezone
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 60.0  # seconds
MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0  # seconds (1s, 2s, 4s)


async def _get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any],
) -> list[dict[str, Any]]:
    """Execute a GET request with 3 retries and exponential backoff (1s, 2s, 4s).

    Raises RuntimeError with clear message if non-200 responses persist after retries.
    """
    backoff = INITIAL_BACKOFF
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.debug(
                "Requesting %s (attempt %d/%d) with params %s",
                url,
                attempt,
                MAX_RETRIES,
                params,
            )
            response = await client.get(url, params=params, timeout=DEFAULT_TIMEOUT)

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                    return data["data"]
                return []

            logger.warning(
                "Elexon API non-200 response [%d] for %s (attempt %d/%d): %s",
                response.status_code,
                url,
                attempt,
                MAX_RETRIES,
                response.text[:200],
            )
            response.raise_for_status()

        except (httpx.HTTPError, httpx.RequestError) as exc:
            last_error = exc
            logger.warning(
                "Elexon API error on attempt %d/%d for %s: %s",
                attempt,
                MAX_RETRIES,
                url,
                exc,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(backoff)
                backoff *= 2.0
            else:
                break

    raise RuntimeError(
        f"Elexon API request failed after {MAX_RETRIES} retries for URL {url} "
        f"with params {params}. Final error: {last_error}"
    )


async def fetch_fuelhh_wind(
    client: httpx.AsyncClient,
    settlement_date: str,
) -> list[dict[str, Any]]:
    """Fetch half-hourly wind generation actuals (FUELHH) for a specific settlement date.

    Endpoint: GET /datasets/FUELHH/stream?settlementDate={date}&fuelType=WIND
    Returns list of dicts with keys:
    - startTime
    - generation
    - settlementDate
    - settlementPeriod
    - publishTime
    """
    url = f"{settings.elexon_base_url}/datasets/FUELHH/stream"
    params = {
        "settlementDate": settlement_date,
        "fuelType": "WIND",
    }

    raw_records = await _get_with_retry(client, url, params)

    results: list[dict[str, Any]] = []
    for item in raw_records:
        gen_val = item.get("generation")
        generation = float(gen_val) if gen_val is not None else None
        period_val = item.get("settlementPeriod")
        settlement_period = int(period_val) if period_val is not None else None

        results.append(
            {
                "startTime": item.get("startTime"),
                "generation": generation,
                "settlementDate": item.get("settlementDate") or settlement_date,
                "settlementPeriod": settlement_period,
                "publishTime": item.get("publishTime"),
            }
        )

    return results


async def fetch_windfor(
    client: httpx.AsyncClient,
    publish_from: str,
    publish_to: str,
) -> list[dict[str, Any]]:
    """Fetch wind generation forecasts (WINDFOR) published within a date-time window.

    Endpoint: GET /datasets/WINDFOR/stream?publishDateTimeFrom={from}&publishDateTimeTo={to}
    Returns list of dicts with keys:
    - startTime
    - publishTime
    - generation
    """
    url = f"{settings.elexon_base_url}/datasets/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": publish_from,
        "publishDateTimeTo": publish_to,
    }

    raw_records = await _get_with_retry(client, url, params)

    results: list[dict[str, Any]] = []
    for item in raw_records:
        gen_val = item.get("generation")
        generation = float(gen_val) if gen_val is not None else None

        results.append(
            {
                "startTime": item.get("startTime"),
                "publishTime": item.get("publishTime"),
                "generation": generation,
            }
        )

    return results


async def fetch_all_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Orchestrate data ingestion for January 2026 from Elexon BMRS.

    1. FUELHH: Loop through 2026-01-01 to 2026-01-31 with 500ms delay between requests.
    2. WINDFOR: Fetch in daily publish-time chunks from 2025-12-29 to 2026-01-31 with 500ms delay.
       (We need forecasts published before gate closure for Jan 1 delivery).

    Returns:
        tuple of (all_actuals, all_forecasts)
    """
    all_actuals: list[dict[str, Any]] = []
    all_forecasts: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        # Step 1: Ingest FUELHH Actuals (2026-01-01 to 2026-01-31)
        logger.info("[FUELHH] Starting ingestion for January 2026 (31 days)...")
        print("[INFO] Fetching FUELHH wind actuals for January 2026 (2026-01-01 to 2026-01-31)...")

        for day in range(1, 32):
            settlement_date = f"2026-01-{day:02d}"
            try:
                day_records = await fetch_fuelhh_wind(client, settlement_date)
                all_actuals.extend(day_records)
                logger.info(
                    "[FUELHH] Fetched %d records for %s", len(day_records), settlement_date
                )
                print(f"[INFO]   FUELHH {settlement_date}: {len(day_records)} records")
            except Exception as exc:
                logger.error("[FUELHH] Error fetching %s: %s", settlement_date, exc)
                print(f"[ERROR]  FUELHH {settlement_date} failed: {exc}")
                raise

            await asyncio.sleep(0.5)  # 500ms delay between requests

        # Step 2: Ingest WINDFOR Forecasts (2025-12-29 to 2026-01-31)
        logger.info("[WINDFOR] Starting forecast ingestion from 2025-12-29 to 2026-01-31...")
        print("[INFO] Fetching WINDFOR forecasts in daily publish-time chunks (2025-12-29 to 2026-01-31)...")

        start_date = date(2025, 12, 29)
        end_date = date(2026, 1, 31)
        delta_days = (end_date - start_date).days + 1

        for i in range(delta_days):
            current_date = start_date + timedelta(days=i)
            next_date = current_date + timedelta(days=1)
            publish_from = f"{current_date.isoformat()}T00:00:00Z"
            publish_to = f"{next_date.isoformat()}T00:00:00Z"

            try:
                chunk_records = await fetch_windfor(client, publish_from, publish_to)
                all_forecasts.extend(chunk_records)
                logger.info(
                    "[WINDFOR] Fetched %d forecasts for publish window [%s -> %s]",
                    len(chunk_records),
                    publish_from,
                    publish_to,
                )
                print(
                    f"[INFO]   WINDFOR [{current_date.isoformat()}]: {len(chunk_records)} forecasts"
                )
            except Exception as exc:
                logger.error(
                    "[WINDFOR] Error fetching publish window [%s -> %s]: %s",
                    publish_from,
                    publish_to,
                    exc,
                )
                print(f"[ERROR]  WINDFOR [{current_date.isoformat()}] failed: {exc}")
                raise

            await asyncio.sleep(0.5)  # 500ms delay between requests

    logger.info(
        "Ingestion complete: %d actuals, %d forecasts fetched",
        len(all_actuals),
        len(all_forecasts),
    )
    print(
        f"[INFO] Ingestion complete: {len(all_actuals)} actuals, {len(all_forecasts)} forecasts fetched."
    )
    return all_actuals, all_forecasts
