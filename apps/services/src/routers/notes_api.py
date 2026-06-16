"""HTTP API for note metadata management."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional, cast
from uuid import UUID

import chromadb
from chromadb.errors import NotFoundError
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models import ChatSession, Note, NoteFiles, NoteImage
from pipeline.rag.chroma_config import get_chroma_path

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteFileItem(BaseModel):
    id: int
    file_path: str


class NoteItem(BaseModel):
    id: int
    title: str
    processing_status: str
    note_uid: str
    user_id: UUID | None = None
    files: list[NoteFileItem] = Field(default_factory=list)


class NotesListResponse(BaseModel):
    notes: list[NoteItem]


class NoteResponse(BaseModel):
    note: NoteItem


class UpdateNoteRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    processing_status: Optional[str] = Field(default=None, min_length=1, max_length=50)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "UpdateNoteRequest":
        if self.title is None and self.processing_status is None:
            raise ValueError("Provide at least one field to update: title or processing_status.")
        return self


class DeleteNoteResponse(BaseModel):
    deleted: bool = True
    note_uid: str
    chroma_deleted: bool
    removed_upload_files: int


def _as_int(value: object) -> int:
    return cast(int, value)


def _as_str(value: object) -> str:
    return cast(str, value)


def _as_uuid_or_none(value: object) -> UUID | None:
    return cast(UUID | None, value)


def _to_note_item(note: Note) -> NoteItem:
    return NoteItem(
        id=_as_int(note.id),
        title=_as_str(note.title),
        processing_status=_as_str(note.processing_status),
        note_uid=_as_str(note.note_uid),
        user_id=_as_uuid_or_none(note.user_id),
        files=[
            NoteFileItem(id=_as_int(file.id), file_path=_as_str(file.file_path))
            for file in note.note_files
        ],
    )


def _query_note(db: Session, note_uid: str) -> Note | None:
    key = note_uid.strip()
    if not key:
        raise HTTPException(status_code=400, detail="note_uid must not be empty.")
    return (
        db.query(Note)
        .options(selectinload(Note.note_files))
        .filter(Note.note_uid == key)
        .first()
    )


@router.get("", response_model=NotesListResponse)
def get_notes(user_id: UUID | None = None, db: Session = Depends(get_db)) -> NotesListResponse:
    query = db.query(Note).options(selectinload(Note.note_files)).order_by(Note.created_at.desc())
    if user_id is not None:
        query = query.filter(Note.user_id == user_id)
    notes = query.all()
    return NotesListResponse(notes=[_to_note_item(note) for note in notes])


@router.get("/{note_uid}", response_model=NoteResponse)
def get_note(note_uid: str, db: Session = Depends(get_db)) -> NoteResponse:
    note = _query_note(db=db, note_uid=note_uid)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Note not found for note_uid={note_uid!r}")
    return NoteResponse(note=_to_note_item(note))


@router.patch("/{note_uid}", response_model=NoteResponse)
def edit_note(note_uid: str, body: UpdateNoteRequest, db: Session = Depends(get_db)) -> NoteResponse:
    note = _query_note(db=db, note_uid=note_uid)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Note not found for note_uid={note_uid!r}")

    if body.title is not None:
        setattr(cast(Any, note), "title", body.title.strip())
    if body.processing_status is not None:
        setattr(cast(Any, note), "processing_status", body.processing_status.strip())

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update note: {exc}") from exc

    db.refresh(note)
    return NoteResponse(note=_to_note_item(note))


@router.delete("/{note_uid}", response_model=DeleteNoteResponse)
def delete_note(note_uid: str, db: Session = Depends(get_db)) -> DeleteNoteResponse:
    note = _query_note(db=db, note_uid=note_uid)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Note not found for note_uid={note_uid!r}")

    stored_paths = [nf.file_path for nf in note.note_files]
    removed_upload_files = 0
    for file_path in stored_paths:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            removed_upload_files += 1

    db.query(ChatSession).filter(ChatSession.note_id == note.id).delete(synchronize_session=False)
    db.query(NoteImage).filter(NoteImage.note_id == note.id).delete(synchronize_session=False)
    db.query(NoteFiles).filter(NoteFiles.note_id == note.id).delete(synchronize_session=False)
    db.delete(note)

    chroma_deleted = False
    try:
        client = chromadb.PersistentClient(path=get_chroma_path())
        client.delete_collection(name=_as_str(note.note_uid))
        chroma_deleted = True
    except NotFoundError:
        chroma_deleted = False
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete Chroma collection: {exc}") from exc

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {exc}") from exc

    return DeleteNoteResponse(
        note_uid=_as_str(note.note_uid),
        chroma_deleted=chroma_deleted,
        removed_upload_files=removed_upload_files,
    )
