import unittest

from app.chunking import PageText, chunk_pages, extract_pages
from app.schemas import SearchRequest


class ChunkingTests(unittest.TestCase):
    def test_markdown_headings_become_sections(self):
        chunks = chunk_pages([PageText("# 第一章\n\n索引用于加速查询。\n\n## 第二章\n\n事务保证一致性。", None)])
        self.assertEqual([chunk.section for chunk in chunks], ["第一章", "第二章"])
        self.assertEqual(chunks[0].text, "索引用于加速查询。")

    def test_long_text_is_split_within_limit(self):
        chunks = chunk_pages([PageText("短句。" * 500, 3)], max_chars=100)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk.text) <= 100 for chunk in chunks))
        self.assertTrue(all(chunk.page == 3 for chunk in chunks))

    def test_utf8_text_is_supported(self):
        pages = extract_pages("笔记.md", "# 标题\n\n中文内容".encode())
        self.assertEqual(pages[0].text, "# 标题\n\n中文内容")

    def test_invalid_encoding_has_clear_error(self):
        with self.assertRaisesRegex(ValueError, "UTF-8"):
            extract_pages("bad.txt", b"\xff\xfe")

    def test_blank_search_is_rejected(self):
        with self.assertRaises(ValueError):
            SearchRequest(query="   ")


if __name__ == "__main__":
    unittest.main()
