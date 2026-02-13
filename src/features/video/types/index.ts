/**
 * Video 도메인 타입 정의
 */

export interface Video {
  id: number
  displayId?: string
  contentType: 'video' | 'seminar'
  category: string
  title: string
  subtitle?: string
  body?: string
  videoStreamId?: string
  videoUrl?: string
  thumbnail?: string
  speaker?: string
  speakerAffiliation?: string
  editor?: string
  director?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'public' | 'private' | 'scheduled' | 'deleted' | string
  isNewBadge: boolean
  isMaterialBadge: boolean
  allowRating: boolean
  allowComment: boolean
  viewCount: number
  rating?: number
  commentCount: number
  tags?: string[]
  questions?: string[]
  attachments?: Array<{
    filename: string
    url: string
    size?: number
  }>
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: string
  videoStreamInfo?: {
    embedUrl?: string
    thumbnailUrl?: string
    hlsUrl?: string
    dashUrl?: string
    status?: string
    duration?: number
    size?: number
    width?: number
    height?: number
  } | null
}

export interface VideoListParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  contentType?: 'video' | 'seminar'
  category?: string
  visibility?: string
  status?: string
  search?: string
  searchType?: 'all' | 'title' | 'speaker' | 'keyword'
  editor?: string
  director?: string
  sort?: 'createdAt' | 'viewCount' | 'rating' | 'shareCount'
}

export interface VideoListResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      videos: Video[]
      total: number
      page: number
      pageSize: number
    }
  }
}

export interface VideoResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: Video
  }
}

export interface VideoCreateRequest {
  contentType: 'video' | 'seminar'
  category: string
  title: string
  subtitle?: string
  body?: string
  videoStreamId?: string
  videoUrl?: string
  thumbnail?: string
  speaker?: string
  speakerAffiliation?: string
  editor?: string
  director?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'public' | 'private' | 'scheduled' | string
  isNewBadge?: boolean
  isMaterialBadge?: boolean
  allowRating?: boolean
  allowComment?: boolean
  tags?: string[]
  questions?: string[]
  attachments?: Array<{
    filename: string
    url: string
    size?: number
  }>
  scheduledAt?: string
}

export interface VideoUpdateRequest extends Partial<VideoCreateRequest> {
  id: number
}

