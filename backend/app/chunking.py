import io
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PageText:
    text: str
    page: int | None


@dataclass(frozen=True)
class TextChunk:
    text: str
    section: str
    page: int | None


def extract_pages(filename: str, content: bytes) -> list[PageText]:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md"}:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("文本文件必须使用 UTF-8 编码") from exc
        return [PageText(text=text, page=None)]
    if suffix == ".pdf":
        from pypdf import PdfReader

        try:
            reader = PdfReader(io.BytesIO(content))
            return [PageText(text=page.extract_text() or "", page=index) for index, page in enumerate(reader.pages, 1)]
        except Exception as exc:
            raise ValueError("PDF 无法解析，请确认文件未加密且包含可复制文本") from exc
    raise ValueError("仅支持 .txt、.md 和 .pdf 文件")


def _paragraphs(text: str) -> list[tuple[str, str]]:
    section = "正文"
    buffer: list[str] = []
    blocks: list[tuple[str, str]] = []

    def flush() -> None:
        if buffer:
            value = "\n".join(buffer).strip()
            if value:
                blocks.append((value, section))
            buffer.clear()

    for raw_line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw_line.strip()
        heading = re.match(r"^#{1,6}\s+(.+)$", line)
        if heading:
            flush()
            section = heading.group(1).strip()
        elif not line:
            flush()
        else:
            buffer.append(line)
    flush()
    return blocks


def _split_long_text(text: str, max_chars: int) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[。！？!?；;])\s*|\n", text) if part.strip()]
    pieces: list[str] = []
    current = ""
    for sentence in sentences:
        while len(sentence) > max_chars:
            if current:
                pieces.append(current)
                current = ""
            pieces.append(sentence[:max_chars])
            sentence = sentence[max_chars:]
        if current and len(current) + len(sentence) + 1 > max_chars:
            pieces.append(current)
            current = sentence
        else:
            current = f"{current}\n{sentence}" if current else sentence
    if current:
        pieces.append(current)
    return pieces


def chunk_pages(pages: list[PageText], max_chars: int = 650) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    for page in pages:
        current = ""
        current_section = "正文"

        def flush() -> None:
            nonlocal current
            if current.strip():
                chunks.append(TextChunk(text=current.strip(), section=current_section, page=page.page))
                current = ""

        for block, section in _paragraphs(page.text):
            for piece in _split_long_text(block, max_chars):
                if current and (section != current_section or len(current) + len(piece) + 2 > max_chars):
                    flush()
                current_section = section
                current = f"{current}\n\n{piece}" if current else piece
        flush()
    return chunks
