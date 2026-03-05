import type { Metadata } from 'next'

// 탭 제목·설명은 루트 src/app/layout.tsx 의 metadata 에서만 관리
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}





