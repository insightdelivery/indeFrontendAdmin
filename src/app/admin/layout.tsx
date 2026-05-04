'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { logout, getUserInfo } from '@/services/auth'
import { getAdminAccessToken } from '@/lib/adminAccessMemory'
import { refreshAdminAccessToken } from '@/lib/adminTokenRefresh'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  canShowAdminPath,
  canShowBoardNav,
  canShowSmsEmailNav,
  canShowSettingsNav,
} from '@/lib/adminMenuCodes'
import { AdminMenuCatalogProvider } from '@/contexts/AdminMenuCatalogContext'
import { 
  LayoutDashboard, 
  Users,
  UserCircle,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  Code,
  Shield,
  UserPlus,
  ChevronRight,
  FileText,
  Video,
  GraduationCap,
  MessageSquare,
  ClipboardList,
  HelpCircle,
  Mail,
  Send,
  History,
  Phone,
  Images,
  Globe,
  Newspaper,
  LayoutGrid,
} from 'lucide-react'

const SIDEBAR_MENU_ITEMS = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/articles', label: '아티클 관리', icon: FileText },
  { href: '/admin/video', label: '비디오 관리', icon: Video },
  { href: '/admin/seminar', label: '세미나 관리', icon: GraduationCap },
  { href: '/admin/curation', label: '특집(큐레이션) 관리', icon: LayoutGrid },
  { href: '/admin/contentAuthor', label: '작성자 관리', icon: UserCircle },
  { href: '/admin/display-events', label: '이벤트 베너 관리', icon: Images },
  { href: '/admin/homepage-docs', label: '홈페이지 관리', icon: Globe },
  { href: '/admin/users', label: '회원관리', icon: Users },
  { href: '/admin/orders', label: '결제관리', icon: ShoppingCart },
] as const

const SETTINGS_SUB_MENUS = [
  { href: '/admin/settings/code', label: '코드관리', icon: Code },
  { href: '/admin/settings/menu-permission', label: '메뉴권한', icon: Shield },
  { href: '/admin/settings/admin-register', label: '관리자 등록', icon: UserPlus },
] as const

const BOARD_SUB_MENUS = [
  { href: '/admin/board/notices', label: '공지사항', icon: ClipboardList },
  { href: '/admin/board/faqs', label: 'FAQ', icon: HelpCircle },
  { href: '/admin/board/inquiries', label: '1:1 문의', icon: Mail },
] as const

const SMS_EMAIL_SUB_MENUS = [
  { href: '/admin/messages/sms/send', label: '문자 / 카카오 전송', icon: Send, section: 'sms' },
  { href: '/admin/messages/sms/history', label: '문자 카카오 전송 내역', icon: History, section: 'sms' },
  { href: '/admin/messages/sms/sender-numbers', label: '문자 발신번호 관리', icon: Phone, section: 'sms' },
  { href: '/admin/messages/email/send', label: '이메일 전송', icon: Send, section: 'email' },
  { href: '/admin/messages/email/history', label: '이메일 전송 내역', icon: History, section: 'email' },
  { href: '/admin/messages/email/sender-emails', label: '발신이메일 관리', icon: Mail, section: 'email' },
  { href: '/admin/messages/newsletter', label: '뉴스레터 신청', icon: Newspaper, section: 'email' },
] as const

