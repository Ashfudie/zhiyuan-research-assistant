import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import {
  BookCopy,
  CalendarDays,
  Check,
  Database,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  LoaderCircle,
  Plus,
  RotateCw,
  Search,
  Tags,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { api } from './api'
import type { Document } from './types'
import DocumentDrawer from './DocumentDrawer'

interface LibraryProps {
  documents: Document[]
  loading: boolean
  error: string
  onRefresh: () => Promise<void>
  onChanged: () => Promise<void>
  onNotify: (message: string) => void
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

export default function Library({ documents, loading, error, onRefresh, onChanged, onNotify }: LibraryProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Document | null>(null)
  const [filter, setFilter] = useState('')

  const stats = useMemo(() => ({
    chunks: documents.reduce((sum, document) => sum + document.chunks, 0),
    categories: new Set(documents.map((document) => document.category)).size,
  }), [documents])

  const visibleDocuments = documents.filter((document) => {
    const keyword = filter.trim().toLocaleLowerCase()
    return !keyword || `${document.title}${document.category}${document.tags.join('')}`.toLocaleLowerCase().includes(keyword)
  })

  function uploaded(document: Document) {
    setUploadOpen(false)
    onNotify(`《${document.title}》导入成功，已生成 ${document.chunks} 个知识切片`)
    void onChanged()
  }

  function deleted(document: Document) {
    setDeleting(null)
    onNotify(`《${document.title}》已从资料库删除`)
    void onChanged()
  }

  return (
    <div className="page library-page">
      <header className="page-header library-header">
        <div>
          <span className="eyebrow"><BookCopy size={14} /> MY KNOWLEDGE BASE</span>
          <h1>我的资料</h1>
          <p>管理研学资料，让每一份知识都能被检索与引用。</p>
        </div>
        <button className="primary-button upload-trigger" onClick={() => setUploadOpen(true)}><Plus size={18} />导入资料</button>
      </header>

      <section className="library-stats" aria-label="资料统计">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={20} /></div>
          <div><span>资料文档</span><strong>{documents.length}<small>份</small></strong></div>
          <span className="stat-caption">已收录文档</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Database size={20} /></div>
          <div><span>知识切片</span><strong>{stats.chunks}<small>个</small></strong></div>
          <span className="stat-caption">可检索原文片段</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon accent"><FolderOpen size={20} /></div>
          <div><span>资料分类</span><strong>{stats.categories}<small>类</small></strong></div>
          <span className="stat-caption">有序组织知识</span>
        </div>
      </section>

      <section className="document-section">
        <div className="document-section-header">
          <div><h2>全部文档</h2><span>{visibleDocuments.length} 份资料</span></div>
          <div className="library-search"><Search size={16} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="筛选标题、分类或标签" aria-label="筛选资料" /></div>
        </div>

        {loading && (
          <div className="document-loading">
            {[0, 1, 2, 3].map((item) => <div className="document-row-skeleton" key={item}><div className="skeleton square" /><div><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div></div>)}
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <div className="empty-icon error"><RotateCw size={26} /></div>
            <h3>资料列表加载失败</h3><p>{error}</p>
            <button className="secondary-button" onClick={() => void onRefresh()}><RotateCw size={16} />重新加载</button>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="empty-state library-empty">
            <div className="empty-icon"><FilePlus2 size={28} /></div>
            <h3>从第一份研学资料开始</h3>
            <p>导入 TXT、Markdown 或 PDF 文档，知源会自动切分并建立检索索引。</p>
            <button className="primary-button" onClick={() => setUploadOpen(true)}><UploadCloud size={17} />导入第一份资料</button>
          </div>
        )}

        {!loading && !error && documents.length > 0 && visibleDocuments.length === 0 && (
          <div className="empty-state compact"><Search size={26} /><h3>没有匹配的资料</h3><p>换一个标题、分类或标签试试。</p><button className="text-button" onClick={() => setFilter('')}>清除筛选</button></div>
        )}

        {!loading && !error && visibleDocuments.length > 0 && (
          <div className="document-table-wrap">
            <table className="document-table">
              <thead><tr><th>文档</th><th>分类与标签</th><th>切片</th><th>导入时间</th><th><span className="sr-only">操作</span></th></tr></thead>
              <tbody>
                {visibleDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <button className="document-name" onClick={() => setViewingId(document.id)}>
                        <span className="document-icon"><FileText size={20} /></span>
                        <span><strong>{document.title}</strong><small>{document.source}</small></span>
                      </button>
                    </td>
                    <td><div className="document-taxonomy"><span className="category-label">{document.category}</span><div>{document.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}{document.tags.length > 2 && <span className="tag">+{document.tags.length - 2}</span>}</div></div></td>
                    <td><span className="chunk-count">{document.chunks}</span></td>
                    <td><span className="document-date"><CalendarDays size={14} />{formatDate(document.created_at)}</span></td>
                    <td><div className="document-actions"><button onClick={() => setViewingId(document.id)} aria-label={`查看${document.title}`} title="查看原文"><Eye size={17} /></button><button className="delete-action" onClick={() => setDeleting(document)} aria-label={`删除${document.title}`} title="删除文档"><Trash2 size={17} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="library-footnote">资料仅存储于当前服务 · 支持随时查看原文与删除索引</p>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={uploaded} />}
      {viewingId && <DocumentDrawer documentId={viewingId} onClose={() => setViewingId(null)} />}
      {deleting && <DeleteModal document={deleting} onClose={() => setDeleting(null)} onDeleted={() => deleted(deleting)} />}
    </div>
  )
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (document: Document) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('研学资料')
  const [tags, setTags] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose, uploading])

  function chooseFile(selected?: File) {
    if (!selected) return
    if (!/\.(txt|md|pdf)$/i.test(selected.name)) {
      setError('仅支持 .txt、.md、.pdf 格式的文档')
      return
    }
    setFile(selected)
    setError('')
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0])
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('请选择需要导入的文档')
      return
    }
    if (!category.trim()) {
      setError('请填写资料分类')
      return
    }
    setUploading(true)
    setError('')
    const normalizedTags = tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).join(',')
    try {
      onUploaded(await api.uploadDocument(file, category.trim(), normalizedTags))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败，请稍后重试')
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !uploading && onClose()}>
      <section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <header className="modal-header"><div><span className="eyebrow">ADD TO KNOWLEDGE BASE</span><h2 id="upload-title">导入研学资料</h2><p>上传后将自动切分、向量化并建立检索索引。</p></div><button className="icon-button" onClick={onClose} disabled={uploading} aria-label="关闭上传弹窗"><X size={20} /></button></header>
        <form onSubmit={submit}>
          <label
            className={`file-dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".txt,.md,.pdf" onChange={handleFile} disabled={uploading} />
            {file ? (
              <><div className="selected-file-icon"><FileText size={25} /></div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · 已准备上传</span><button type="button" className="remove-file" onClick={(event) => { event.preventDefault(); setFile(null); if (inputRef.current) inputRef.current.value = '' }} disabled={uploading}><X size={15} />移除</button></>
            ) : (
              <><div className="upload-icon"><UploadCloud size={27} /></div><strong>点击选择，或将文档拖到这里</strong><span>支持 TXT、Markdown、PDF，建议使用文字版文档</span><small>.TXT&nbsp;&nbsp; .MD&nbsp;&nbsp; .PDF</small></>
            )}
          </label>

          <div className="form-grid">
            <label className="form-field"><span>资料分类 <b>*</b></span><div><FolderOpen size={16} /><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="如：历史文化" disabled={uploading} /></div><small>用于组织资料和缩小检索范围</small></label>
            <label className="form-field"><span>资料标签</span><div><Tags size={16} /><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="丝绸之路, 历史, 文化交流" disabled={uploading} /></div><small>多个标签请用逗号分隔</small></label>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="modal-footer"><span><Check size={14} />文档内容将保存在本地服务</span><div><button type="button" className="secondary-button" onClick={onClose} disabled={uploading}>取消</button><button className="primary-button" type="submit" disabled={uploading}>{uploading ? <LoaderCircle size={17} className="spin" /> : <UploadCloud size={17} />}{uploading ? '正在导入…' : '开始导入'}</button></div></footer>
        </form>
      </section>
    </div>
  )
}

function DeleteModal({ document, onClose, onDeleted }: { document: Document; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [deleting, onClose])

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      await api.deleteDocument(document.id)
      onDeleted()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败，请稍后重试')
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !deleting && onClose()}>
      <section className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="delete-modal-icon"><Trash2 size={24} /></div>
        <h2 id="delete-title">确认删除这份资料？</h2>
        <p>将删除 <strong>《{document.title}》</strong> 及其 {document.chunks} 个知识切片。此操作无法撤销。</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="delete-modal-actions"><button className="secondary-button" onClick={onClose} disabled={deleting}>保留资料</button><button className="danger-button" onClick={() => void confirmDelete()} disabled={deleting}>{deleting && <LoaderCircle size={16} className="spin" />}{deleting ? '正在删除…' : '确认删除'}</button></div>
      </section>
    </div>
  )
}
