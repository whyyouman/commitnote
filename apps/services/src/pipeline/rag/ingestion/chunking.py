import re
from collections import defaultdict
from copy import deepcopy

import tiktoken
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .embedding import Embedding

# OpenAI text-embedding-* models use cl100k_base; count tokens at ingest so short noise never hits Chroma.
_TIKTOKEN_ENC = tiktoken.get_encoding("cl100k_base")


def _token_count(text: str) -> int:
    return len(_TIKTOKEN_ENC.encode(text or ""))


def _safe_int(value: object, default: int = 0) -> int:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return default

# Split before "Chapter 2", "PART III", etc. (PDF text often loses line breaks.)
_CHAPTER_BOUNDARY = re.compile(
    r"(?=(?:^|\n)(?:\d+\.?\s+[A-Z][A-Z\s]{3,}|"  # "3 MOTIVATION..."
    r"(?:Chapter|CHAPTER|Part|PART)\s+(?:[IVXLCDM]+|[0-9]+)))",
    re.IGNORECASE | re.MULTILINE,
)

# Must include a capturing group for _extract_chapter_label (not a lookahead-only pattern).
_CHAPTER_LABEL = re.compile(
    r"^\s*((?:(?:Chapter|CHAPTER|Part|PART)\s+(?:[IVXLCDM]+|[0-9]+))"
    r"|\d+\.?\s+[A-Z][A-Z\s]{3,})",
    re.IGNORECASE | re.MULTILINE,
)


class Chunker:
    def __init__(self, data: list[Document], note_uid: str, *, min_tokens: int = 20):
        self.data = data
        self.note_uid = note_uid
        self.min_tokens = max(0, min_tokens)
        self.embedding = Embedding()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", "! ", "? ", " "],
        )

    def _extract_chapter_label(self, text: str) -> str:
        m = _CHAPTER_LABEL.match(text)
        return m.group(1) if m else ""

    def _is_reference_chunk(self, text: str) -> bool:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        if not lines:
            return False
        
        ref_pattern = re.compile(r"^\[?\d{1,3}\]")
        arxiv_pattern = re.compile(r"arXiv|doi\.org|preprint", re.IGNORECASE)
        
        ref_lines = sum(1 for l in lines if ref_pattern.match(l))
        arxiv_lines = sum(1 for l in lines if arxiv_pattern.search(l))
        
        # Condition 1: 40%+ lines citation format
        if (ref_lines / len(lines)) > 0.4:
            return True
        
        # Condition 2: chunk_index 20+ aur arxiv mentions hain
        # (references section hamesha end mein hota hai)
        if arxiv_lines >= 2 and ref_lines >= 2:
            return True
            
        return False

    def _split_text_into_chapters(self, text: str) -> list[tuple[str, str, int]]:
        """Return (chapter_label, content, start_offset) for mapping merged text back to PDF page."""
        if not text.strip():
            return [("", "", 0)]
        bounds = [m.start() for m in _CHAPTER_BOUNDARY.finditer(text)]
        if not bounds:
            t = text.strip()
            return [("", t, 0)]
        out: list[tuple[str, str, int]] = []
        head = text[: bounds[0]].strip()
        if head:
            out.append(("", head, 0))
        for j in range(len(bounds)):
            start = bounds[j]
            end = bounds[j + 1] if j + 1 < len(bounds) else len(text)
            segment = text[start:end].strip()
            if not segment:
                continue
            out.append((self._extract_chapter_label(segment), segment, start))
        return out if out else [("", text.strip(), 0)]

    @staticmethod
    def _merged_text_and_page_spans(
        pages: list[Document],
    ) -> tuple[str, list[tuple[int, int, int]]]:
        """Join pages with newlines; spans are (start, end, page) covering full_text."""
        pieces = [p.page_content or "" for p in pages]
        full_text = "\n".join(pieces)
        spans: list[tuple[int, int, int]] = []
        pos = 0
        for i, p in enumerate(pages):
            t = p.page_content or ""
            page_num = int(p.metadata.get("page", 0) or 0)
            start = pos
            if i < len(pages) - 1:
                pos += len(t) + 1
            else:
                pos += len(t)
            spans.append((start, pos, page_num))
        return full_text, spans

    @staticmethod
    def _offset_to_page(offset: int, spans: list[tuple[int, int, int]]) -> int:
        if not spans:
            return 0
        for start, end, page in spans:
            if start <= offset < end:
                return page
        return spans[-1][2] if offset >= spans[-1][0] else spans[0][2]

    def _documents_per_chapter(self, docs: list[Document]) -> list[Document]:
        """Merge pages per file in order, split on chapter headings, attach chapter metadata."""
        # Group by stable per-file identity. Fall back to source, then synthetic key.
        by_file: dict[str, list[Document]] = defaultdict(list)
        for doc_idx, d in enumerate(docs):
            file_key = (
                str(d.metadata.get("upload_file_path") or "")
                or str(d.metadata.get("source") or "")
                or f"__unknown_file_{doc_idx}"
            )
            by_file[file_key].append(d)

        chapter_docs: list[Document] = []
        grouped_files = sorted(
            by_file.items(),
            key=lambda item: _safe_int(item[1][0].metadata.get("upload_file_index"), 10**9),
        )
        for file_key, pages in grouped_files:
            pages.sort(key=lambda x: _safe_int(x.metadata.get("page"), 0))
            base_meta = deepcopy(pages[0].metadata)
            full_text, page_spans = self._merged_text_and_page_spans(pages)
            sections = self._split_text_into_chapters(full_text)
            base_meta["file_key"] = file_key
            base_meta["page_count"] = len(pages)
            for idx, (label, content, start_off) in enumerate(sections):
                if not content.strip():
                    continue
                if self._is_reference_chunk(content):
                    continue

                meta = {
                    **base_meta,
                    "chapter_index": idx,
                    "chapter_label": label or None,
                    "page": self._offset_to_page(start_off, page_spans),
                }
                chapter_docs.append(Document(page_content=content, metadata=meta))
        return chapter_docs

    # Chunker.chunk() mein
    def chunk(self):
        l1_docs = self._documents_per_chapter(self.data)
        final_chunks = self.text_splitter.split_documents(l1_docs)
        
        # Final filter — references drop + min token count at ingest (not at query time)
        clean_chunks = [
            c
            for c in final_chunks
            if not self._is_reference_chunk(c.page_content)
            and _token_count(c.page_content) >= self.min_tokens
        ]

        print(
            f"Total: {len(final_chunks)}, "
            f"After ref+min_tokens (>={self.min_tokens}): {len(clean_chunks)}"
        )
        self.embedding.create_collection(self.note_uid, clean_chunks)
        return clean_chunks