from pydantic import BaseModel, Field, field_validator


class DocumentOut(BaseModel):
    id: str
    title: str
    source: str
    category: str
    tags: list[str]
    chunks: int
    created_at: str
    checksum: str


class ChunkOut(BaseModel):
    id: str
    document_id: str
    text: str
    chunk_index: int
    section: str
    page: int | None


class DocumentDetail(BaseModel):
    document: DocumentOut
    chunks: list[ChunkOut]


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=8, ge=1, le=20)
    category: str | None = Field(default=None, max_length=100)
    document_id: str | None = None

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("检索内容不能为空")
        return value


class SearchResult(BaseModel):
    id: str
    title: str
    document_id: str
    text: str
    section: str
    page: int | None
    category: str
    tags: list[str]
    source: str
    chunk_index: int


class SearchResponse(BaseModel):
    query: str
    total: int
    took_ms: float
    results: list[SearchResult]


class HealthOut(BaseModel):
    status: str
    engine: str
    mode: str
    model: str
    documents: int
    chunks: int
