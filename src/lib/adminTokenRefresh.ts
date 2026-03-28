import axios, { AxiosError } from 'axios'
import Cookies from 'js-cookie'
import { ADMIN_USER_INFO_KEY } from '@/lib/adminAuthKeys'
import { setAdminAccessToken } from '@/lib/adminAccessMemory'

const TOKEN_REFRESH_PATH = '/adminMember/tokenrefresh'

let refreshRetryCount = 0
const DEFAULT_MAX_RETRIES = 3

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
 * 관리자 토큰 갱신. refresh 는 HttpOnly 쿠키만 (빈 바디 {} + withCredentials).
 * 새 access 는 메모리에만 저장; user 는 표시용 쿠키 갱신.
 */
export async function refreshAdminAccessToken(options?: {
  maxRetries?: number
  onAuthFailure?: () => void
}): Promise<string> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
  const onAuthFailure = options?.onAuthFailure

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  try {
    const response = await axios.post(`${baseURL}${TOKEN_REFRESH_PATH}`, {}, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      timeout: 60_000,
    })

    const { access_token, user } = parseRefreshPayload(response.data)

    setAdminAccessToken(access_token)

    const cookieOptions = {
      expires: 1,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    }
    if (user) {
      Cookies.set(ADMIN_USER_INFO_KEY, JSON.stringify(user), cookieOptions)
    }

    refreshRetryCount = 0
    return access_token
  } catch (error: unknown) {
    refreshRetryCount++
    const msg = axiosErrorMessage(error)

    if (refreshRetryCount >= maxRetries) {
      refreshRetryCount = 0
      onAuthFailure?.()
      throw new Error(
        maxRetries >= DEFAULT_MAX_RETRIES
          ? '토큰 갱신에 실패했습니다. 다시 로그인해주세요.'
          : msg
      )
    }
    throw new Error(msg)
  }
}

export const ADMIN_TOKEN_REFRESH_PATH = TOKEN_REFRESH_PATH
