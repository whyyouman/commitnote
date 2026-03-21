from typing import Any

from pydantic import BaseModel, Field


class RetrievalQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural-language search query")
    k: int = Field(5, ge=1, le=100, description="Number of chunks to return")


class RetrievalHit(BaseModel):
    id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    distance: float | None = Field(None, description="Chroma distance (lower is closer, depending on space)")


class RetrievalQueryResponse(BaseModel):
    query: str
    hits: list[RetrievalHit]
