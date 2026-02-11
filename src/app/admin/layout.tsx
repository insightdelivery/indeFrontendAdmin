'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { logout, isAuthenticated, getUserInfo } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  X,
  Code,
  Shield,
  UserPlus,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [userInfo, setUserInfo] = useState(getUserInfo())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/login')
    } else {
      setUserInfo(getUserInfo())
    }
    
    // 검색 로봇 차단 메타 태그 추가
    const metaRobots = document.createElement('meta')
    metaRobots.name = 'robots'
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex'
    if (!document.querySelector('meta[name="robots"]')) {
      document.head.appendChild(metaRobots)
    }
    
    const metaGooglebot = document.createElement('meta')
    metaGooglebot.name = 'googlebot'
    metaGooglebot.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex'
    if (!document.querySelector('meta[name="googlebot"]')) {
      document.head.appendChild(metaGooglebot)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      const response = await logout()
      toast({
        title: '로그아웃 완료',
        description: response.message || '로그아웃되었습니다.',
        duration: 3000, // 3초
      })
      router.push('/login')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '로그아웃 중 오류가 발생했습니다.',
        variant: 'destructive',
        duration: 3000, // 3초
      })
      // 에러가 발생해도 로그인 페이지로 이동 (쿠키는 이미 삭제됨)
      router.push('/login')
    }
  }

  // 메뉴 항목 정의
  const menuItems = [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/admin/articles', label: '아티클 관리', icon: FileText },
    { href: '/admin/users', label: '사용자 관리', icon: Users },
    { href: '/admin/orders', label: '주문 관리', icon: ShoppingCart },
  ]

  // 설정 하위 메뉴 정의
  const settingsSubMenus = [
    { href: '/admin/settings/code', label: '코드관리', icon: Code },
    { href: '/admin/settings/menu-permission', label: '메뉴권한', icon: Shield },
    { href: '/admin/settings/admin-register', label: '관리자 등록', icon: UserPlus },
  ]

  // 설정 메뉴가 열려야 하는지 확인 (현재 경로가 설정 하위 메뉴인 경우)
  useEffect(() => {
    if (pathname?.startsWith('/admin/settings')) {
      setSettingsOpen(true)
    }
  }, [pathname])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 사이드바 */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-gray-100 border-r border-gray-300 flex flex-col overflow-hidden`}
      >
        {/* 사이드바 헤더 */}
        <div className="h-16 border-b border-gray-300 flex items-center justify-between px-4">
          {sidebarOpen && (
            <>
              <h1 className="text-xl font-bold">
                <span className="text-black">INDE</span>
                <span className="text-brand-orange text-xs font-semibold ml-1">admin</span>
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 사이드바 메뉴 */}
        {sidebarOpen && (
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-neon-yellow text-black font-semibold'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
              
              {/* 설정 메뉴 (하위 메뉴 포함) */}
              <li>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname?.startsWith('/admin/settings')
                      ? 'bg-neon-yellow text-black font-semibold'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <span>설정</span>
                  </div>
                  {settingsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {/* 설정 하위 메뉴 */}
                {settingsOpen && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {settingsSubMenus.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = pathname === subItem.href
                      return (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                              isSubActive
                                ? 'bg-neon-yellow text-black font-semibold'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <SubIcon className="h-4 w-4" />
                            <span className="text-sm">{subItem.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        )}

        {/* 사이드바 푸터 */}
        {sidebarOpen && userInfo && (
          <div className="border-t border-gray-300 p-4">
            <div className="text-sm text-gray-600 mb-2">
              <div className="font-medium">{userInfo.memberShipName}</div>
              <div className="text-xs text-gray-400">{userInfo.memberShipId}</div>
            </div>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="h-16 border-b bg-white shadow-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <span className="text-sm text-gray-600">관리자 대시보드</span>
          </div>
          <div className="flex items-center gap-4">
            {userInfo && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{userInfo.memberShipName}</span>
                <span className="mx-2 text-gray-400">({userInfo.memberShipId})</span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-gray-300 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="h-full p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
