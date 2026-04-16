import axios, { AxiosError } from 'axios'
import Cookies from 'js-cookie'
import { ADMIN_USER_INFO_KEY } from '@/lib/adminAuthKeys'
import { getAdminAccessToken, setAdminAccessToken } from '@/lib/adminAccessMemory'
import { ADMIN_USER_INFO_COOKIE_EXPIRES_DAYS } from '@/constants/authCookies'

const TOKEN_REFRESH_PATH = '/adminMember/tokenrefresh'

function parseRefreshPayload(data: unknown): {
  access_token: string
  user?: Record<string, unknown>
} {
  let responseData = data as Record<string, unknown>
  if (responseData?.IndeAPIResponse && typeof responseData.IndeAPIResponse === 'object') {
    const apiResponse = responseData.IndeAPIResponse as {
      ErrorCode?: string
      Message?: string
      Result?: Record<string, unknown>
    }
    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '토큰 갱신에 실패했습니다.')
    }
    if (!apiResponse.Result) {
      throw new Error('토큰 갱신 응답 데이터가 없습니다.')
    }
    responseData = apiResponse.Result
  }

  const access_token = responseData.access_token as string | undefined
  const user = responseData.user as Record<string, unknown> | undefined
  if (!access_token) {
    throw new Error('토큰 갱신 응답에 access_token이 없습니다.')
  }
  return { access_token, user }
}

function axiosErrorMessage(error: unknown): string {
  const ax = error as AxiosError<{
    error?: string
    IndeAPIResponse?: { Message?: string }
  }>
  const d = ax.response?.data
  return (
    d?.IndeAPIResponse?.Message ||
    (typeof d === 'object' && d && 'error' in d && (d as { error?: string }).error) ||
    ax.message ||
    '토큰 갱신에 실패했습니다.'
  )
}

/**
 * 관리자 토큰 갱신 — 요청 1회만 수행(내부에서 같은 호출을 여러 번 재시도하지 않음).
 * refresh 는 HttpOnly 쿠키만 (빈 바디 {} + withCredentials).
 * 새 access 는 메모리에만 저장; user 는 표시용 쿠키 갱신(없으면 생략).
 *
 * 실패 시 `onAuthFailure` 가 넘어오면 1회 호출(예: 로그인 이동). 누적 재시도 카운터는 없음.
 */
export async function refreshAdminAccessToken(options?: {
  onAuthFailure?: () => void
}): Promise<string> {
  const onAuthFailure = options?.onAuthFailure

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  try {
    const currentAccessToken = getAdminAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (currentAccessToken) {
      headers.Authorization = `Bearer ${currentAccessToken}`
    }

    const response = await axios.post(`${baseURL}${TOKEN_REFRESH_PATH}`, {}, {
      headers,
      withCredentials: true,
      timeout: 60_000,
    })

    const { access_token, user } = parseRefreshPayload(response.data)

    setAdminAccessToken(access_token)

    const cookieOptions = {
      expires: ADMIN_USER_INFO_COOKIE_EXPIRES_DAYS,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    }
    if (user) {
      Cookies.set(ADMIN_USER_INFO_KEY, JSON.stringify(user), cookieOptions)
    }

    return access_token
  } catch (error: unknown) {
    const msg = axiosErrorMessage(error)
    onAuthFailure?.()
    throw new Error(msg)
  }
}

export const ADMIN_TOKEN_REFRESH_PATH = TOKEN_REFRESH_PATH
