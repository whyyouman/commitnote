from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _services_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def _default_sqlite_url() -> str:
    path = _services_root() / "data" / "commitnote.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path.as_posix()}"


def _default_chroma_dir() -> str:
    path = _services_root() / "data" / "chroma"
    path.mkdir(parents=True, exist_ok=True)
    return str(path.as_posix())


def _default_upload_dir() -> str:
    path = _services_root() / "data" / "uploads"
    path.mkdir(parents=True, exist_ok=True)
    return str(path.as_posix())


class Settings(BaseSettings):
    """Service configuration; override via environment or `.env` in `apps/services/`."""

    database_url: str = _default_sqlite_url()
    chroma_persist_dir: str = _default_chroma_dir()
    chroma_collection_name: str = "documents"
    upload_dir: str = _default_upload_dir()

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
