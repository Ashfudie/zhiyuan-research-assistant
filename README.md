# 知源 Zhiyuan

知源是一个可溯源的研学资料检索助手。它将论文、课程笔记和实验记录统一导入 seekdb，通过向量、全文和结构化条件混合检索，帮助用户找到相关段落并回到原文核对出处。

## 功能

- 导入 TXT、Markdown 和文本型 PDF，支持分类与标签。
- 按章节和段落切分，保留来源、页码和段落编号。
- 使用本地 `BAAI/bge-small-zh-v1.5` 模型生成 512 维向量，无需模型 API Key。
- 在 seekdb 中执行全文、向量、结构化过滤和 RRF 融合排序。
- 查看检索耗时、原文上下文，管理上传与删除，拦截重复内容。
- 支持嵌入式 seekdb 和 Docker 服务端两种运行方式。

## 技术栈

- 后端：FastAPI、pyseekdb、Sentence Transformers
- 前端：React、TypeScript、Vite
- 数据与检索：OceanBase seekdb

```text
文档导入 → 章节切分 → 本地向量化 → seekdb 混合检索 → 原文溯源
```

## 快速开始

推荐 Python 3.12+ 和 Node.js 22+。嵌入式模式不需要 Docker。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cd frontend
npm install
npm run build
cd ..
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

打开 `http://127.0.0.1:8000`。首次启动会下载向量模型，并导入 `samples/` 中的四份示例资料。数据保存在 `data/seekdb/`，不会进入版本库。

### 前端开发

后端运行后，在另一个终端执行：

```bash
cd frontend
npm run dev
```

访问 `http://127.0.0.1:5173`，Vite 会代理 `/api` 请求。

## 使用 Docker 服务端 seekdb

```bash
docker compose up -d seekdb
cp .env.example .env
```

将 `.env` 中的 `SEEKDB_MODE` 改为 `server`，按需配置地址和凭据，然后执行：

```bash
.venv/bin/python -m uvicorn app.main:app --app-dir backend --env-file .env --host 0.0.0.0 --port 8000
```

只在受信网络中开放数据库端口，不要提交真实密码或凭据。

## 验证

应用运行时执行：

```bash
.venv/bin/python scripts/verify_seekdb.py
.venv/bin/python scripts/verify_api_edges.py
```

单元测试：

```bash
cd backend
../.venv/bin/python -m unittest discover -s tests -v
```

验证覆盖真实 seekdb 混合检索、跨措辞语义查询、结构化过滤、原文溯源、上传、重复导入和删除。详细手工步骤见 `docs/verification.md`，已有验证记录位于 `artifacts/`。

## 主要目录

```text
backend/     FastAPI、文档处理、向量生成与 seekdb 接入
frontend/    React 检索和资料管理界面
samples/     可复现的示例资料
scripts/     自动化验证脚本
docs/        验证说明
artifacts/   测试记录与应用截图
data/        本地数据目录，不保存到版本库
```

## 配置

配置示例见 `.env.example`。默认使用嵌入式模式和 `BAAI/bge-small-zh-v1.5`。更换向量模型后，请使用新的数据目录，避免向量维度不一致。

## 致谢

- [OceanBase seekdb](https://github.com/oceanbase/seekdb)
- [BAAI/bge-small-zh-v1.5](https://huggingface.co/BAAI/bge-small-zh-v1.5)
