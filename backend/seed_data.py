"""Seed the database with January 2026 wind analytics data from Elexon BMRS."""

import argparse
import asyncio
import logging
import os
import sys

# Add parent directory to path so app modules can be imported directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import SessionLocal, engine, init_db
from app.fixtures.mock_data import generate_mock_settlement_records
from app.models import SettlementRecord
from app.services.elexon_client import fetch_all_data
from app.services.processor import match_forecasts_to_actuals

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("seed_data")


def seed_database(force: bool = False, use_mock: bool = False) -> int:
    """Seed the database with January 2026 wind settlement records.

    Args:
        force: If True, delete existing records and re-seed.
        use_mock: If True, skip live Elexon API and use embedded realistic mock fixture.

    Returns:
        0 on success, 1 on error.
    """
    print("[INFO] Initializing database tables...")
    init_db()

    with SessionLocal() as db:
        existing_count = db.query(SettlementRecord).count()

        if existing_count > 0 and not force:
            print(
                f"[INFO] Database already contains {existing_count} records. "
                "Skipping seed (use --force to re-seed)."
            )
            return 0

        if force and existing_count > 0:
            print(f"[INFO] --force specified: deleting {existing_count} existing records...")
            deleted = db.query(SettlementRecord).delete()
            db.commit()
            print(f"[INFO] Successfully removed {deleted} existing records.")

    records: list[dict] = []

    if use_mock:
        print("[INFO] Generating mock settlement records for January 2026 (seed=42)...")
        records = generate_mock_settlement_records()
        print(f"[INFO] Generated {len(records)} realistic mock settlement records.")
    else:
        try:
            print("[INFO] Connecting to Elexon BMRS API to fetch January 2026 data...")
            actuals, forecasts = asyncio.run(fetch_all_data())
            print(
                f"[INFO] Fetched {len(actuals)} actuals and {len(forecasts)} forecasts."
            )

            if not actuals:
                raise RuntimeError("No actual generation records returned from Elexon API.")

            print("[INFO] Running Day-Ahead Gate Closure matching processor...")
            records = match_forecasts_to_actuals(actuals, forecasts)
            print(f"[INFO] Successfully matched {len(records)} settlement records.")

        except Exception as exc:
            print(f"[ERROR] Live Elexon API ingestion encountered an error: {exc}")
            print("[WARNING] Falling back to embedded mock fixture data for January 2026...")
            records = generate_mock_settlement_records()
            print(f"[INFO] Generated {len(records)} fallback mock settlement records.")

    if not records:
        print("[ERROR] No records to insert into database.", file=sys.stderr)
        return 1

    try:
        print(f"[INFO] Inserting {len(records)} records into database...")
        with SessionLocal() as db:
            db_records = [SettlementRecord(**rec) for rec in records]
            db.add_all(db_records)
            db.commit()
            total_in_db = db.query(SettlementRecord).count()

        print(
            f"[INFO] Successfully inserted {len(records)} settlement records. "
            f"Total records in DB: {total_in_db}."
        )
        print("[INFO] Seeding completed successfully.")
        return 0

    except Exception as exc:
        logger.exception("Failed to insert records into database")
        print(f"[ERROR] Database insertion failed: {exc}", file=sys.stderr)
        return 1


def main() -> None:
    """CLI entrypoint for seeding script."""
    parser = argparse.ArgumentParser(
        description="Seed the UK Wind Analytics database with January 2026 data."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Drop existing settlement records and re-seed from scratch.",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Seed from embedded mock fixture instead of querying live Elexon API.",
    )

    args = parser.parse_args()
    exit_code = seed_database(force=args.force, use_mock=args.mock)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
