/**
 * 백엔드 MenuCodes / sysCode와 동일 (adminUserPermissionsPlan)
 */
import type { UserInfo } from '@/services/auth'

export const MenuCodes = {
  DASHBOARD: 'SYS26330B007',
  ARTICLE: 'SYS26330B008',
  VIDEO: 'SYS26330B009',
  SEMINAR: 'SYS26330B010',
  NOTICE: 'SYS26330B018',
  FAQ: 'SYS26330B019',
  INQUIRY: 'SYS26330B020',
  CODE_MANAGE: 'SYS26330B021',
  MENU_PERMISSION: 'SYS26330B022',
  ADMIN_REGISTER: 'SYS26330B023',
  CONTENT_AUTHOR: 'SYS26330B024',
  DISPLAY_EVENTS: 'SYS26330B025',
  HOMEPAGE_DOC: 'SYS26330B026',
  PUBLIC_MEMBERS: 'SYS26330B027',
  /** 결제/주문 — 백엔드 MenuCodes.PAYMENT, DB sysCode 동일 sid */
  PAYMENT: 'SYS26330B028',
  /** 백엔드 menu_codes.FILES_COMMON 과 동일 */
  FILES_COMMON: 'SYS26330B029',
  SMS_EMAIL: 'SYS26401B001',
  SMS_KAKAO_SEND: 'SYS26401B002',
  SMS_KAKAO_HISTORY: 'SYS26401B003',
  SMS_SENDER_NUMBERS: 'SYS26401B004',
  EMAIL_SEND: 'SYS26401B005',
  EMAIL_HISTORY: 'SYS26401B006',
  /** 발신 이메일 관리 — adminUserPermissionsPlan §2.1 id 110 */
  EMAIL_SENDER_MANAGE: 'SYS26402B001',
} as const

/** 사이드바 경로 → menu_code (단일 메뉴) — 라벨은 AdminMenuCatalog(DB)에서 조회 */
export const MENU_CODE_BY_ADMIN_PATH: Record<string, string> = {
  '/admin': MenuCodes.DASHBOARD,
  '/admin/articles': MenuCodes.ARTICLE,
  '/admin/video': MenuCodes.VIDEO,
  '/admin/seminar': MenuCodes.SEMINAR,
  '/admin/contentAuthor': MenuCodes.CONTENT_AUTHOR,
  '/admin/display-events': MenuCodes.DISPLAY_EVENTS,
  '/admin/homepage-docs': MenuCodes.HOMEPAGE_DOC,
  '/admin/users': MenuCodes.PUBLIC_MEMBERS,
  '/admin/orders': MenuCodes.PAYMENT,
  '/admin/settings/code': MenuCodes.CODE_MANAGE,
  '/admin/settings/menu-permission': MenuCodes.MENU_PERMISSION,
  '/admin/settings/admin-register': MenuCodes.ADMIN_REGISTER,
  '/admin/board/notices': MenuCodes.NOTICE,
  '/admin/board/faqs': MenuCodes.FAQ,
  '/admin/board/inquiries': MenuCodes.INQUIRY,
  '/admin/messages': MenuCodes.SMS_EMAIL,
  '/admin/messages/sms/send': MenuCodes.SMS_KAKAO_SEND,
  '/admin/messages/sms/history': MenuCodes.SMS_KAKAO_HISTORY,
  '/admin/messages/sms/sender-numbers': MenuCodes.SMS_SENDER_NUMBERS,
  '/admin/messages/email/send': MenuCodes.EMAIL_SEND,
  '/admin/messages/email/history': MenuCodes.EMAIL_HISTORY,
  '/admin/messages/email/sender-emails': MenuCodes.EMAIL_SENDER_MANAGE,
}

export function canReadMenuCode(user: UserInfo | null, menuCode: string): boolean {
  if (!user) return false
  if (user.memberShipLevel === 1) return true
  const mp = user.menu_permissions
  // 레거시 쿠키(권한 필드 없음): 전체 표시 — 재로그인 후 세분화
  if (mp == null) return true
  if (mp.super_admin) return true
  const items = mp.items ?? []
  return items.some((i) => i.menu_code === menuCode && i.can_read)
}

/** 경로에 매핑된 코드가 없으면 true(하위 호환). */
export function canShowAdminPath(user: UserInfo | null, pathPrefix: string): boolean {
  const code = MENU_CODE_BY_ADMIN_PATH[pathPrefix]
  if (!code) return true
  return canReadMenuCode(user, code)
}

export function canShowBoardNav(user: UserInfo | null): boolean {
  return (
    canReadMenuCode(user, MenuCodes.NOTICE) ||
    canReadMenuCode(user, MenuCodes.FAQ) ||
    canReadMenuCode(user, MenuCodes.INQUIRY)
  )
}

export function canShowSettingsNav(user: UserInfo | null): boolean {
  return (
    canReadMenuCode(user, MenuCodes.CODE_MANAGE) ||
    canReadMenuCode(user, MenuCodes.MENU_PERMISSION) ||
    canReadMenuCode(user, MenuCodes.ADMIN_REGISTER)
  )
}

export function canShowSmsEmailNav(user: UserInfo | null): boolean {
  return (
    canReadMenuCode(user, MenuCodes.SMS_EMAIL) ||
    canReadMenuCode(user, MenuCodes.SMS_KAKAO_SEND) ||
    canReadMenuCode(user, MenuCodes.SMS_KAKAO_HISTORY) ||
    canReadMenuCode(user, MenuCodes.SMS_SENDER_NUMBERS) ||
    canReadMenuCode(user, MenuCodes.EMAIL_SEND) ||
    canReadMenuCode(user, MenuCodes.EMAIL_HISTORY) ||
    canReadMenuCode(user, MenuCodes.EMAIL_SENDER_MANAGE)
  )
}
