import chromadb
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings


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

        # LangChain Chroma wrapper — dense retrieval ke liye
        self.vectorstore = Chroma(
            client=self.chroma,
            collection_name="normalization_paper",
            embedding_function=OpenAIEmbeddings(model="text-embedding-3-small")
        )

    def _bm25_scores(self, query: str, k: int = 10):
        self.bm25_retriever.k = k
        return self.bm25_retriever.invoke(query)

    def _dense_scores(self, query: str, k: int = 10):
        return self.vectorstore.similarity_search_with_score(query, k=k)

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
            scores[key] = scores.get(key, 0.0) + 2.0 / (rrf_const + rank + 1)
            by_key.setdefault(key, doc)

        for rank, (doc, _score) in enumerate(dense_docs):
            key = self._doc_key(doc)
            scores[key] = scores.get(key, 0.0) + 1.0 / (rrf_const + rank + 1)
            by_key.setdefault(key, doc)

        ordered = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        return [by_key[k] for k in ordered[:top_k]]

    def retrieve(self, query: str, k: int = 10) -> list[Document]:
        bm25_docs = self._bm25_scores(query, k=30)
        dense_docs = self._dense_scores(query, k=15)
        return self._rrf_fusion(bm25_docs, dense_docs, top_k=k)