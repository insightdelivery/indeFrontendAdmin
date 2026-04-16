/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16+: localhost가 아닌 호스트로 접속 시 /_next/*·webpack-hmr 가 cross-origin 으로 차단되어
  // 빈 화면이 될 수 있음 — /etc/hosts 로 쓰는 로컬 도메인을 허용
  allowedDevOrigins: [
    'local.inde.kr',
    'adminlocal.inde.kr',
    'apilocal.inde.kr',
    'admin-apilocal.inde.kr',
  ],
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

