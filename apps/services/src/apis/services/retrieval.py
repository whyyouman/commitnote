import os
from typing import Any

import chromadb
from langchain_ollama import OllamaEmbeddings

from src.db.config import settings


def query_chroma(query: str, k: int = 5) -> list[dict[str, Any]]:
    """Embed ``query`` with Ollama (same settings as ingestion) and search Chroma."""
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    try:
        collection = client.get_collection(settings.chroma_collection_name)
    except Exception:
        return []

    base_url = os.environ.get("OLLAMA_BASE_URL")
    embedder = OllamaEmbeddings(
        model=os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
        base_url=base_url if base_url else None,
    )
    q_emb = embedder.embed_query(query)
    raw = collection.query(
        query_embeddings=[q_emb],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    hits: list[dict[str, Any]] = []
    ids_batch = raw.get("ids") or []
    if not ids_batch or not ids_batch[0]:
        return hits

    doc_batch = raw.get("documents") or [[]]
    meta_batch = raw.get("metadatas") or [[]]
    dist_batch = raw.get("distances") or [[]]

    for i, doc_id in enumerate(ids_batch[0]):
        meta = meta_batch[0][i] if meta_batch[0] else None
        hits.append({
            "id": doc_id,
            "content": doc_batch[0][i] if doc_batch[0] else "",
            "metadata": meta if isinstance(meta, dict) else {},
            "distance": dist_batch[0][i] if dist_batch[0] else None,
        })
    return hits
