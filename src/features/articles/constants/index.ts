/**
 * Article 관련 상수 정의
 */

// 아티클 카테고리 (레거시, 실제로는 시스템 코드 사용)
export const ARTICLE_CATEGORIES = [
  '전체',
  '서적',
  '브랜딩',
  '공간',
  '고전',
  '취미/일상',
  '사회',
  '글로벌',
  '콘텐츠',
  '이달의 도서',
  '설교 인사이트',
] as const

// 공개 범위 (레거시, 실제로는 시스템 코드 사용)
export const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체 공개' },
  { value: 'free', label: '무료 회원' },
  { value: 'paid', label: '유료 회원' },
  { value: 'purchased', label: '콘텐츠 구매자' },
] as const

// 발행 상태
export const PUBLISH_STATUS = {
  DRAFT: 'draft', // 임시저장
  PUBLISHED: 'published', // 공개
  PRIVATE: 'private', // 비공개
  SCHEDULED: 'scheduled', // 예약 발행
  DELETED: 'deleted', // 삭제됨
} as const

// 시스템 코드 구분값
export const SYS_CODE_GUBN = {
  CATEGORY: 'SYS26209B002', // 아티클 카테고리
  VISIBILITY: 'SYS26209B015', // 공개 범위
  STATUS: 'SYS26209B020', // 발행 상태
} as const

// 라우트 경로
export const ARTICLE_ROUTES = {
  LIST: '/admin/articles',
  NEW: '/admin/articles/new',
  EDIT: (id: number) => `/admin/articles/edit?id=${id}`,
  DETAIL: (id: number) => `/admin/articles/${id}`,
  PUBLIC_VIEW: (id: number) => `/articles/${id}`,
} as const

// React Query 키
export const ARTICLE_QUERY_KEYS = {
  all: ['articles'] as const,
  lists: () => [...ARTICLE_QUERY_KEYS.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...ARTICLE_QUERY_KEYS.lists(), params] as const,
  details: () => [...ARTICLE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...ARTICLE_QUERY_KEYS.details(), id] as const,
} as const

