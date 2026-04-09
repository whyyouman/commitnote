"""Multi-file upload for PDF and DOCX."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from langchain_core.documents import Document
from pipeline.rag.ingestion.document_loader import DocumentLoader

router = APIRouter(prefix="/upload", tags=["upload"])

# apps/services/uploads
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ALLOWED_EXTENSIONS = frozenset({".pdf", ".docx"})
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
)
# Browsers and some clients use this for file inputs.
_OCTET_STREAM = "application/octet-stream"


class UploadedFileInfo(BaseModel):
    original_filename: str
    stored_filename: str
    path: str
    content_type: str | None
    size_bytes: int
    data: list[Document]

class MultiUploadResponse(BaseModel):
    files: list[UploadedFileInfo]


def _extension_ok(filename: str | None) -> bool:
    if not filename:
        return False
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def _content_type_ok(content_type: str | None) -> bool:
    if not content_type:
        return True  # rely on extension when client omits type
    base = content_type.split(";", 1)[0].strip().lower()
    if base in ALLOWED_CONTENT_TYPES:
        return True
    return base == _OCTET_STREAM


@router.post("/documents", response_model=MultiUploadResponse)
async def upload_documents(
    files: list[UploadFile] = File(..., description="One or more .pdf or .docx files"),
) -> MultiUploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved: list[UploadedFileInfo] = []

    for upload in files:
        if not _extension_ok(upload.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {upload.filename!r}. Only .pdf and .docx are allowed.",
            )
        if not _content_type_ok(upload.content_type):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid content type for {upload.filename!r}: {upload.content_type!r}. "
                    "Expected PDF or DOCX (or application/octet-stream)."
                ),
            )

        safe_base = Path(upload.filename or "file").name
        stored_name = f"{uuid.uuid4().hex}_{safe_base}"
        dest = UPLOAD_DIR / stored_name

        size = 0
        async with aiofiles.open(dest, "wb") as out:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                await out.write(chunk)

        document_loader = DocumentLoader(file_paths=[os.fspath(dest)])
        data = document_loader.loadDocument()

        saved.append(
            UploadedFileInfo(
                original_filename=upload.filename or "",
                stored_filename=stored_name,
                path=os.fspath(dest),
                content_type=upload.content_type,
                size_bytes=size,
                data=data,
            )
        )

    return MultiUploadResponse(files=saved)


@router.get("/form", response_class=HTMLResponse, include_in_schema=False)
async def upload_form_page() -> HTMLResponse:
    """Browser file picker (Swagger UI file widgets need OpenAPI format:binary; see app.openapi)."""
    return HTMLResponse(
        """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Upload PDF / DOCX</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
    input[type=file] { margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>Upload files</h1>
  <p>Select one or more <strong>.pdf</strong> or <strong>.docx</strong> files, then upload.</p>
  <form action="/upload/documents" method="post" enctype="multipart/form-data">
    <label>
      Files
      <input type="file" name="files" multiple required
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"/>
    </label>
    <div><button type="submit">Upload</button></div>
  </form>
  <p style="margin-top:2rem;color:#555;font-size:0.9rem;">
    In <strong>/docs</strong>, use <em>Try it out</em> after the server restart — file fields should show as file pickers.
    Or use this page for a normal browser upload button.
  </p>
</body>
</html>"""
    )
