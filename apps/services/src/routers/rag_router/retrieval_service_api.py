"""HTTP API for hybrid RAG retrieval (BM25 + dense + RRF fusion, then cross-encoder rerank)."""

from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_core.documents import Document

from pipeline.rag.retrieval.retriever import Retriever

router = APIRouter(prefix="/retrieve", tags=["retrieval"])


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    return Retriever()


class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query")
    k: int = Field(10, ge=1, le=100, description="Number of chunks to return")


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


@router.post("/", response_model=RetrieveResponse)
def retrieve_documents(body: RetrieveRequest) -> RetrieveResponse:
    try:
        retriever = get_retriever()
        docs = retriever.retrieve(body.query.strip(), k=body.k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return RetrieveResponse(chunks=_to_chunks(docs))
