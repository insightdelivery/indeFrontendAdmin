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
 * 토큰 갱신 함수
 */
const refreshAccessToken = async (): Promise<string> => {
  try {
    console.log(`[Token Refresh] 토큰 갱신 시도 (${refreshRetryCount + 1}/${MAX_REFRESH_RETRIES})`)
    
    // 토큰 갱신 API 호출 (인터셉터를 우회하여 호출)
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/adminMember/tokenrefresh`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Cookies.get('accessToken')}`,
        },
      }
    )

    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '토큰 갱신에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('토큰 갱신 응답 데이터가 없습니다.')
    }

    // 새 토큰 저장
    const newAccessToken = apiResponse.Result.access_token
    const newRefreshToken = apiResponse.Result.refresh_token
    
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
    if (apiResponse.Result.user) {
      Cookies.set('userInfo', JSON.stringify(apiResponse.Result.user), {
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
    
    if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
      // 최대 재시도 횟수 초과
      console.error('[Token Refresh] 최대 재시도 횟수 초과. 로그인 페이지로 이동합니다.')
      refreshRetryCount = 0
      
      // 쿠키 삭제
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
      Cookies.remove('userInfo')
      
      // 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      
      throw new Error('토큰 갱신에 실패했습니다. 다시 로그인해주세요.')
    }
    
    throw error
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
    console.log('[Token Refresh Interceptor] Response Interceptor 호출됨')
    console.log('[Token Refresh Interceptor] 에러 상태:', error.response?.status)
    console.log('[Token Refresh Interceptor] 에러 URL:', error.config?.url)
    console.log('[Token Refresh Interceptor] 에러 전체:', error)
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    console.log('[Token Refresh Interceptor] originalRequest 존재:', !!originalRequest)
    console.log('[Token Refresh Interceptor] originalRequest._retry:', originalRequest?._retry)

    // 401 Unauthorized 또는 403 Forbidden 발생 시 토큰 갱신 시도
    // 403도 토큰 만료로 인한 권한 오류일 수 있으므로 처리
    if ((error.response?.status === 401 || error.response?.status === 403) && originalRequest && !originalRequest._retry) {
      console.log(`[Token Refresh Interceptor] ✅ ${error.response?.status} 에러 감지 - URL: ${originalRequest.url}`)
      
      // 로그인 API는 토큰 갱신 시도하지 않음
      if (originalRequest.url?.includes('/adminMember/login')) {
        console.log('[Token Refresh Interceptor] 로그인 API는 토큰 갱신 시도하지 않음')
        return Promise.reject(error)
      }
      
      // 토큰 갱신 API 호출 자체가 401/403이면 재시도 카운터 증가
      if (originalRequest.url?.includes('/adminMember/tokenrefresh')) {
        refreshRetryCount++
        console.log(`[Token Refresh Interceptor] 토큰 갱신 API 실패 (${refreshRetryCount}/${MAX_REFRESH_RETRIES})`)
        
        if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
          console.error('[Token Refresh Interceptor] 최대 재시도 횟수 초과. 로그인 페이지로 이동합니다.')
          refreshRetryCount = 0
          
          // 쿠키 삭제
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          Cookies.remove('userInfo')
          
          // 로그인 페이지로 리다이렉트
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
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

      originalRequest._retry = true
      isRefreshing = true
      
      console.log(`[Token Refresh Interceptor] 토큰 갱신 시작 - 원래 요청 URL: ${originalRequest.url}`)

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
      } catch (refreshError) {
        // 토큰 갱신 실패
        console.error('[Token Refresh Interceptor] 토큰 갱신 실패:', refreshError)
        failedQueue.forEach(({ reject }) => {
          reject(refreshError)
        })
        failedQueue = []
        isRefreshing = false

        // refreshAccessToken에서 이미 카운터를 증가시키고, 최대 횟수 초과 시 로그인 페이지로 이동 처리됨
        // 여기서는 추가로 확인하여 확실히 처리
        if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
          console.error('[Token Refresh Interceptor] 최대 재시도 횟수 초과 확인. 로그인 페이지로 이동합니다.')
          refreshRetryCount = 0
          
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          Cookies.remove('userInfo')
          
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
        }
        
        return Promise.reject(refreshError)
      }
    }

    // 401/403이 아니거나 이미 재시도한 요청인 경우
    console.log(`[Token Refresh Interceptor] ${error.response?.status}이 아니거나 조건 불일치 - 에러 그대로 반환`)
    console.log('[Token Refresh Interceptor] 조건 체크:', {
      'status === 401 또는 403': error.response?.status === 401 || error.response?.status === 403,
      'originalRequest 존재': !!originalRequest,
      '_retry 플래그': originalRequest?._retry,
    })
    return Promise.reject(error)
  }
)

export default apiClient

