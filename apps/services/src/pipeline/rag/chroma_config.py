from pathlib import Path


def get_chroma_path() -> str:
    """
    Return absolute writable Chroma persistence directory.

    We pin this under apps/services/data/chroma so path does not depend on
    server start cwd (which caused readonly/permission surprises).
    """
    chroma_dir = Path(__file__).resolve().parents[3] / "data" / "chroma"
    chroma_dir.mkdir(parents=True, exist_ok=True)
    return str(chroma_dir)
