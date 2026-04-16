/**
 * 관리자에서 공개 www 페이지를 새 탭으로 열 때 사용.
 * `NEXT_PUBLIC_WWW_ORIGIN` 예: `http://localhost:3001`, `https://www.inde.kr` (끝 슬래시 없음)
 */
export function getPublicWwwOrigin(): string {
  const env = process.env.NEXT_PUBLIC_WWW_ORIGIN?.trim()
  if (env) return env.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3001'
  return 'https://www.inde.kr'
}

/** www 아티클 상세 — `/article/detail?id=` */
export function publicArticleDetailUrl(articleId: number | string): string {
  const id = encodeURIComponent(String(articleId))
  return `${getPublicWwwOrigin()}/article/detail?id=${id}`
}
