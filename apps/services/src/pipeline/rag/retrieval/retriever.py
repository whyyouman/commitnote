import os
from typing import Any

import chromadb
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

_DEFAULT_RERANKER = "BAAI/bge-reranker-base"
# Must match `pipeline.rag.ingestion.embedding` (Chroma stores vectors at that width).
_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"


class Retriever:
    def __init__(self):

        # ChromaDB client
        self.chroma = chromadb.PersistentClient(path="data/chroma")
        self.raw = self.chroma.get_collection("normalization_paper")

        # Get documents and metadatas from ChromaDB
        result = self.raw.get(include=["documents", "metadatas"])
        texts = result.get("documents") or []
        metadatas = result.get("metadatas") or []
        self.docs = [Document(page_content=t, metadata=m) for t, m in zip(texts, metadatas)]

        # BM25 retriever
        self.bm25_retriever = BM25Retriever.from_documents(documents=self.docs)

        # LangChain Chroma wrapper — dense retrieval (same model as ingest, or Chroma dim mismatch).
        embed_model = os.getenv("EMBEDDING_MODEL") or _DEFAULT_EMBEDDING_MODEL
        self.vectorstore = Chroma(
            client=self.chroma,
            collection_name="normalization_paper",
            embedding_function=OpenAIEmbeddings(model=embed_model),
        )

        self._reranker: Any
        if os.getenv("RERANKER_DISABLED", "").lower() in ("1", "true", "yes"):
            self._reranker = None
        else:
            from sentence_transformers import CrossEncoder

            self._reranker = CrossEncoder(os.getenv("RERANKER_MODEL", _DEFAULT_RERANKER), max_length=512)   

    def _bm25_scores(self, query: str, k: int = 10):
        self.bm25_retriever.k = k
        return self.bm25_retriever.invoke(query)

    def _dense_scores(self, query: str, k: int = 10) -> list[tuple[Document, float]]:
        # LangChain Chroma has MMR search, not `*_with_score`; RRF only uses rank order here.
        n = len(self.docs)
        fetch_k = k * 3
        if n:
            fetch_k = min(fetch_k, n)
            fetch_k = max(fetch_k, k)
        docs = self.vectorstore.max_marginal_relevance_search(
            query,
            k=k,
            fetch_k=fetch_k,
            lambda_mult=0.7,
        )
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
        # Prefer a pool ≥16 when the corpus allows it so reranking has enough signal.
        desired = max(k * multiplier, min(16, n))
        return min(desired, n)

    def _rerank(self, query: str, docs: list[Document], *, top_k: int) -> list[Document]:
        if not docs:
            return []
        if self._reranker is None or len(docs) <= 1:
            return docs[:top_k]

        pairs = [[query, d.page_content or ""] for d in docs]
        scores = self._reranker.predict(pairs, show_progress_bar=False)
        order = sorted(range(len(docs)), key=lambda i: scores[i], reverse=True)
        return [docs[i] for i in order[:top_k]]

    def retrieve(self, query: str, k: int = 10) -> list[Document]:
        pool = self._candidate_pool_size(k)
        bm25_docs = self._bm25_scores(query, k=pool)
        dense_docs = self._dense_scores(query, k=pool)
        fused = self._rrf_fusion(bm25_docs, dense_docs, top_k=pool)
        return self._rerank(query, fused, top_k=k)