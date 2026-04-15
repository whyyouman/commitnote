import os
import uuid
from collections.abc import Mapping, Sequence
from typing import Any, cast
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

import chromadb
from chromadb.api.types import Embeddable, EmbeddingFunction
from chromadb.utils import embedding_functions
from pipeline.rag.chroma_config import get_chroma_path

load_dotenv()

_DEFAULT_MODEL = "text-embedding-3-small"


def _ensure_openai_key() -> None:
    key = os.getenv("OPENAI_API_KEY") or ""
    os.environ["OPENAI_API_KEY"] = key


_ensure_openai_key()


def _chroma_metadata(meta: Mapping[str, Any]) -> dict[str, str | int | float | bool]:
    """Chroma only allows str | int | float | bool; drop None and coerce the rest."""
    out: dict[str, str | int | float | bool] = {}
    for key, val in meta.items():
        if val is None:
            continue
        k = str(key)
        if isinstance(val, (str, int, float, bool)):
            out[k] = val
        else:
            out[k] = str(val)
    return out


class Embedding:
    """Thin wrapper around LangChain's OpenAI embeddings for ingestion and search."""

    def __init__(
        self,
        *,
        model: str | None = None,
        api_key: str | None = None,
    ) -> None:
        if api_key is not None:
            os.environ["OPENAI_API_KEY"] = api_key

        self._model = model or os.getenv("EMBEDDING_MODEL") or _DEFAULT_MODEL
        self._embeddings = OpenAIEmbeddings(model=self._model)
        self._chroma = chromadb.PersistentClient(path=get_chroma_path())

    @property
    def model(self) -> str:
        return self._model

    def create_collection(self, name: str, documents: list[Document]) -> None:
        # Chroma expects its own EmbeddingFunction, not LangChain's OpenAIEmbeddings.
        chroma_ef = embedding_functions.OpenAIEmbeddingFunction(
            model_name=self._model,
            api_key_env_var="OPENAI_API_KEY",
        )
        collection = self._chroma.get_or_create_collection(
            name=name,
            embedding_function=cast(EmbeddingFunction[Embeddable], chroma_ef),
            metadata={"hnsw:space": "cosine"},
        )
        # Re-ingest: wipe existing vectors (create_collection fails if name already exists).
        if collection.count() > 0:
            prev = collection.get()
            prev_ids = list(prev.get("ids") or [])
            if prev_ids:
                collection.delete(ids=prev_ids)

        if not documents:
            print(f"Collection '{name}' cleared; no documents to add.")
            return

        collection.add(
            documents=[(d.page_content or "").strip() or " " for d in documents],
            metadatas=[_chroma_metadata(d.metadata) for d in documents],
            ids=[str(uuid.uuid4()) for _ in documents],
        )

        print(f"Stored {collection.count()} chunks in ChromaDB ✓")
