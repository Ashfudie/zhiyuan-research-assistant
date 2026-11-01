import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


def _path_from_env(name: str, default: str) -> Path:
    value = Path(os.getenv(name, default))
    return value if value.is_absolute() else BASE_DIR / value


@dataclass(frozen=True)
class Settings:
    seekdb_mode: str = os.getenv("SEEKDB_MODE", "embedded")
    seekdb_path: Path = _path_from_env("SEEKDB_PATH", "./data/seekdb")
    seekdb_database: str = os.getenv("SEEKDB_DATABASE", "test")
    seekdb_host: str = os.getenv("SEEKDB_HOST", "127.0.0.1")
    seekdb_port: int = int(os.getenv("SEEKDB_PORT", "2881"))
    seekdb_tenant: str = os.getenv("SEEKDB_TENANT", "sys")
    seekdb_user: str = os.getenv("SEEKDB_USER", "root")
    seekdb_password: str = os.getenv("SEEKDB_PASSWORD", "")
    collection_name: str = "research_documents"
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
    auto_seed: bool = os.getenv("AUTO_SEED", "true").lower() == "true"
    sample_dir: Path = _path_from_env("SAMPLE_DIR", "./samples")
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_MB", "5")) * 1024 * 1024
