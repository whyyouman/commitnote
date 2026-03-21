import os
from collections.abc import Iterable
from pathlib import Path
from typing import Any, cast

import chromadb
from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyPDFLoader,
    UnstructuredWordDocumentLoader,
)
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.db.config import settings


def _loader_for_path(file_path: str):
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return PyPDFLoader(file_path)
    if suffix == ".docx":
        return Docx2txtLoader(file_path)
    if suffix == ".doc":
        return UnstructuredWordDocumentLoader(file_path)
    raise ValueError(f"Unsupported document type: {suffix or '(none)'}")


class DataIngestion:
    def load(self, file_paths: Iterable[str]) -> list[dict[str, Any]]:
        file_json_data: list[dict[str, Any]] = []
        for file_path in file_paths:
            loader = _loader_for_path(file_path)
            docs = loader.load()
            for doc in docs:
                # PyPDFLoader sets ``page`` per page; doc loaders without it use 0.
                page = int(doc.metadata.get("page", 0) or 0)
                file_json_data.append({
                    "id": doc.metadata["source"],
                    "page": page,
                    "content": doc.page_content,
                })
        return file_json_data

    def cleanData(self, data):
        cleaned = []
        for item in data:
            text = item["content"]
            lines = text.split("\n")
            filtered = []

            for line in lines:
                if " . . ." in line:
                    continue
                if "Draft" in line:
                    continue
                filtered.append(line)

            cleaned.append({
                "id": item["id"],
                "page": int(item.get("page", 0) or 0),
                "content": "\n".join(filtered),
            })

        return cleaned


    def dataChunking(self, data):
        chunk_data = []
        for item in data:
            file_json_data = item["content"]
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
            chunks = text_splitter.split_text(file_json_data)
            for i, chunk in enumerate(chunks):
                chunk_data.append({
                    "id": item["id"],
                    "page": int(item.get("page", 0) or 0),
                    "content": chunk,
                    "chunk_index": i,
                })
        return chunk_data

    def dataEmbedding(self, data):
        base_url = os.environ.get("OLLAMA_BASE_URL")
        embeddings = OllamaEmbeddings(
            model=os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
            base_url=base_url if base_url else None,
        )
        contents = [item["content"] for item in data]
        vectors = embeddings.embed_documents(contents)

        for i, vector in enumerate(vectors):
            data[i]["embedding"] = vector

        return data

    def dataStorage(self, data: list[dict]) -> None:
        if not data:
            return

        client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        collection = client.get_or_create_collection(name=settings.chroma_collection_name)

        ids, embeddings, documents, metadatas = [], [], [], []

        for item in data:
            emb = item.get("embedding")
            content = item.get("content")

            if not emb or not content:
                continue

            chunk_idx = int(item.get("chunk_index", 0) or 0)
            page = int(item.get("page", 0) or 0)
            # Same file path is reused for every PDF page; chunk_index restarts per page.
            # Include page so Chroma IDs are globally unique.
            ids.append(f"{item['id']}_p{page}_chunk_{chunk_idx}")
            embeddings.append(emb)
            documents.append(content)

            metadatas.append({
                "note_id": str(item["id"]),
                "file_name": item.get("file_name", ""),
                "page": page,
                "chunk_index": chunk_idx,
            })

        if not ids:
            return

        BATCH_SIZE = 100

        for i in range(0, len(ids), BATCH_SIZE):
            collection.upsert(
                ids=ids[i:i+BATCH_SIZE],
                embeddings=embeddings[i:i+BATCH_SIZE],
                documents=documents[i:i+BATCH_SIZE],
                metadatas=metadatas[i:i+BATCH_SIZE],
            )