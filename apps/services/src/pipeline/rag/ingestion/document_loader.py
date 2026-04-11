import os
import re
from langchain_community.document_loaders import PyPDFLoader
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

    def loadDocument(self):
        for path in self.file_paths:
            loader = PyPDFLoader(path)
            docs = loader.load()
            self.data.extend(docs)
        self.cleanData()

        # Chunk the data
        self.chunker = Chunker(self.data)
        result = self.chunker.chunk()
        return result
