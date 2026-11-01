import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  FileSearch,
  FileText,
  Filter,
  Lightbulb,
  LoaderCircle,
  RotateCw,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { api } from './api'
import type { Document, SearchResponse, SearchResult } from './types'
import DocumentDrawer from './DocumentDrawer'
import HighlightText from './HighlightText'

const examples = [
  '混合检索如何兼顾语义与关键词？',
  'HNSW 参数如何影响召回率？',
  'Transformer 为什么需要位置编码？',
]

interface SearchWorkspaceProps {
  documents: Document[]
  documentsLoading: boolean
}

export default function SearchWorkspace({ documents, documentsLoading }: SearchWorkspaceProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const latestSearch = useRef(0)

  const categories = useMemo(() => [...new Set(documents.map((document) => document.category))], [documents])

  async function performSearch(searchQuery = query) {
    const cleanQuery = searchQuery.trim()
    if (!cleanQuery) {
      setError('请输入想研究的问题或关键词')
      return
    }
    const searchId = ++latestSearch.current
    setLoading(true)
    setError('')
    try {
      const data = await api.search(cleanQuery, category, documentId)
      if (searchId === latestSearch.current) setResponse(data)
    } catch (searchError) {
      if (searchId === latestSearch.current) {
        setError(searchError instanceof Error ? searchError.message : '检索失败，请稍后重试')
        setResponse(null)
      }
    } finally {
      if (searchId === latestSearch.current) setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void performSearch()
  }

  function useExample(example: string) {
    setQuery(example)
    void performSearch(example)
  }

  function resetFilters() {
    setCategory('')
    setDocumentId('')
  }

  return (
    <div className="page search-page">
      <header className="page-header search-header">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> RESEARCH WORKSPACE</span>
          <h1>从问题出发，<span>回到知识原文</span></h1>
          <p>输入你的研学问题，在已有资料中检索线索、阅读证据。</p>
        </div>
        <div className="header-edition"><span>知源</span><small>EVIDENCE FIRST</small></div>
      </header>

      <section className="search-panel" aria-label="资料检索">
        <form className="search-form" onSubmit={handleSubmit}>
          <Search className="search-input-icon" size={22} strokeWidth={1.8} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入一个研学问题，或想查找的关键词…"
            aria-label="检索问题"
            autoComplete="off"
          />
          {query && <button type="button" className="clear-query" onClick={() => setQuery('')} aria-label="清空问题">清除</button>}
          <button className="primary-button search-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
            <span>{loading ? '检索中' : '开始检索'}</span>
          </button>
        </form>

        <div className="example-row">
          <span><Lightbulb size={14} />试试这些问题</span>
          <div className="example-list">
            {examples.map((example) => (
              <button key={example} onClick={() => useExample(example)}>{example}<ChevronRight size={13} /></button>
            ))}
          </div>
        </div>
      </section>

      <section className="filter-panel" aria-label="筛选检索范围">
        <div className="filter-heading"><SlidersHorizontal size={16} /><span>检索范围</span></div>
        <div className="category-filters">
          <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>全部资料</button>
          {categories.map((item) => (
            <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <label className="document-filter">
          <FileText size={15} />
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} disabled={documentsLoading} aria-label="按文档筛选">
            <option value="">全部文档</option>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
        </label>
      </section>

      {error && (
        <div className="inline-error" role="alert">
          <FileSearch size={19} />
          <div><strong>这次检索没有完成</strong><p>{error}</p></div>
          {query.trim() && <button onClick={() => void performSearch()}><RotateCw size={15} />重试</button>}
        </div>
      )}

      {loading && (
        <section className="results-section" aria-label="正在检索">
          <div className="results-summary"><span className="loading-dot" />正在理解问题并匹配相关资料…</div>
          {[0, 1, 2].map((item) => (
            <div className="result-card result-skeleton" key={item}>
              <div className="skeleton skeleton-result-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </section>
      )}

      {!loading && !error && !response && (
        <section className="search-welcome">
          <div className="welcome-illustration" aria-hidden="true">
            <div className="paper paper-back" />
            <div className="paper paper-front"><span /><span /><span /><mark /></div>
            <div className="welcome-search-icon"><Search size={24} /></div>
          </div>
          <div className="welcome-copy">
            <span className="section-kicker">有依据的研学，从一次好检索开始</span>
            <h2>答案不止于匹配，更在于可追溯</h2>
            <p>知源会同时理解关键词与语义，将相关内容按文档切片呈现。每条结果都保留章节、页码与来源，方便继续阅读和核对。</p>
            <div className="welcome-features">
              <span><Search size={16} />关键词与语义混合检索</span>
              <span><BookOpen size={16} />原文上下文完整呈现</span>
              <span><Filter size={16} />按分类与文档缩小范围</span>
            </div>
          </div>
        </section>
      )}

      {!loading && response && (
        <section className="results-section">
          <div className="results-summary">
            <div>
              <span className="section-kicker">检索结果</span>
              <h2>与「{response.query}」相关的资料</h2>
            </div>
            <div className="result-metrics">
              <span><strong>{response.total}</strong> 条相关内容</span>
              <span><Clock3 size={14} />{response.took_ms} ms</span>
            </div>
          </div>

          {response.results.length === 0 ? (
            <div className="empty-state results-empty">
              <div className="empty-icon"><SearchX size={28} /></div>
              <h3>暂未找到相关内容</h3>
              <p>可以尝试缩短问题、更换关键词，或扩大检索范围。</p>
              {(category || documentId) && <button className="secondary-button" onClick={resetFilters}>清除筛选条件</button>}
            </div>
          ) : (
            <div className="result-list">
              {response.results.map((result, index) => (
                <article className="result-card" key={result.id}>
                  <div className="result-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="result-content">
                    <div className="result-title-row">
                      <div>
                        <span className="category-label">{result.category}</span>
                        <h3>{result.title}</h3>
                      </div>
                      <span className="result-location">{result.section || '正文'}{result.page !== null ? ` · 第 ${result.page} 页` : ''}</span>
                    </div>
                    <p className="result-text"><HighlightText text={result.text} query={response.query} /></p>
                    <div className="result-footer">
                      <div className="result-source-tags">
                        <span className="source-name"><FileText size={14} />{result.source}</span>
                        {result.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                      </div>
                      <button className="text-button" onClick={() => setSelectedResult(result)}>查看原文<ArrowRight size={15} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {response.results.length > 0 && <p className="results-footnote">结果来自你的本地资料库 · 点击「查看原文」核对完整上下文</p>}
        </section>
      )}

      {selectedResult && (
        <DocumentDrawer
          documentId={selectedResult.document_id}
          result={selectedResult}
          query={response?.query}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  )
}
