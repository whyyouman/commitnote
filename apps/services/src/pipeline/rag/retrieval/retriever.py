import os
from typing import Any

import chromadb
from chromadb.errors import NotFoundError
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from pipeline.rag.chroma_config import get_chroma_path

_DEFAULT_RERANKER = "BAAI/bge-reranker-base"
# Must match `pipeline.rag.ingestion.embedding` (Chroma stores vectors at that width).
_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
_DEFAULT_MAX_RERANK_CANDIDATES = 24


class Retriever:
    def __init__(self, note_uid: str):
        self.note_uid = note_uid

        # ChromaDB client
        self.chroma = chromadb.PersistentClient(path=get_chroma_path())
        try:
            self.raw = self.chroma.get_collection(note_uid)
        except NotFoundError as exc:
            raise ValueError(f"Collection not found for note_uid={note_uid!r}") from exc

        # Get documents and metadatas from ChromaDB
        result = self.raw.get(include=["documents", "metadatas"])
        texts = result.get("documents") or []
        metadatas = result.get("metadatas") or []
        self.docs = [Document(page_content=t, metadata=m) for t, m in zip(texts, metadatas)]

        # BM25 retriever
        self.bm25_retriever = (
            BM25Retriever.from_documents(documents=self.docs) if self.docs else None
        )

        # LangChain Chroma wrapper — dense retrieval (same model as ingest, or Chroma dim mismatch).
        embed_model = os.getenv("EMBEDDING_MODEL") or _DEFAULT_EMBEDDING_MODEL
        self.vectorstore = Chroma(
            client=self.chroma,
            collection_name=note_uid,
            embedding_function=OpenAIEmbeddings(model=embed_model),
        )

        self._reranker: Any = None
        self._reranker_ready = False
        self._reranker_disabled = os.getenv("RERANKER_DISABLED", "").lower() in (
            "1",
            "true",
            "yes",
        )
        self._max_rerank_candidates = int(
            os.getenv("MAX_RERANK_CANDIDATES", str(_DEFAULT_MAX_RERANK_CANDIDATES))
        )

    def _get_reranker(self):
        if self._reranker_ready:
            return self._reranker
        self._reranker_ready = True
        if self._reranker_disabled:
            self._reranker = None
            return self._reranker
        from sentence_transformers import CrossEncoder

        self._reranker = CrossEncoder(
            os.getenv("RERANKER_MODEL", _DEFAULT_RERANKER),
            max_length=512,
        )
        return self._reranker

    def _bm25_scores(self, query: str, k: int = 10):
        if self.bm25_retriever is None:
            return []
        self.bm25_retriever.k = k
        return self.bm25_retriever.invoke(query)

    def _dense_scores(self, query: str, k: int = 10) -> list[tuple[Document, float]]:
        # Similarity search is faster than MMR; RRF already blends with BM25.
        docs = self.vectorstore.similarity_search(query, k=k)
        return [(doc, 0.0) for doc in docs]

    def _doc_key(self, doc: Document) -> str:
        return doc.page_content

    def _rrf_fusion(
        self,
        bm25_docs: list[Document],
        dense_docs: list[tuple[Document, float]],
        *,
        rrf_const: int = 60,
        top_k: int = 10,
    ) -> list[Document]:
        scores: dict[str, float] = {}
        by_key: dict[str, Document] = {}

        for rank, doc in enumerate(bm25_docs):
            key = self._doc_key(doc)
            scores[key] = scores.get(key, 0.0) + 0.2 / (rrf_const + rank + 1)
            by_key.setdefault(key, doc)

        for rank, (doc, _score) in enumerate(dense_docs):
            key = self._doc_key(doc)
            scores[key] = scores.get(key, 0.0) + 1.0 / (rrf_const + rank + 1)
            by_key.setdefault(key, doc)

        ordered = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        return [by_key[k] for k in ordered[:top_k]]

    def _candidate_pool_size(self, k: int, *, multiplier: int = 4) -> int:
        n = len(self.docs)
        if n == 0:
            return 0
        # Keep pool modest for faster end-to-end retrieval latency.
        desired = min(max(k * 2, 12), 40)
        return min(desired, n)

    def _rerank(self, query: str, docs: list[Document], *, top_k: int) -> list[Document]:
        if not docs:
            return []
        if len(docs) <= 1:
            return docs[:top_k]
        reranker = self._get_reranker()
        if reranker is None:
            return docs[:top_k]

        rerank_docs = docs[: self._max_rerank_candidates]
        pairs = [[query, d.page_content or ""] for d in rerank_docs]
        scores = reranker.predict(pairs, show_progress_bar=False)
        order = sorted(range(len(rerank_docs)), key=lambda i: scores[i], reverse=True)
        return [rerank_docs[i] for i in order[:top_k]]

    def retrieve(self, query: str, k: int = 10) -> list[Document]:
        pool = self._candidate_pool_size(k)
        bm25_docs = self._bm25_scores(query, k=pool)
        dense_docs = self._dense_scores(query, k=pool)
        fused = self._rrf_fusion(bm25_docs, dense_docs, top_k=pool)
        return self._rerank(query, fused, top_k=k)