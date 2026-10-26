"""Application configuration settings module."""

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    database_url: str = "sqlite:///./data/wind_analytics.db"
    cors_origins: list[str] = ["*"]
    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    target_month: str = "2026-01"
    demand_baseline_mw: float = 25000.0

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
