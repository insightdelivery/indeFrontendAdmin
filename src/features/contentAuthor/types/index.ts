/**
 * Content Author 도메인 타입 정의
 * 연동 기준: author_id (author_code 없음)
 */

export type AuthorRole = 'DIRECTOR' | 'EDITOR'
export type AuthorStatus = 'ACTIVE' | 'INACTIVE'
export type ContentTypeOption = 'ARTICLE' | 'VIDEO' | 'SEMINAR'

export interface ContentAuthorContentTypeItem {
  id: number
  content_type: ContentTypeOption
  content_type_display?: string
}

export interface ContentAuthor {
  author_id: number
  name: string
  profile_image?: string | null
  role: AuthorRole
  status: AuthorStatus
  member_ship_sid?: string | null
  created_at: string
  updated_at: string
  content_types?: ContentAuthorContentTypeItem[] | ContentTypeOption[]
}

export interface ContentAuthorListParams {
  page?: number
  pageSize?: number
  name?: string
  status?: AuthorStatus
  content_type?: ContentTypeOption
}

export interface ContentAuthorListResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      authors: ContentAuthor[]
      total: number
      page: number
      pageSize: number
    }
  }
}

export interface ContentAuthorDetailResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: ContentAuthor
  }
}

export interface ContentAuthorCreateRequest {
  name: string
  profile_image?: string
  role: AuthorRole
  status: AuthorStatus
  member_ship_sid?: string | null
  content_types?: ContentTypeOption[]
}

export interface ContentAuthorUpdateRequest extends Partial<ContentAuthorCreateRequest> {
  author_id?: number
}
