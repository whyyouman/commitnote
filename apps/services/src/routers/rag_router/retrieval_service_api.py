"""HTTP API for hybrid RAG retrieval (BM25 + dense + RRF fusion, then cross-encoder rerank)."""

from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_core.documents import Document

from pipeline.rag.retrieval.retriever import Retriever

router = APIRouter(prefix="/notes", tags=["retrieval"])


@lru_cache(maxsize=32)
def get_retriever(note_uid: str) -> Retriever:
    return Retriever(note_uid=note_uid)


class RetrieveRequest(BaseModel):
    note_uid: str = Field(..., min_length=1, description="Ingestion note_uid / Chroma collection")
    query: str = Field(..., min_length=1, description="Search query")
    k: int = Field(10, ge=1, le=100, description="Number of chunks to return")
    title: str | None = Field(
        default=None,
        max_length=255,
        description="Optional title for a new session.",
    )


class RetrievedChunk(BaseModel):
    content: str
    metadata: dict | None = None


class RetrieveResponse(BaseModel):
    chunks: list[RetrievedChunk]


def _to_chunks(docs: list[Document]) -> list[RetrievedChunk]:
    return [
        RetrievedChunk(content=d.page_content, metadata=d.metadata or None)
        for d in docs
    ]


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_documents(body: RetrieveRequest) -> RetrieveResponse:
    note_uid = body.note_uid.strip()
    query_text = body.query.strip()

    try:
        retriever = get_retriever(note_uid=note_uid)
        docs = retriever.retrieve(query_text, k=body.k)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    # Chat session/message DB persistence is intentionally disabled for now.
    # TODO: Re-enable once chat_sessions.user_id nullability and migration state
    # are consistent across environments.
    return RetrieveResponse(chunks=_to_chunks(docs))
