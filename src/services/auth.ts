import apiClient from '@/lib/axios'
import Cookies from 'js-cookie'
import { ADMIN_USER_INFO_KEY } from '@/lib/adminAuthKeys'
import { refreshAdminAccessToken } from '@/lib/adminTokenRefresh'
import { getAdminAccessToken, setAdminAccessToken } from '@/lib/adminAccessMemory'
import { clearClientAdminSession } from '@/lib/adminClientSession'

export interface LoginRequest {
  memberShipId: string
  password: string
}

export interface UserInfo {
  memberShipSid: string
  memberShipId: string
  memberShipName: string
  memberShipEmail: string
  memberShipPhone?: string
  memberShipLevel: number
  is_admin: boolean
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

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  console.log('API 호출 시작:', '/adminMember/login', data)

  try {
    const response = await apiClient.post<IndeAPIResponse<LoginResult>>('/adminMember/login', data)
    console.log('API 응답 원본:', response.data)

    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse) {
      console.error('IndeAPIResponse가 없습니다. 응답:', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }

    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '로그인에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    console.error('로그인 API 오류:', error)
    console.error('오류 응답:', error.response?.data)
    throw error
  }
}

export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  await refreshAdminAccessToken({ maxRetries: 3 })
  const access_token = getAdminAccessToken()
  const user = getUserInfo()
  if (!access_token || !user) {
    throw new Error('토큰 갱신 후 세션 정보가 없습니다.')
  }
  return {
    access_token,
    expires_in: 0,
    user,
  }
}

export { clearClientAdminSession } from '@/lib/adminClientSession'

/**
 * 로그인 직후: access → 메모리, userInfo → 쿠키. refresh 는 응답 Set-Cookie(HttpOnly).
 */
export function saveSessionAfterLogin(accessToken: string, userInfo?: UserInfo): void {
  setAdminAccessToken(accessToken)
  const cookieOptions = {
    expires: 1,
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
