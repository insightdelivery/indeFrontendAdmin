/**
 * Article 도메인 타입 정의
 */

export interface Article {
  id: number
  title: string
  subtitle?: string
  content: string
  sermonHighlight?: string
  thumbnail?: string
  category: string
  author: string
  /** 콘텐츠 저자(ContentAuthor) PK */
  author_id?: number | null
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  /** 발행 상태 sysCodeSid */
  status: string
  isEditorPick: boolean
  viewCount: number
  rating?: number
  allowComment: boolean
  commentCount: number
  highlightCount: number
  questionCount: number
  tags?: string[]
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
  sermonHighlight?: string
  thumbnail?: string
  category: string
  author: string
  /** 콘텐츠 저자(에디터) PK. 보내면 백엔드에서 author를 저자 name으로 설정 */
  author_id?: number | null
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'draft' | 'published' | 'private' | 'scheduled' | string
  isEditorPick?: boolean
  allowComment?: boolean
  tags?: string[]
  previewLength?: number
  scheduledAt?: string
}

export interface ArticleUpdateRequest extends Partial<ArticleCreateRequest> {
  id: number
}

