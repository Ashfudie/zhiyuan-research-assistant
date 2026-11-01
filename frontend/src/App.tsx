import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Database, FileText, Info, Search, X } from 'lucide-react'
import { api } from './api'
import type { Document, Health, View } from './types'
import SearchWorkspace from './SearchWorkspace'
import Library from './Library'
import About from './About'

const navItems: { id: View; label: string; icon: typeof Search }[] = [
  { id: 'search', label: '检索工作台', icon: Search },
  { id: 'library', label: '我的资料', icon: FileText },
  { id: 'about', label: '项目说明', icon: Info },
]

interface Toast {
  id: number
  message: string
}

export default function App() {
  const [view, setView] = useState<View>('search')
  const [documents, setDocuments] = useState<Document[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsError, setDocumentsError] = useState('')
  const [serviceError, setServiceError] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const refreshDocuments = useCallback(async () => {
    setDocumentsLoading(true)
    setDocumentsError('')
    try {
      setDocuments(await api.documents())
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : '资料加载失败')
    } finally {
      setDocumentsLoading(false)
    }
  }, [])

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await api.health())
      setServiceError(false)
    } catch {
      setServiceError(true)
    }
  }, [])

  useEffect(() => {
    void refreshDocuments()
    void refreshHealth()
  }, [refreshDocuments, refreshHealth])

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleDataChanged = useCallback(async () => {
    await Promise.all([refreshDocuments(), refreshHealth()])
  }, [refreshDocuments, refreshHealth])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView('search')} aria-label="返回检索工作台">
          <span className="brand-mark">知</span>
          <span className="brand-copy">
            <strong>知源</strong>
            <small>研学资料检索助手</small>
          </span>
        </button>

        <div className="sidebar-section-label">工作空间</div>
        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === 'library' && <span className="nav-count">{documents.length}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-note">
          <BookOpen size={18} strokeWidth={1.7} />
          <p>让每一次探索<br />都有据可查。</p>
          <span>检索 · 阅读 · 溯源</span>
        </div>

        <div className="service-status">
          <div className="service-status-heading">
            <span className={`status-dot ${serviceError ? 'offline' : ''}`} />
            <span>{serviceError ? '检索服务未连接' : health ? '检索服务在线' : '正在连接服务'}</span>
            <Database size={15} />
          </div>
          <p>{health ? `${health.engine} · ${health.mode}` : 'seekdb 混合检索引擎'}</p>
        </div>
      </aside>

      <main className="main-content" id="main-content">
        {view === 'search' && <SearchWorkspace documents={documents} documentsLoading={documentsLoading} />}
        {view === 'library' && (
          <Library
            documents={documents}
            loading={documentsLoading}
            error={documentsError}
            onRefresh={refreshDocuments}
            onChanged={handleDataChanged}
            onNotify={notify}
          />
        )}
        {view === 'about' && <About health={health} onStart={() => setView('search')} />}
      </main>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <CheckCircle2 size={19} />
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="关闭提示"><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
