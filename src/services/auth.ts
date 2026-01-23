import apiClient from '@/lib/axios'
import Cookies from 'js-cookie'

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

export interface LoginResult {
  access_token: string
  refresh_token: string
  expires_in: number
  user: UserInfo
}

export interface IndeAPIResponse<T> {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: T
  }
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: UserInfo
}

export interface TokenRefreshResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: UserInfo
}

export interface LogoutResult {
  message: string
}

export interface LogoutResponse {
  message: string
}

/**
 * 관리자 회원 로그인
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  console.log('API 호출 시작:', '/adminMember/login', data)
  
  try {
    const response = await apiClient.post<IndeAPIResponse<LoginResult>>('/adminMember/login', data)
    console.log('API 응답 원본:', response.data)
    
    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    if (!apiResponse) {
      console.error('IndeAPIResponse가 없습니다. 응답:', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }
    
    console.log('파싱된 응답:', apiResponse)
    
    // ErrorCode가 "00"이 아니면 에러
    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '로그인에 실패했습니다.')
    }
    
    // Result에서 데이터 추출
    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }
    
    console.log('로그인 성공, Result:', apiResponse.Result)
    return apiResponse.Result
  } catch (error: any) {
    console.error('로그인 API 오류:', error)
    console.error('오류 응답:', error.response?.data)
    throw error
  }
}

/**
 * 토큰 갱신
 */
export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  const response = await apiClient.post<IndeAPIResponse<LoginResult>>('/adminMember/tokenrefresh')
  
  // IndeAPIResponse 구조 파싱
  const apiResponse = response.data.IndeAPIResponse
  
  // ErrorCode가 "00"이 아니면 에러
  if (apiResponse.ErrorCode !== '00') {
    throw new Error(apiResponse.Message || '토큰 갱신에 실패했습니다.')
  }
  
  // Result에서 데이터 추출
  return apiResponse.Result
}

/**
 * 로그아웃
 * access_token은 Axios 인터셉터에서 자동으로 헤더에 추가됨
 */
export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await apiClient.post<IndeAPIResponse<LogoutResult>>('/adminMember/logout')
    
    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    // ErrorCode가 "00"이 아니면 에러
    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '로그아웃에 실패했습니다.')
    }
    
    // 쿠키 삭제
    Cookies.remove('accessToken')
    Cookies.remove('refreshToken')
    Cookies.remove('userInfo')
    
    // Result에서 데이터 추출
    return apiResponse.Result
  } catch (error: any) {
    // 에러가 발생해도 로컬 쿠키는 삭제
    Cookies.remove('accessToken')
    Cookies.remove('refreshToken')
    Cookies.remove('userInfo')
    
    // 에러 메시지 추출
    if (error.response?.data?.IndeAPIResponse?.Message) {
      throw new Error(error.response.data.IndeAPIResponse.Message)
    } else if (error.message) {
      throw error
    } else {
      throw new Error('로그아웃 중 오류가 발생했습니다.')
    }
  }
}

/**
 * 토큰 저장
 * CURSOR_RULES.md에 따라 쿠키에만 저장 (localStorage 사용 금지)
 */
export const saveTokens = (accessToken: string, refreshToken: string, userInfo?: UserInfo) => {
  // 쿠키 옵션 설정 (보안 강화)
  const cookieOptions = {
    expires: 1, // 1일
    secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 HTTPS 사용
    sameSite: 'strict' as const, // CSRF 공격 방지
    path: '/', // 모든 경로에서 접근 가능
  }
  
  Cookies.set('accessToken', accessToken, cookieOptions)
  Cookies.set('refreshToken', refreshToken, { ...cookieOptions, expires: 7 }) // 7일
  
  // 사용자 정보도 저장 (선택사항)
  if (userInfo) {
    Cookies.set('userInfo', JSON.stringify(userInfo), cookieOptions)
  }
}

/**
 * 사용자 정보 가져오기
 */
export const getUserInfo = (): UserInfo | null => {
  const userInfoStr = Cookies.get('userInfo')
  if (userInfoStr) {
    try {
      return JSON.parse(userInfoStr) as UserInfo
    } catch {
      return null
    }
  }
  return null
}

/**
 * 토큰 확인
 */
export const getAccessToken = (): string | undefined => {
  return Cookies.get('accessToken')
}

/**
 * 인증 상태 확인
 */
export const isAuthenticated = (): boolean => {
  return !!Cookies.get('accessToken')
}

