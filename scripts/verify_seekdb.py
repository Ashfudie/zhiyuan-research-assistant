import json
import os
import urllib.request

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def request(path: str, payload: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


health = request("/api/health")
assert health["status"] == "ok" and health["engine"] == "seekdb"
assert health["documents"] >= 4 and health["chunks"] > 0

hybrid = request("/api/search", {"query": "混合检索", "limit": 5})
assert hybrid["results"], "混合检索没有返回结果"
assert any("混合检索" in item["title"] for item in hybrid["results"])

semantic = request("/api/search", {"query": "怎样减少数据库磁盘读写", "limit": 5})
assert semantic["results"], "语义检索没有返回结果"

filtered = request("/api/search", {"query": "HNSW", "limit": 5, "category": "实验记录"})
assert filtered["results"], "结构化过滤检索没有返回结果"
assert all(item["category"] == "实验记录" for item in filtered["results"])

first = hybrid["results"][0]
detail = request(f"/api/documents/{first['document_id']}")
assert first["id"] in {chunk["id"] for chunk in detail["chunks"]}, "检索结果无法回溯到原文"

print(json.dumps({
    "status": "passed",
    "engine": health["engine"],
    "mode": health["mode"],
    "embedding_model": health["model"],
    "documents": health["documents"],
    "chunks": health["chunks"],
    "checks": [
        {"name": "向量+全文混合检索", "query": hybrid["query"], "results": hybrid["total"], "first_source": first["source"]},
        {"name": "跨措辞语义检索", "query": semantic["query"], "results": semantic["total"], "first_source": semantic["results"][0]["source"]},
        {"name": "元数据结构化过滤", "query": filtered["query"], "category": "实验记录", "results": filtered["total"]},
        {"name": "原文溯源", "document": detail["document"]["title"], "matched_chunks": len(detail["chunks"])},
    ],
}, ensure_ascii=False, indent=2))
