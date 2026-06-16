import os
import re
from pathlib import Path

from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain_core.documents import Document

from .chunking import Chunker


class DocumentLoader:
    def __init__(self, file_paths: list[str], data_dir: str | None = None):
        self.file_paths = file_paths
        self.data = []

    def cleanData(self):
        for doc in self.data:
            # \n preserve karo — chunker ko chahiye
            doc.page_content = re.sub(r"[ \t\r]+", " ", doc.page_content)  # sirf spaces/tabs
            doc.page_content = re.sub(r"\n{3,}", "\n\n", doc.page_content)  # 3+ newlines → 2
            doc.page_content = doc.page_content.strip()

    @staticmethod
    def _build_loader(path: str):
        ext = Path(path).suffix.lower()
        if ext == ".pdf":
            return PyPDFLoader(path)
        if ext == ".docx":
            return Docx2txtLoader(path)
        raise ValueError(f"Unsupported file extension: {ext or '<none>'}")

    def loadDocument(self, note_uid: str):
        for file_index, path in enumerate(self.file_paths):
            loader = self._build_loader(path)
            docs = loader.load()
            file_name = Path(path).name
            for doc in docs:
                # Keep stable file identity so chunker can safely group multi-file uploads.
                doc.metadata["source"] = doc.metadata.get("source") or path
                doc.metadata["upload_file_path"] = path
                doc.metadata["upload_file_name"] = file_name
                doc.metadata["upload_file_index"] = file_index
            self.data.extend(docs)
        self.cleanData()

        # Chunk the data
        self.chunker = Chunker(self.data, note_uid=note_uid)
        result = self.chunker.chunk()
        return result
