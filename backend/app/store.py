import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock

import pyseekdb

from .chunking import chunk_pages, extract_pages
from .config import Settings
from .embeddings import Embedder
from .schemas import ChunkOut, DocumentDetail, DocumentOut, HealthOut, SearchRequest, SearchResponse, SearchResult


class DuplicateDocumentError(ValueError):
    pass


def _decode_tags(value: str) -> list[str]:
    return json.loads(value) if value else []


def _page(value: int) -> int | None:
    return value or None


class SeekdbStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.embedder = Embedder(settings.embedding_model)
        if settings.seekdb_mode == "embedded":
            self.client = pyseekdb.Client(path=str(settings.seekdb_path), database=settings.seekdb_database)
        else:
            self.client = pyseekdb.Client(
                host=settings.seekdb_host,
                port=settings.seekdb_port,
                tenant=settings.seekdb_tenant,
                database=settings.seekdb_database,
                user=settings.seekdb_user,
                password=settings.seekdb_password,
            )
        self.collection = self.client.get_or_create_collection(
            settings.collection_name,
            configuration=pyseekdb.HNSWConfiguration(dimension=self.embedder.dimension, distance="cosine"),
            embedding_function=None,
        )
        self.lock = RLock()

    def health(self) -> HealthOut:
        with self.lock:
            return HealthOut(
                status="ok",
                engine="seekdb",
                mode=self.settings.seekdb_mode,
                model=self.settings.embedding_model,
                documents=len(self.list_documents()),
                chunks=self.collection.count(),
            )

    def _document(self, metadata: dict, chunks: int) -> DocumentOut:
        return DocumentOut(
            id=metadata["document_id"],
            title=metadata["title"],
            source=metadata["source"],
            category=metadata["category"],
            tags=_decode_tags(metadata["tags"]),
            chunks=chunks,
            created_at=metadata["created_at"],
            checksum=metadata["checksum"],
        )

    def list_documents(self) -> list[DocumentOut]:
        with self.lock:
            rows = self.collection.get(include=["metadatas"], limit=10000)
            grouped: dict[str, tuple[dict, int]] = {}
            for metadata in rows.get("metadatas") or []:
                document_id = metadata["document_id"]
                _, count = grouped.get(document_id, (metadata, 0))
                grouped[document_id] = (metadata, count + 1)
            documents = [self._document(metadata, count) for metadata, count in grouped.values()]
            return sorted(documents, key=lambda item: item.created_at, reverse=True)

    def get_document(self, document_id: str) -> DocumentDetail:
        with self.lock:
            rows = self.collection.get(
                where={"document_id": document_id},
                include=["documents", "metadatas"],
                limit=10000,
            )
            metadatas = rows.get("metadatas") or []
            if not metadatas:
                raise KeyError(document_id)
            texts = rows.get("documents") or []
            chunks = [
                ChunkOut(
                    id=chunk_id,
                    document_id=document_id,
                    text=text,
                    chunk_index=metadata["chunk_index"],
                    section=metadata["section"],
                    page=_page(metadata["page"]),
                )
                for chunk_id, text, metadata in zip(rows["ids"], texts, metadatas, strict=True)
            ]
            chunks.sort(key=lambda item: item.chunk_index)
            return DocumentDetail(document=self._document(metadatas[0], len(chunks)), chunks=chunks)

    def delete_document(self, document_id: str) -> None:
        with self.lock:
            self.get_document(document_id)
            self.collection.delete(where={"document_id": document_id})

    def ingest(self, filename: str, content: bytes, category: str, tags: list[str]) -> DocumentOut:
        checksum = hashlib.sha256(content).hexdigest()
        with self.lock:
            existing = self.collection.get(where={"checksum": checksum}, include=["metadatas"], limit=1)
            if existing.get("ids"):
                raise DuplicateDocumentError("相同内容的资料已经导入")

            chunks = chunk_pages(extract_pages(filename, content))
            if not chunks:
                raise ValueError("没有从资料中提取到可检索文本")

            document_id = uuid.uuid4().hex
            title = Path(filename).stem
            clean_tags = list(dict.fromkeys(tag.strip() for tag in tags if tag.strip()))[:12]
            created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            common = {
                "document_id": document_id,
                "title": title,
                "source": filename,
                "category": category.strip() or "未分类",
                "tags": json.dumps(clean_tags, ensure_ascii=False),
                "created_at": created_at,
                "checksum": checksum,
            }
            try:
                for start in range(0, len(chunks), 32):
                    batch = chunks[start : start + 32]
                    texts = [f"{title}\n{chunk.section}\n{chunk.text}" for chunk in batch]
                    self.collection.add(
                        ids=[f"{document_id}:{index:04d}" for index in range(start, start + len(batch))],
                        documents=[chunk.text for chunk in batch],
                        embeddings=self.embedder.documents(texts),
                        metadatas=[
                            {
                                **common,
                                "chunk_index": start + offset,
                                "section": chunk.section,
                                "page": chunk.page or 0,
                            }
                            for offset, chunk in enumerate(batch)
                        ],
                    )
                self.collection.refresh_index()
            except Exception:
                self.collection.delete(where={"document_id": document_id})
                raise
            return self.get_document(document_id).document

    def search(self, request: SearchRequest) -> SearchResponse:
        started = time.perf_counter()
        where = {}
        if request.category:
            where["category"] = request.category
        if request.document_id:
            where["document_id"] = request.document_id
        candidates = min(max(request.limit * 4, 20), 100)
        fulltext = {"where_document": {"$contains": request.query}, "n_results": candidates}
        vector = {"query_embeddings": self.embedder.query(request.query), "n_results": candidates}
        if where:
            fulltext["where"] = where
            vector["where"] = where

        with self.lock:
            rows = self.collection.hybrid_search(
                query=fulltext,
                knn=vector,
                rank={"rrf": {"rank_window_size": 60, "rank_constant": 60}},
                n_results=request.limit,
                include=["documents", "metadatas"],
            )
        ids = (rows.get("ids") or [[]])[0]
        texts = (rows.get("documents") or [[]])[0]
        metadatas = (rows.get("metadatas") or [[]])[0]
        results = [
            SearchResult(
                id=chunk_id,
                title=metadata["title"],
                document_id=metadata["document_id"],
                text=text,
                section=metadata["section"],
                page=_page(metadata["page"]),
                category=metadata["category"],
                tags=_decode_tags(metadata["tags"]),
                source=metadata["source"],
                chunk_index=metadata["chunk_index"],
            )
            for chunk_id, text, metadata in zip(ids, texts, metadatas, strict=True)
        ]
        return SearchResponse(
            query=request.query,
            total=len(results),
            took_ms=round((time.perf_counter() - started) * 1000, 1),
            results=results,
        )
