export interface Health {
  status: string
  engine: string
  mode: string
  model: string
  documents: number
  chunks: number
}

export interface Document {
  id: string
  title: string
  source: string
  category: string
  tags: string[]
  chunks: number
  created_at: string
  checksum: string
}

export interface Chunk {
  id: string
  document_id: string
  text: string
  chunk_index: number
  section: string
  page: number | null
}

export interface DocumentDetail {
  document: Document
  chunks: Chunk[]
}

export interface SearchResult {
  id: string
  title: string
  document_id: string
  text: string
  section: string
  page: number | null
  category: string
  tags: string[]
  source: string
  chunk_index: number
}

export interface SearchResponse {
  query: string
  total: number
  took_ms: number
  results: SearchResult[]
}

export type View = 'search' | 'library' | 'about'
