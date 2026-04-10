import apiClient from '@/lib/axios'
import Cookies from 'js-cookie'
import { ADMIN_USER_INFO_COOKIE_EXPIRES_DAYS } from '@/constants/authCookies'
import { ADMIN_USER_INFO_KEY } from '@/lib/adminAuthKeys'
import { refreshAdminAccessToken } from '@/lib/adminTokenRefresh'
import { getAdminAccessToken, setAdminAccessToken } from '@/lib/adminAccessMemory'
import { clearClientAdminSession } from '@/lib/adminClientSession'

/**
 * 로그인 여부는 메모리 access token + HttpOnly refresh → `/adminMember/tokenrefresh` 만 신뢰한다.
 * `ADMIN_USER_INFO_KEY` 쿠키는 사이드바·헤더 표시용 캐시이며, 없거나 만료되어도 refresh 로 복구되면 된다.
 */

export interface LoginRequest {
  memberShipId: string
  password: string
}

/** 로그인 응답 menu_permissions — 백엔드 build_admin_user_payload */
export interface MenuPermissionsPayload {
  super_admin: boolean
  items: Array<{
    menu_code: string
    can_read: boolean
    can_write: boolean
    can_delete: boolean
  }>
}

export interface UserInfo {
  memberShipSid: string
  memberShipId: string
  memberShipName: string
  memberShipEmail: string
  memberShipPhone?: string
  memberShipLevel: number
  is_admin: boolean
  admin_role?: string
  menu_permissions?: MenuPermissionsPayload
  last_login?: string
  login_count?: number
}

/** 로그인 API Result — refresh 는 HttpOnly 쿠키만, JSON 에 없을 수 있음 */
export interface LoginResult {
  access_token: string
  expires_in: number
  user: UserInfo
  refresh_token?: string
}

export interface IndeAPIResponse<T> {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: T
  }
}

export type LoginResponse = LoginResult

export interface TokenRefreshResponse {
  access_token: string
  expires_in: number
  user: UserInfo
}

export interface LogoutResult {
  message: string
}

export interface LogoutResponse {
  message: string
}

const isDev = process.env.NODE_ENV === 'development'

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<IndeAPIResponse<LoginResult>>('/adminMember/login', data)

    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse) {
      if (isDev) console.error('[auth] IndeAPIResponse 없음', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }

    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '로그인에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: unknown) {
    const api = (error as { response?: { data?: { IndeAPIResponse?: { Message?: string } } } }).response?.data
      ?.IndeAPIResponse as { Message?: string } | undefined
    if (api?.Message) {
      throw new Error(api.Message)
    }
    if (isDev) console.error('[auth] login', error)
    throw error
  }
}

export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  await refreshAdminAccessToken()
  const access_token = getAdminAccessToken()
  if (!access_token) {
    throw new Error('토큰 갱신 후 access token이 없습니다.')
  }
  const user = getUserInfo()
  if (!user) {
    throw new Error('토큰 갱신 후 사용자 표시 정보가 없습니다. 다시 로그인해주세요.')
  }
  return {
    access_token,
    expires_in: 0,
    user,
  }
}

export { clearClientAdminSession } from '@/lib/adminClientSession'

/**
 * 로그인 직후: access → 메모리, userInfo → 표시용 쿠키. refresh 는 응답 Set-Cookie(HttpOnly).
 */
export function saveSessionAfterLogin(accessToken: string, userInfo?: UserInfo): void {
  setAdminAccessToken(accessToken)
  const cookieOptions = {
    expires: ADMIN_USER_INFO_COOKIE_EXPIRES_DAYS,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  }
  if (userInfo) {
    Cookies.set(ADMIN_USER_INFO_KEY, JSON.stringify(userInfo), cookieOptions)
  }
}

/** @deprecated saveSessionAfterLogin 사용 */
export const saveTokens = (accessToken: string, _refreshToken?: string, userInfo?: UserInfo) => {
  saveSessionAfterLogin(accessToken, userInfo)
}

export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await apiClient.post<IndeAPIResponse<LogoutResult>>('/adminMember/logout')

    const apiResponse = response.data.IndeAPIResponse

    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '로그아웃에 실패했습니다.')
    }

    clearClientAdminSession()

    return apiResponse.Result
  } catch (error: any) {
    clearClientAdminSession()

    if (error.response?.data?.IndeAPIResponse?.Message) {
      throw new Error(error.response.data.IndeAPIResponse.Message)
    } else if (error.message) {
      throw error
    } else {
      throw new Error('로그아웃 중 오류가 발생했습니다.')
    }
  }
}

/** UI·권한 표시용 캐시. 인증 여부는 `getAccessToken()` / refresh 로만 판단할 것. */
export const getUserInfo = (): UserInfo | null => {
  const userInfoStr = Cookies.get(ADMIN_USER_INFO_KEY)
  if (userInfoStr) {
    try {
      return JSON.parse(userInfoStr) as UserInfo
    } catch {
      return null
    }
  }
  return null
}

export const getAccessToken = (): string | undefined => {
  return getAdminAccessToken() ?? undefined
}

export const isAuthenticated = (): boolean => {
  return !!getAdminAccessToken()
}
