from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from src.apis.models.ingestion import IngestionUploadResponse
from src.apis.services.ingestion import run_ingestion_pipeline
from src.db.config import settings

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

ALLOWED_SUFFIXES = frozenset({".pdf", ".doc", ".docx"})


def _allowed_document(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_SUFFIXES


@router.post(
    "/upload",
    response_model=IngestionUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_documents(
    files: Annotated[
        list[UploadFile],
        File(
            title="Documents",
            description=(
                "Binary uploads: one or more PDF or Word files (.pdf, .doc, .docx). "
                "Use multipart/form-data; do not send file contents as JSON strings."
            ),
            # Swagger UI needs `format: binary` on items (not plain `array<string>`).
            json_schema_extra={"items": {"type": "string", "format": "binary"}},
        ),
    ],
) -> IngestionUploadResponse:
    """Upload multiple documents as raw files (multipart), run ingestion, store in Chroma."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded.",
        )

    saved_paths: list[str] = []
    tmp_root = Path(settings.upload_dir)

    try:
        for i, upload in enumerate(files):
            name = upload.filename or f"file_{i}"
            safe = Path(name).name
            if not _allowed_document(safe):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Only PDF and Word documents are allowed (.pdf, .doc, .docx). "
                        f"Rejected: {name}"
                    ),
                )
            dest = tmp_root / f"{i}_{safe}"
            body = await upload.read()
            if not body:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Empty file: {name}",
                )
            dest.write_bytes(body)
            saved_paths.append(str(dest.resolve()))

    except HTTPException:
        raise
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploads: {e}",
        ) from e

    try:
        result = run_ingestion_pipeline(saved_paths)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ingestion failed: {e!s}",                                                                                  
        ) from e

    return IngestionUploadResponse(
        files_saved=result["files_saved"],
        chunks_indexed=result["chunks_indexed"],
        sources=result["sources"],
    )
