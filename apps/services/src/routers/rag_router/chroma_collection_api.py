"""HTTP API for ChromaDB collection management."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

import chromadb
from chromadb.errors import NotFoundError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pipeline.rag.chroma_config import get_chroma_path
from routers.rag_router.retrieval_service_api import get_retriever

if TYPE_CHECKING:
    from chromadb.api import ClientAPI

router = APIRouter(prefix="/chroma", tags=["chromadb"])


@lru_cache(maxsize=1)
def _chroma_client() -> ClientAPI:
    return chromadb.PersistentClient(path=get_chroma_path())


class DeleteCollectionResponse(BaseModel):
    deleted: bool = True
    name: str = Field(..., description="Name of the removed collection")


class ListCollectionsResponse(BaseModel):
    collections: list[str] = Field(
        default_factory=list, description="All available ChromaDB collection names"
    )


@router.get("/collections", response_model=ListCollectionsResponse)
def list_collections() -> ListCollectionsResponse:
    client = _chroma_client()
    try:
        raw_collections = client.list_collections()
        names = sorted([c.name if hasattr(c, "name") else str(c) for c in raw_collections])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return ListCollectionsResponse(collections=names)


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
