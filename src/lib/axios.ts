import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { refreshAdminAccessToken, ADMIN_TOKEN_REFRESH_PATH } from '@/lib/adminTokenRefresh'
import { getAdminAccessToken } from '@/lib/adminAccessMemory'
import { clearClientAdminSession } from '@/lib/adminClientSession'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30 * 60 * 1000,
  maxContentLength: 2 * 1024 * 1024 * 1024,
  maxBodyLength: 2 * 1024 * 1024 * 1024,
})

const MAX_REFRESH_RETRIES = 3

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (error?: unknown) => void
}> = []

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    clearClientAdminSession()
    window.location.href = '/login'
  }
}

const tokenRefreshPathSegment = ADMIN_TOKEN_REFRESH_PATH.replace(/^\//, '')

const isTokenRefreshRequest = (url: string | undefined) =>
  !!url && url.includes(tokenRefreshPathSegment)

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAdminAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const errorStatus = error.response?.status
    const requestUrl = originalRequest?.url

    if (requestUrl?.includes('/adminMember/login')) {
      return Promise.reject(error)
    }

    // 403 Forbidden(권한 없음)은 토큰 갱신으로 해결되지 않음 — 재시도하지 않음
    if (errorStatus === 401 && originalRequest && !originalRequest._retry) {
      if (isTokenRefreshRequest(requestUrl)) {
        redirectToLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token as string}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newAccessToken = await refreshAdminAccessToken({
          maxRetries: MAX_REFRESH_RETRIES,
          onAuthFailure: redirectToLogin,
        })
        failedQueue.forEach(({ resolve }) => resolve(newAccessToken))
        failedQueue = []
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        isRefreshing = false
        return apiClient(originalRequest)
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError))
        failedQueue = []
        isRefreshing = false
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
