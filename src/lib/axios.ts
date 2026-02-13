import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // 필요시 true로 변경
})

// 토큰 갱신 중 플래그 (무한 루프 방지)
let isRefreshing = false
// 갱신 대기 중인 요청들
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

// 토큰 갱신 재시도 카운터
let refreshRetryCount = 0
const MAX_REFRESH_RETRIES = 3

/**
 * 로그인 페이지로 리다이렉트하는 헬퍼 함수
 */
const redirectToLogin = () => {
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    // 쿠키 삭제
    Cookies.remove('accessToken')
    Cookies.remove('refreshToken')
    Cookies.remove('userInfo')
    
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login'
  }
}

/**
 * 토큰 갱신 함수
 * 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.
 * 최대 3번까지 재시도하며, 실패 시 로그인 페이지로 이동합니다.
 */
const refreshAccessToken = async (): Promise<string> => {
  const currentRetry = refreshRetryCount + 1
  
  try {
    console.log(`[Token Refresh] 토큰 갱신 시도 (${currentRetry}/${MAX_REFRESH_RETRIES})`)
    
    // 현재 액세스 토큰 가져오기 (만료된 토큰도 허용)
    const currentAccessToken = Cookies.get('accessToken')
    if (!currentAccessToken) {
      throw new Error('액세스 토큰이 없습니다.')
    }
    
    // 토큰 갱신 API 호출 (인터셉터를 우회하여 호출)
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await axios.post(
      `${baseURL}/adminMember/tokenrefresh`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentAccessToken}`,
        },
      }
    )

    // 응답 데이터 파싱 (IndeAPIResponse 형식 또는 직접 응답 형식 모두 지원)
    let responseData = response.data
    
    // IndeAPIResponse 형식인지 확인
    if (responseData.IndeAPIResponse) {
      const apiResponse = responseData.IndeAPIResponse
      
      if (!apiResponse || apiResponse.ErrorCode !== '00') {
        throw new Error(apiResponse?.Message || '토큰 갱신에 실패했습니다.')
      }

      if (!apiResponse.Result) {
        throw new Error('토큰 갱신 응답 데이터가 없습니다.')
      }

      responseData = apiResponse.Result
    }

    // 새 토큰 저장
    const newAccessToken = responseData.access_token
    const newRefreshToken = responseData.refresh_token
    
    if (!newAccessToken || !newRefreshToken) {
      throw new Error('토큰 갱신 응답에 토큰이 없습니다.')
    }
    
    Cookies.set('accessToken', newAccessToken, {
      expires: 1,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
    
    Cookies.set('refreshToken', newRefreshToken, {
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    // 사용자 정보 업데이트
    if (responseData.user) {
      Cookies.set('userInfo', JSON.stringify(responseData.user), {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })
    }

    // 재시도 카운터 리셋
    refreshRetryCount = 0
    
    console.log('[Token Refresh] 토큰 갱신 성공')
    return newAccessToken
  } catch (error: any) {
    refreshRetryCount++
    console.error(`[Token Refresh] 토큰 갱신 실패 (${refreshRetryCount}/${MAX_REFRESH_RETRIES}):`, error)
    
    // 에러 응답에서 메시지 추출
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.IndeAPIResponse?.Message || 
                        error.message || 
                        '토큰 갱신에 실패했습니다.'
    
    if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
      // 최대 재시도 횟수 초과
      console.error(`[Token Refresh] 최대 재시도 횟수 초과 (${MAX_REFRESH_RETRIES}회). 로그인 페이지로 이동합니다.`)
      refreshRetryCount = 0
      
      // 로그인 페이지로 리다이렉트
      redirectToLogin()
      
      throw new Error('토큰 갱신에 실패했습니다. 다시 로그인해주세요.')
    }
    
    // 재시도 가능한 경우 에러를 다시 throw
    throw new Error(errorMessage)
  }
}

// Request Interceptor: 토큰 자동 첨부
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('accessToken')
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: 에러 전역 처리 및 토큰 자동 갱신
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 성공 응답 시 재시도 카운터 리셋
    refreshRetryCount = 0
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const errorStatus = error.response?.status
    const requestUrl = originalRequest?.url

    // 로그인 API는 토큰 갱신 시도하지 않음
    if (requestUrl?.includes('/adminMember/login')) {
      return Promise.reject(error)
    }

    // 401 Unauthorized 또는 403 Forbidden 발생 시 토큰 갱신 시도
    // 403도 토큰 만료로 인한 권한 오류일 수 있으므로 처리
    if ((errorStatus === 401 || errorStatus === 403) && originalRequest && !originalRequest._retry) {
      // 토큰 갱신 API 호출 자체가 401/403이면 재시도 처리
      if (requestUrl?.includes('/adminMember/tokenrefresh')) {
        // refreshAccessToken 함수 내부에서 이미 재시도 카운터를 증가시키므로
        // 여기서는 최대 횟수 초과 여부만 확인
        if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
          console.error('[Token Refresh Interceptor] 최대 재시도 횟수 초과. 로그인 페이지로 이동합니다.')
          redirectToLogin()
        }
        return Promise.reject(error)
      }

      // 이미 토큰 갱신 중이면 대기
      if (isRefreshing) {
        console.log('[Token Refresh Interceptor] 이미 토큰 갱신 중, 요청 대기열에 추가')
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      // 토큰 갱신 시작
      originalRequest._retry = true
      isRefreshing = true
      
      console.log(`[Token Refresh Interceptor] ${errorStatus} 에러 감지 - 토큰 갱신 시작: ${requestUrl}`)

      try {
        const newAccessToken = await refreshAccessToken()
        console.log('[Token Refresh Interceptor] 토큰 갱신 완료, 원래 요청 재시도')

        // 대기 중인 요청들 처리
        failedQueue.forEach(({ resolve }) => {
          resolve(newAccessToken)
        })
        failedQueue = []

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        
        isRefreshing = false
        return apiClient(originalRequest)
      } catch (refreshError: any) {
        // 토큰 갱신 실패
        console.error('[Token Refresh Interceptor] 토큰 갱신 실패:', refreshError)
        
        // 대기 중인 요청들 모두 실패 처리
        failedQueue.forEach(({ reject }) => {
          reject(refreshError)
        })
        failedQueue = []
        isRefreshing = false

        // refreshAccessToken 함수 내부에서 이미 재시도 카운터를 증가시키고
        // 최대 횟수 초과 시 로그인 페이지로 이동 처리됨
        // 여기서는 추가로 확인하여 확실히 처리
        if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
          console.error('[Token Refresh Interceptor] 최대 재시도 횟수 초과 확인. 로그인 페이지로 이동합니다.')
          redirectToLogin()
        }
        
        return Promise.reject(refreshError)
      }
    }

    // 401/403이 아니거나 이미 재시도한 요청인 경우
    return Promise.reject(error)
  }
)

export default apiClient

