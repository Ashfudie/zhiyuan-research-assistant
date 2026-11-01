import { useCallback, useEffect, useState } from 'react'
import { BookOpen, FileText, Hash, MapPin, RotateCw, X } from 'lucide-react'
import { api } from './api'
import type { DocumentDetail, SearchResult } from './types'
import HighlightText from './HighlightText'

interface DocumentDrawerProps {
  documentId: string
  result?: SearchResult
  query?: string
  onClose: () => void
}

export default function DocumentDrawer({ documentId, result, query, onClose }: DocumentDrawerProps) {
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDetail(await api.document(documentId))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '原文加载失败')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="document-drawer" role="dialog" aria-modal="true" aria-label="原文溯源">
        <header className="drawer-header">
          <div>
            <span className="eyebrow"><BookOpen size={14} /> SOURCE VIEW</span>
            <h2>原文溯源</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭原文"><X size={20} /></button>
        </header>

        {loading && (
          <div className="drawer-loading" aria-label="正在加载原文">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-meta" />
            <div className="skeleton skeleton-paragraph" />
            <div className="skeleton skeleton-paragraph" />
            <span>正在调取原文切片…</span>
          </div>
        )}

        {!loading && error && (
          <div className="drawer-error">
            <FileText size={30} />
            <h3>暂时无法打开原文</h3>
            <p>{error}</p>
            <button className="secondary-button" onClick={() => void load()}><RotateCw size={16} />重新加载</button>
          </div>
        )}

        {!loading && !error && detail && (
          <div className="drawer-body">
            <section className="source-document-info">
              <div className="source-file-icon"><FileText size={22} /></div>
              <div>
                <span className="category-label">{detail.document.category}</span>
                <h3>{detail.document.title}</h3>
                <p>{detail.document.source}</p>
              </div>
            </section>

            <div className="source-meta-row">
              <span><Hash size={14} />共 {detail.chunks.length} 个切片</span>
              <span><MapPin size={14} />保留章节与页码</span>
            </div>

            <div className="source-divider"><span>文档原文</span></div>

            <div className="source-chunks">
              {detail.chunks.length === 0 && <p className="muted-text">此文档暂无可显示的原文切片。</p>}
              {detail.chunks.map((chunk) => {
                const isHit = result?.id === chunk.id || (result?.document_id === chunk.document_id && result?.chunk_index === chunk.chunk_index)
                return (
                  <article className={`source-chunk ${isHit ? 'is-hit' : ''}`} key={chunk.id} id={`chunk-${chunk.chunk_index}`}>
                    <div className="source-chunk-heading">
                      <span>{chunk.section || '正文'}</span>
                      <span>{isHit ? '检索命中 · ' : ''}第 {chunk.chunk_index + 1} 段{chunk.page !== null ? ` · 第 ${chunk.page} 页` : ''}</span>
                    </div>
                    <p><HighlightText text={chunk.text} query={query} /></p>
                  </article>
                )
              })}
            </div>
            <footer className="checksum">校验码 {detail.document.checksum.slice(0, 16)}{detail.document.checksum.length > 16 ? '…' : ''}</footer>
          </div>
        )}
      </aside>
    </div>
  )
}
