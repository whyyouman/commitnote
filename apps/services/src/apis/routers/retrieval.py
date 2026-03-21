from fastapi import APIRouter, status

from src.apis.models.retrieval import RetrievalHit, RetrievalQueryRequest, RetrievalQueryResponse
from src.apis.services.retrieval import query_chroma

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


@router.post(
    "/query",
    response_model=RetrievalQueryResponse,
    status_code=status.HTTP_200_OK,
)
async def retrieve(payload: RetrievalQueryRequest) -> RetrievalQueryResponse:
    """Search ingested document chunks in Chroma using the same embedding model as ingestion."""
    rows = query_chroma(payload.query, k=payload.k)
    hits = [
        RetrievalHit(
            id=str(r["id"]),
            content=r["content"],
            metadata=dict(r.get("metadata") or {}),
            distance=r.get("distance"),
        )
        for r in rows
    ]
    return RetrievalQueryResponse(query=payload.query, hits=hits)
