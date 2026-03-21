from typing import TypedDict

from src.pipeline.rag.ingestion.index import DataIngestion


class IngestionPipelineResult(TypedDict):
    files_saved: int
    chunks_indexed: int
    sources: list[str]


def run_ingestion_pipeline(file_paths: list[str]) -> IngestionPipelineResult:
    """Load PDFs, clean, chunk, embed, and persist to Chroma."""
    if not file_paths:
        return {"files_saved": 0, "chunks_indexed": 0, "sources": []}

    di = DataIngestion()
    data = di.load(file_paths)
    data = di.cleanData(data)
    data = di.dataChunking(data)
    data = di.dataEmbedding(data)    
    di.dataStorage(data)

    return {
        "files_saved": len(file_paths),
        "chunks_indexed": len(data),
        "sources": list(file_paths),
    }
