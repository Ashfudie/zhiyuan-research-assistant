from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from .config import BASE_DIR, Settings
from .schemas import DocumentDetail, DocumentOut, HealthOut, SearchRequest, SearchResponse
from .seed import seed_samples
from .store import DuplicateDocumentError, SeekdbStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    store = SeekdbStore(settings)
    if settings.auto_seed:
        seed_samples(store, settings)
    app.state.store = store
    app.state.settings = settings
    yield


app = FastAPI(title="知源 API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(request: Request) -> SeekdbStore:
    return request.app.state.store


@app.get("/api/health", response_model=HealthOut)
def health(request: Request):
    return get_store(request).health()


@app.get("/api/documents", response_model=list[DocumentOut])
def documents(request: Request):
    return get_store(request).list_documents()


@app.get("/api/documents/{document_id}", response_model=DocumentDetail)
def document(document_id: str, request: Request):
    try:
        return get_store(request).get_document(document_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="资料不存在或已删除") from exc


@app.delete("/api/documents/{document_id}", status_code=204)
def delete_document(document_id: str, request: Request):
    try:
        get_store(request).delete_document(document_id)
        return Response(status_code=204)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="资料不存在或已删除") from exc


@app.post("/api/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(default="未分类"),
    tags: str = Form(default=""),
):
    filename = Path(file.filename or "").name
    if Path(filename).suffix.lower() not in {".txt", ".md", ".pdf"}:
        raise HTTPException(status_code=400, detail="仅支持 .txt、.md 和 .pdf 文件")
    settings = request.app.state.settings
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"文件不能超过 {settings.max_upload_bytes // 1024 // 1024} MB")
    try:
        return get_store(request).ingest(filename, content, category, tags.split(","))
    except DuplicateDocumentError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/search", response_model=SearchResponse)
def search(search_request: SearchRequest, request: Request):
    return get_store(request).search(search_request)


frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
