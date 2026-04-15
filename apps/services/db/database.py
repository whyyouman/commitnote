import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv


# Load project-level .env so POSTGRES_* vars are available.
_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=False)


def _build_database_url() -> str | None:
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    db_name = os.getenv("POSTGRES_DB")
    port = os.getenv("POSTGRES_PORT", "5432")

    if not all([user, password, host, db_name]):
        return None
    return f"postgresql://{user}:{password}@{host}:{port}/{db_name}"


SQLALCHEMY_DATABASE_URL = _build_database_url()
engine = create_engine(SQLALCHEMY_DATABASE_URL) if SQLALCHEMY_DATABASE_URL else None
SessionLocal = (
    sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
)
Base = declarative_base()


def get_db():
    if SessionLocal is None:
        raise RuntimeError(
            "Postgres is not configured. Set POSTGRES_USER, POSTGRES_PASSWORD, "
            "POSTGRES_HOST, POSTGRES_DB and optionally POSTGRES_PORT."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()