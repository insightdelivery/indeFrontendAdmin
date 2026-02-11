// output: 'export' 모드에서 동적 라우트를 위해 필요
export function generateStaticParams() {
  // 빈 배열을 반환하여 모든 동적 경로를 허용
  return [{ id: '1' }]
}

import ArticleViewClient from './ArticleViewClient'

export default function ArticleViewPage() {
  return <ArticleViewClient />
}

