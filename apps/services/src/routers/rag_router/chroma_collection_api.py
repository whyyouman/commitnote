"""HTTP API for ChromaDB collection management."""

from __future__ import annotations

from functools import lru_cache

import chromadb
from chromadb.errors import NotFoundError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from routers.rag_router.retrieval_service_api import get_retriever

# Same persistence path as `pipeline.rag.ingestion.embedding` and `retrieval.retriever`.
_CHROMA_PATH = "data/chroma"

router = APIRouter(prefix="/chroma", tags=["chromadb"])


@lru_cache(maxsize=1)
def _chroma_client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=_CHROMA_PATH)


class DeleteCollectionResponse(BaseModel):
    deleted: bool = True
    name: str = Field(..., description="Name of the removed collection")


@router.delete(
    "/collections/{collection_name}",
    response_model=DeleteCollectionResponse,
    responses={404: {"description": "No collection with that name"}},
)
def delete_collection(collection_name: str) -> DeleteCollectionResponse:
    name = collection_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="collection_name must not be empty.")

    client = _chroma_client()
    try:
        client.delete_collection(name=name)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Collection not found: {name!r}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    get_retriever.cache_clear()

    return DeleteCollectionResponse(name=name)
