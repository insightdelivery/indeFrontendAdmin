/**
 * Video 도메인 타입 정의
 */

import type { VideoSourceType } from '../constants'

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
  sourceType?: VideoSourceType
  thumbnail?: string
  speaker?: string
  /** 레거시 Content Author FK — 신규 저장 시 null */
  speaker_id?: number | null
  speakerAffiliation?: string | null
  speakerProfileImage?: string | null
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  /** 노출 상태 sysCodeSid (발행 SID 집합) */
  status: string
  allowComment?: boolean
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
  sort?: 'createdAt' | 'viewCount' | 'rating'
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
  videoStreamId?: string | null
  videoUrl?: string | null
  sourceType?: VideoSourceType
  thumbnail?: string
  speaker?: string
  speaker_id?: number | null
  speakerAffiliation?: string
  speakerProfileImage?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased' | string
  status: 'public' | 'private' | 'scheduled' | string
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