/**
 * 인증이 필요한 관리 화면은 모두 `/admin` 하위에 두는 것을 권장한다.
 * 무음 세션 복구(`refreshAdminAccessToken`)는 이 레이아웃에서만 수행되므로,
 * 향후 `/admin` 밖에 보호 경로를 두면 동일 복구 로직을 공통 컴포넌트로 추출하거나 middleware·가드를 맞춰야 한다.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [userInfo, setUserInfo] = useState(getUserInfo())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [smsEmailOpen, setSmsEmailOpen] = useState(false)

  /** 액세스 만료·리프레시만 남은 경우 무음 갱신 후 대시보드 유지 (규칙: access 없을 때만 refresh) */
  useEffect(() => {
    let cancelled = false

    const applyMeta = () => {
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
    }

    setMounted(true)

    if (getAdminAccessToken()) {
      setUserInfo(getUserInfo())
      setSessionReady(true)
      applyMeta()
      return () => {
        cancelled = true
      }
    }

    ;(async () => {
      try {
        await refreshAdminAccessToken()
        if (cancelled) return
        setUserInfo(getUserInfo())
        setSessionReady(true)
        applyMeta()
      } catch {
        if (!cancelled) router.push('/login')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogout = useCallback(async () => {
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
  }, [router, toast])

  // 경로에 따라 아코디언 열기 (설정/게시판). pathname 변경 시에만 실행
  useEffect(() => {
    if (pathname?.startsWith('/admin/settings')) setSettingsOpen(true)
  }, [pathname])
  useEffect(() => {
    if (pathname?.startsWith('/admin/board')) setBoardOpen(true)
  }, [pathname])
  useEffect(() => {
    if (pathname?.startsWith('/admin/messages')) setSmsEmailOpen(true)
  }, [pathname])

  /** early return보다 앞에 두어야 함 (Rules of Hooks) */
  const visibleMenuItems = useMemo(
    () => SIDEBAR_MENU_ITEMS.filter((item) => canShowAdminPath(userInfo, item.href)),
    [userInfo]
  )
  const visibleBoardSubMenus = useMemo(
    () => [...BOARD_SUB_MENUS].filter((item) => canShowAdminPath(userInfo, item.href)),
    [userInfo]
  )
  const visibleSettingsSubMenus = useMemo(
    () => [...SETTINGS_SUB_MENUS].filter((item) => canShowAdminPath(userInfo, item.href)),
    [userInfo]
  )
  const visibleSmsEmailSubMenus = useMemo(
    () => [...SMS_EMAIL_SUB_MENUS].filter((item) => canShowAdminPath(userInfo, item.href)),
    [userInfo]
  )
  const showBoardSection = canShowBoardNav(userInfo) && visibleBoardSubMenus.length > 0
  const showSettingsSection = canShowSettingsNav(userInfo) && visibleSettingsSubMenus.length > 0
  const showSmsEmailSection = canShowSmsEmailNav(userInfo) && visibleSmsEmailSubMenus.length > 0
  const visibleMainMenuItems = useMemo(
    () => visibleMenuItems.filter((item) => item.href !== '/admin/orders'),
    [visibleMenuItems]
  )
  const paymentMenuItem = useMemo(
    () => visibleMenuItems.find((item) => item.href === '/admin/orders'),
    [visibleMenuItems]
  )

  const userInitials =
    userInfo?.memberShipName?.trim().slice(0, 2) ||
    userInfo?.memberShipId?.slice(0, 2) ||
    '—'

  if (!mounted || !sessionReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/40">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">세션 확인 중...</p>
      </div>
    )
  }

  return (
    <AdminMenuCatalogProvider>
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* 사이드바 */}
      <aside
        className={cn(
          'flex flex-col overflow-hidden border-r border-border bg-background transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {/* 사이드바 헤더 */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <>
              <Link href="/admin" className="flex flex-col gap-0.5">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  InDe
                  <span className="ml-1 text-xs font-semibold text-neon-yellow">admin</span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="사이드바 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 사이드바 메뉴 */}
        {sidebarOpen && (
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <ul className="space-y-1">
              {visibleMainMenuItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname?.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}

              {/* 문자 이메일 메뉴 (하위 메뉴 포함) - 결제관리 위 고정 */}
              {showSmsEmailSection ? (
              <li>
                <button
                  type="button"
                  onClick={() => setSmsEmailOpen(!smsEmailOpen)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname?.startsWith('/admin/messages')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-90" />
                    <span>문자 이메일</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200',
                      smsEmailOpen && 'rotate-90'
                    )}
                  />
                </button>
                {smsEmailOpen && (
                  <ul className="ml-2 mt-1 space-y-0.5 border-l border-border pl-3">
                    <li className="px-3 pt-2 text-xs font-semibold text-muted-foreground">문자</li>
                    {visibleSmsEmailSubMenus
                      .filter((subItem) => subItem.section === 'sms')
                      .map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href
                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                isSubActive
                                  ? 'bg-primary/10 font-medium text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    <li className="px-3 pt-3 text-xs font-semibold text-muted-foreground">이메일</li>
                    {visibleSmsEmailSubMenus
                      .filter((subItem) => subItem.section === 'email')
                      .map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href
                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                isSubActive
                                  ? 'bg-primary/10 font-medium text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </li>
              ) : null}

              {/* 결제관리 (문자 이메일 아래) */}
              {paymentMenuItem ? (
                <li key={paymentMenuItem.href}>
                  <Link
                    href={paymentMenuItem.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === paymentMenuItem.href || pathname?.startsWith(paymentMenuItem.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <paymentMenuItem.icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span>{paymentMenuItem.label}</span>
                  </Link>
                </li>
              ) : null}

              {/* 게시판 관리 메뉴 (하위 메뉴 포함) */}
              {showBoardSection ? (
              <li>
                <button
                  type="button"
                  onClick={() => setBoardOpen(!boardOpen)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname?.startsWith('/admin/board')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-90" />
                    <span>게시판 관리</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200',
                      boardOpen && 'rotate-90'
                    )}
                  />
                </button>
                {boardOpen && (
                  <ul className="ml-2 mt-1 space-y-0.5 border-l border-border pl-3">
                    {visibleBoardSubMenus.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive =
                        pathname === subItem.href ||
                        (subItem.href !== '/admin/board/notices' &&
                          pathname?.startsWith(subItem.href))
                      return (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                              isSubActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
              ) : null}

              {/* 설정 메뉴 (하위 메뉴 포함) */}
              {showSettingsSection ? (
              <li>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname?.startsWith('/admin/settings')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 shrink-0 opacity-90" />
                    <span>설정</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200',
                      settingsOpen && 'rotate-90'
                    )}
                  />
                </button>

                {settingsOpen && (
                  <ul className="ml-2 mt-1 space-y-0.5 border-l border-border pl-3">
                    {visibleSettingsSubMenus.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = pathname === subItem.href
                      return (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                              isSubActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
              ) : null}
            </ul>
          </nav>
        )}

        {/* 사이드바 푸터 */}
        {sidebarOpen && userInfo && (
          <div className="shrink-0 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                aria-hidden
              >
                {userInitials}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {userInfo.memberShipName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{userInfo.memberShipId}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 영역 - min-h-0으로 flex 자식이 뷰포트를 넘지 않게 해 스크롤 1개만 유지 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!sidebarOpen ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="h-9 w-9 shrink-0"
                  type="button"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <span className="truncate text-sm font-medium text-foreground">
                  InDe Administrator
                </span>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            {userInfo && (
              <div className="hidden text-sm text-muted-foreground sm:block">
                <span className="font-medium text-foreground">{userInfo.memberShipName}</span>
                <span className="mx-1.5 text-border">|</span>
                <span>{userInfo.memberShipId}</span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-border bg-background hover:bg-muted"
            >
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </header>

        {/* 메인 콘텐츠 - 여기만 스크롤 */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
    </AdminMenuCatalogProvider>
  )
}
