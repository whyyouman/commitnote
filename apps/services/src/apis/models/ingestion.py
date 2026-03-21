from pydantic import BaseModel, Field


class IngestionUploadResponse(BaseModel):
    files_saved: int = Field(description="Number of PDF files processed")
    chunks_indexed: int = Field(description="Number of text chunks stored in Chroma")
    sources: list[str] = Field(description="Paths used as document ids (saved file paths)")
