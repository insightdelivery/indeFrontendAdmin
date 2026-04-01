/** wwwDocEtc.md §2.3 — 백엔드·admin·www 동일 목록 */
export const HOMEPAGE_DOC_TYPES_ORDERED = [
  'company_intro',
  'terms_of_service',
  'privacy_policy',
  'article_copyright',
  'video_copyright',
  'seminar_copyright',
  'recommended_search',
  'external_links',
] as const

export type HomepageDocType = (typeof HOMEPAGE_DOC_TYPES_ORDERED)[number]
