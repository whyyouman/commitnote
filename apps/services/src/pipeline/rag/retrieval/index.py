import os
from collections.abc import Sequence
from typing import Any, cast

from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from sentence_transformers import CrossEncoder  # pyright: ignore[reportMissingImports]

_DEFAULT_CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


class RetrievalPipeline:
    def __init__(self) -> None:
        self.cross_encoder: CrossEncoder | None = None

    def bm25_retrieval(
        self,
        data: Sequence[dict[str, Any] | Document],
        query: str,
        *,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Run BM25 over ``data`` and return top-``k`` hits as dicts."""
        if not data:
            return []

        documents: list[Document] = []
        for item in data:
            if isinstance(item, dict):
                documents.append(
                    Document(
                        page_content=item["content"],
                        metadata={k: v for k, v in item.items() if k != "content"},
                    )
                )
            else:
                documents.append(item)

        retriever = BM25Retriever.from_documents(documents, k=k)
        docs = retriever.invoke(query)
        return [{"content": d.page_content, **d.metadata} for d in docs]

    def get_cross_encoder(self) -> CrossEncoder:
        if self.cross_encoder is None:
            model_name = os.environ.get("CROSS_ENCODER_MODEL", _DEFAULT_CROSS_ENCODER_MODEL)
            self.cross_encoder = CrossEncoder(model_name)
        return self.cross_encoder

    def cross_encoder_rerank(
        self,
        query: str,
        documents: Sequence[dict[str, Any] | Document],
        *,
        k: int = 12,
    ) -> list[Document]:
        """
        Rerank documents by relevance to the query using a CrossEncoder.
        ``documents``: LangChain ``Document`` or dicts with a ``content`` key.
        Returns top-``k`` ``Document``s with ``metadata["score"]`` set.
        """
        if not documents:
            return []

        model = self.get_cross_encoder()

        if isinstance(documents[0], dict):
            dicts = cast(list[dict[str, Any]], list(documents))
            pairs = [(query, d["content"]) for d in dicts]
            doc_objs = [
                Document(
                    page_content=d["content"],
                    metadata={key: val for key, val in d.items() if key != "content"},
                )
                for d in dicts
            ]
        else:
            docs = cast(list[Document], list(documents))
            pairs = [(query, d.page_content) for d in docs]
            doc_objs = docs

        scores = model.predict(pairs)
        if hasattr(scores, "tolist"):
            scores = scores.tolist()

        scored = list(zip(doc_objs, scores, strict=True))
        scored.sort(key=lambda x: x[1], reverse=True)
        top = scored[:k]

        out: list[Document] = []
        for doc, score in top:
            doc.metadata["score"] = float(score)
            out.append(doc)
        return out

    def retrieval_data(self, retriever: BaseRetriever, k: int = 5, *, query: str) -> list[dict[str, Any]]:
        results = retriever.invoke(query)
        return [{"content": d.page_content, **d.metadata} for d in results]
