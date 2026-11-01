import json
import os
import urllib.error
import urllib.request
import uuid

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def call(path: str, method: str = "GET", body: bytes | None = None, content_type: str | None = None):
    headers = {"Content-Type": content_type} if content_type else {}
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        return exc.code, json.loads(raw) if raw else None


document_id = None
try:
    boundary = f"----zhiyuan-{uuid.uuid4().hex}"
    text = f"用于验证上传与删除流程的实验笔记。编号：{uuid.uuid4().hex}"
    parts = []
    for name, value in [("category", "验证样例"), ("tags", "上传,边界测试")]:
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"edge-test.txt\"\r\nContent-Type: text/plain\r\n\r\n".encode()
        + text.encode()
        + f"\r\n--{boundary}--\r\n".encode()
    )
    status, uploaded = call("/api/documents", "POST", b"".join(parts), f"multipart/form-data; boundary={boundary}")
    assert status == 201, (status, uploaded)
    document_id = uploaded["id"]

    status, duplicate = call("/api/documents", "POST", b"".join(parts), f"multipart/form-data; boundary={boundary}")
    assert status == 409, (status, duplicate)

    status, _ = call("/api/search", "POST", json.dumps({"query": "   "}).encode(), "application/json")
    assert status == 422

    status, _ = call(f"/api/documents/{document_id}", "DELETE")
    assert status == 204
    document_id = None

    status, _ = call(f"/api/documents/{uploaded['id']}")
    assert status == 404
    print(json.dumps({"status": "passed", "checks": ["上传", "重复导入拦截", "空查询校验", "删除", "删除后404"]}, ensure_ascii=False))
finally:
    if document_id:
        call(f"/api/documents/{document_id}", "DELETE")
