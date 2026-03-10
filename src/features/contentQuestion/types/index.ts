/**
 * 콘텐츠 질문(Content Question) 타입
 */

export type ContentTypeQuestion = 'ARTICLE' | 'VIDEO' | 'SEMINAR'

export interface ContentQuestion {
  question_id: number
  content_type: ContentTypeQuestion
  content_id: number
  question_text: string
  sort_order: number
  is_required: boolean
  is_locked: boolean
  created_by?: number | null
  created_at: string
  updated_at: string
}

export interface ContentQuestionCreateRequest {
  content_type: ContentTypeQuestion
  content_id: number
  question_text: string
  sort_order?: number
  is_required?: boolean
}

export interface ContentQuestionUpdateRequest {
  question_text?: string
  sort_order?: number
  is_required?: boolean
}
