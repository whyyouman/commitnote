from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.apis.dingestion import router as ingestion_router
from src.apis.retrieval import router as retrieval_router
from src.db import models  # noqa: F401  # register models with metadata
from src.db.session import Base, engine, get_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Services", version="0.1.0", lifespan=lifespan)

app.include_router(ingestion_router, prefix="/api")
app.include_router(retrieval_router, prefix="/api")


# @app.get("/")
# def root() -> dict[str, str]:
#     return {"message": "ok"}


# @app.get("/health")
# def health() -> dict[str, str]:
#     return {"status": "healthy"}


# @app.get("/health/db")
# def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
#     db.execute(text("SELECT 1"))
#     return {"database": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
