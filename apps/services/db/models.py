import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    picture = Column(Text, nullable=True)
    password = Column(String(255), nullable=True)
    auth_provider = Column(String(50), nullable=False)  # "google" | "email"
    is_verified = Column(Boolean, nullable=False, default=False, server_default=func.false())
    is_active = Column(Boolean, nullable=False, default=True, server_default=func.true())
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    notes = relationship("Note", back_populates="user")


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    processing_status = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    user = relationship("User", back_populates="notes")
    note_files = relationship("NoteFiles", back_populates="note")
    note_images = relationship("NoteImage", back_populates="note")


class NoteFiles(Base):
    __tablename__ = "note_files"
    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    note_id = Column(Integer, ForeignKey("notes.id"))
    note = relationship("Note", back_populates="note_files")


class NoteImage(Base):
    __tablename__ = "note_images"
    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    note_id = Column(Integer, ForeignKey("notes.id"))
    note = relationship("Note", back_populates="note_images")
