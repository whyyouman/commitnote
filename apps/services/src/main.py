import sys
from pathlib import Path

# Ensure `routers` resolves when the app is loaded as `src.main` (cwd not `src/`).
_SRC = Path(__file__).resolve().parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from routers.upload import router as upload_router


def _patch_openapi_binary_files(schema: object) -> None:
    """Swagger UI only shows file pickers when parts use type:string + format:binary (not contentMediaType)."""
    if not isinstance(schema, dict):
        return
    if schema.get("type") == "string" and "contentMediaType" in schema:
        schema["format"] = "binary"
        del schema["contentMediaType"]
    for key in ("items", "additionalProperties"):
        if key in schema and isinstance(schema[key], dict):
            _patch_openapi_binary_files(schema[key])
    if isinstance(schema.get("items"), list):
        for it in schema["items"]:
            _patch_openapi_binary_files(it)
    props = schema.get("properties")
    if isinstance(props, dict):
        for v in props.values():
            _patch_openapi_binary_files(v)
    for key in ("allOf", "oneOf", "anyOf"):
        if key in schema and isinstance(schema[key], list):
            for part in schema[key]:
                _patch_openapi_binary_files(part)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=getattr(app, "description", None),
        routes=app.routes,
    )
    for comp in openapi_schema.get("components", {}).get("schemas", {}).values():
        _patch_openapi_binary_files(comp)
    app.openapi_schema = openapi_schema
    return openapi_schema


app = FastAPI(title="Services", version="0.1.0")
app.openapi = custom_openapi
app.include_router(upload_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ok"}


# @app.get("/health")
# def health() -> dict[str, str]:
#     return {"status": "healthy"}


# @app.get("/health/db")
# def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
#     db.execute(text("SELECT 1"))
#     return {"database": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
