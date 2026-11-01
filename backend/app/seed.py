from .config import Settings
from .store import SeekdbStore

SAMPLES = {
    "混合检索研究笔记.md": ("研究方法", ["混合检索", "向量", "全文"]),
    "Transformer论文导读.md": ("论文阅读", ["Transformer", "注意力机制"]),
    "向量索引实验记录.md": ("实验记录", ["HNSW", "召回率", "参数"]),
    "数据库课程笔记.md": ("课程笔记", ["索引", "事务", "复习"]),
}


def seed_samples(store: SeekdbStore, settings: Settings) -> int:
    if store.collection.count() > 0:
        return 0
    imported = 0
    for filename, (category, tags) in SAMPLES.items():
        path = settings.sample_dir / filename
        if path.exists():
            store.ingest(filename, path.read_bytes(), category, tags)
            imported += 1
    return imported
