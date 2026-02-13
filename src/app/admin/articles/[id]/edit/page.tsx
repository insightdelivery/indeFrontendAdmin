// output: 'export' 모드에서 동적 라우트를 위해 필요
export function generateStaticParams() {
  // 빌드 시점에 모든 아티클 ID를 알 수 없으므로,
  // 더미 경로를 반환하여 경로 구조를 생성
  // 실제 라우팅은 클라이언트에서 동적으로 처리됨
  return [{ id: '1' }]
}

import ArticleEditClient from './ArticleEditClient'

export default function ArticleEditPage() {
  return <ArticleEditClient />
}
