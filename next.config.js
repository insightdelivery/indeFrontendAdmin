/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 정적 export 설정
  output: 'export',
  // 이미지 최적화 비활성화 (정적 export에서는 필요)
  images: {
    unoptimized: true,
  },
  // 정적 export에서는 async headers()를 사용할 수 없음
  // 대신 HTML meta 태그로 처리 (layout.tsx에서 이미 설정됨)
}

module.exports = nextConfig

