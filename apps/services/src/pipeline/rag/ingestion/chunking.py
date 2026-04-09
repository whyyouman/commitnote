import os
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
load_dotenv()

os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY") or ""

class Chunker:
    def __init__(self, data: list[Document]):
        self.l2_chunks = []
        self.data = data
        self.embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL") or "text-embedding-3-small")
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=100, separators=["\n\n", "\n", ". ", "! ", "? ", " "])

    def chunk(self):
        l1_chunks = self.text_splitter.split_documents(self.data)

        # Chunk the l1 chunks into l2 chunks
        # for i, chunk in enumerate(l1_chunks):
        #     doc = Document(page_content=chunk, 
        #             metadatas=[{
        #                 "chunk_id":  f"chunk_{i}",
        #             }]
        #         )
        #     self.l2_chunks.append(doc)

        return l1_chunks