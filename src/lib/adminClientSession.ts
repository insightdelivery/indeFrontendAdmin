import Cookies from 'js-cookie'
import {
  ADMIN_ACCESS_TOKEN_KEY,
  ADMIN_REFRESH_TOKEN_KEY,
  ADMIN_USER_INFO_KEY,
} from '@/lib/adminAuthKeys'
import { clearAdminAccessToken } from '@/lib/adminAccessMemory'

/** 메모리 access·표시용·구버전 JS 쿠키 정리. HttpOnly refresh 는 서버가 삭제 */
export function clearClientAdminSession(): void {
  clearAdminAccessToken()
  Cookies.remove(ADMIN_ACCESS_TOKEN_KEY)
  Cookies.remove(ADMIN_REFRESH_TOKEN_KEY)
  Cookies.remove(ADMIN_USER_INFO_KEY)
}
