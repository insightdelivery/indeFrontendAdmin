// output: 'export' 모드에서 동적 라우트를 위해 필요
export function generateStaticParams() {
  return [{ id: '1' }]
}

import VideoDetailClient from './VideoDetailClient'

export default function VideoDetailPage() {
  return <VideoDetailClient />
}


