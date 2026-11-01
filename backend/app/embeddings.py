from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()

    def documents(self, texts: list[str]) -> list[list[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return vectors.tolist()

    def query(self, text: str) -> list[float]:
        if self.model_name.startswith("BAAI/bge"):
            text = f"为这个句子生成表示以用于检索相关文章：{text}"
        return self.documents([text])[0]
