import type { Document, DocumentDetail, Health, SearchResponse } from './types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
    let message = `请求失败（${response.status}）`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      // 保留 HTTP 状态提示
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  health: () => request<Health>('/health'),
  documents: () => request<Document[]>('/documents'),
  document: (id: string) => request<DocumentDetail>(`/documents/${id}`),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: (file: File, category: string, tags: string) => {
    const data = new FormData()
    data.append('file', file)
    data.append('category', category)
    data.append('tags', tags)
    return request<Document>('/documents', { method: 'POST', body: data })
  },
  search: (query: string, category?: string, documentId?: string) =>
    request<SearchResponse>('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 8, ...(category ? { category } : {}), ...(documentId ? { document_id: documentId } : {}) }),
    }),
}
