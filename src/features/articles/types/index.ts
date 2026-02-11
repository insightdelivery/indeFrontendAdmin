/**
 * Article 도메인 타입 정의
 */

export interface Article {
  id: number
  title: string
  subtitle?: string
  content: string
  thumbnail?: string
  category: string
  author: string
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'draft' | 'published' | 'private' | 'scheduled' | 'deleted' | string
  isEditorPick: boolean
  viewCount: number
  rating?: number
  commentCount: number
  highlightCount: number
  questionCount: number
  tags?: string[]
  questions?: string[]
  previewLength?: number
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: string
}

export interface ArticleListParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  category?: string
  visibility?: string
  status?: string
  search?: string
}

export interface ArticleListResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      articles: Article[]
      total: number
      page: number
      pageSize: number
    }
  }
}

export interface ArticleResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: Article
  }
}

export interface ArticleCreateRequest {
  title: string
  subtitle?: string
  content: string
  thumbnail?: string
  category: string
  author: string
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'draft' | 'published' | 'private' | 'scheduled' | string
  isEditorPick?: boolean
  tags?: string[]
  questions?: string[]
  previewLength?: number
  scheduledAt?: string
}

export interface ArticleUpdateRequest extends Partial<ArticleCreateRequest> {
  id: number
}

