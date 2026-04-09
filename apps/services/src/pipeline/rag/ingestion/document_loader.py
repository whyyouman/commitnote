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
            doc.page_content = doc.page_content.replace("\n", " ")
            doc.page_content = doc.page_content.replace("\t", " ")
            doc.page_content = doc.page_content.replace("\r", " ")
            doc.page_content = doc.page_content.replace("  ", " ")

    def loadDocument(self):
        for path in self.file_paths:
            loader = PyPDFLoader(path)
            docs = loader.load()
            self.data.extend(docs)
            for doc in docs:
                self.data.append(doc)
        self.cleanData()

        # Chunk the data
        self.chunker = Chunker(self.data)
        result = self.chunker.chunk()
        # Return the chunked data
        return result
