// 주의: 정적 export(output: 'export') 모드에서는 middleware가 작동하지 않습니다.
// 인증 체크는 클라이언트 사이드에서 처리됩니다 (app/admin/layout.tsx 참조).
// 이 파일은 정적 export 빌드 시 무시되지만, 개발 모드나 향후 SSR 전환 시를 위해 유지합니다.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 로그인 페이지는 인증 체크 불필요
  if (pathname === '/login') {
    return NextResponse.next()
  }
  
  // /admin 하위 경로는 인증 필요
  if (pathname.startsWith('/admin')) {
    const accessToken = request.cookies.get('accessToken')
    
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

