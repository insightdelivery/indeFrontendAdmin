/**
 * Video 관련 상수 정의
 */

/** 비디오 콘텐츠 카테고리 — 시스템 코드 부모 SID (`videoPlan.md` §2.1.1) */
export const VIDEO_CATEGORY_PARENT = 'SYS26325B002'

/** 세미나 콘텐츠 카테고리 — 시스템 코드 부모 SID (`seminarPlan.md`) */
export const SEMINAR_CATEGORY_PARENT = 'SYS26325B003'

// 콘텐츠 타입
export const CONTENT_TYPE = {
  VIDEO: 'video',
  SEMINAR: 'seminar',
} as const

/** 비디오 본편 소스 (세미나는 항상 FILE_UPLOAD) */
export const VIDEO_SOURCE_TYPE = {
  FILE_UPLOAD: 'FILE_UPLOAD',
  VIMEO: 'VIMEO',
  YOUTUBE: 'YOUTUBE',
} as const

export type VideoSourceType = (typeof VIDEO_SOURCE_TYPE)[keyof typeof VIDEO_SOURCE_TYPE]

// 공개 범위 (레거시, 실제로는 시스템 코드 사용)
export const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체 공개' },
  { value: 'free', label: '무료 회원' },
  { value: 'paid', label: '유료 회원' },
  { value: 'purchased', label: '콘텐츠 구매자' },
] as const

// 상태
export const VIDEO_STATUS = {
  PUBLIC: 'public', // 공개
  PRIVATE: 'private', // 비공개
  SCHEDULED: 'scheduled', // 예약
  DELETED: 'deleted', // 삭제대기
} as const

// 검색 타입
export const SEARCH_TYPE = {
  ALL: 'all',
  TITLE: 'title',
  SPEAKER: 'speaker',
  KEYWORD: 'keyword',
} as const

// 정렬 옵션 (API는 createdAt / viewCount / rating 만 허용 — videoPlan §6.2.4)
export const SORT_OPTIONS = {
  CREATED_AT: 'createdAt',
  VIEW_COUNT: 'viewCount',
  RATING: 'rating',
} as const

// 라우트 경로
export const VIDEO_ROUTES = {
  LIST: '/admin/video',
  NEW: '/admin/video/new',
  // output: 'export' 환경에서 동적 라우트([id])는 모든 id를 사전에 생성할 수 없어 런타임 에러가 발생함
  // 따라서 쿼리스트링 기반 정적 라우트로 처리
  EDIT: (id: number) => `/admin/video/edit?id=${id}`,
  DETAIL: (id: number) => `/admin/video/detail?id=${id}`,
} as const

// React Query 키
export const VIDEO_QUERY_KEYS = {
  all: ['videos'] as const,
  lists: () => [...VIDEO_QUERY_KEYS.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...VIDEO_QUERY_KEYS.lists(), params] as const,
  details: () => [...VIDEO_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...VIDEO_QUERY_KEYS.details(), id] as const,
} as const

