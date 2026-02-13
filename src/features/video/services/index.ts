/**
 * Video API 서비스 함수
 */
import apiClient from '@/lib/axios'
import Cookies from 'js-cookie'
import type {
  Video,
  VideoListParams,
  VideoListResponse,
  VideoResponse,
  VideoCreateRequest,
  VideoUpdateRequest,
} from '../types'

/**
 * 비디오/세미나 목록 조회
 */
export const getVideoList = async (params?: VideoListParams): Promise<{
  videos: Video[]
  total: number
  page: number
  pageSize: number
}> => {
  try {
    const response = await apiClient.get<VideoListResponse>('/video/list', { params })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 목록 조회에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '비디오/세미나 목록 조회에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 상세 조회
 */
export const getVideo = async (id: number): Promise<Video> => {
  try {
    const response = await apiClient.get<VideoResponse>(`/video/${id}`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 조회에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '비디오/세미나 조회에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 생성
 */
export const createVideo = async (data: VideoCreateRequest): Promise<Video> => {
  try {
    const response = await apiClient.post<VideoResponse>('/video/create', data)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 생성에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '비디오/세미나 생성에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 수정
 */
export const updateVideo = async (data: VideoUpdateRequest): Promise<Video> => {
  try {
    const response = await apiClient.put<VideoResponse>(`/video/${data.id}`, data)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 수정에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '비디오/세미나 수정에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 삭제 (소프트 삭제)
 */
export const deleteVideo = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/video/${id}`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '비디오/세미나 삭제에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 일괄 삭제
 */
export const deleteVideos = async (ids: number[]): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>('/video/batch-delete', {
      data: { ids }
    })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 일괄 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '비디오/세미나 일괄 삭제에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 상태 일괄 변경
 */
export const updateVideoStatus = async (ids: number[], status: string): Promise<void> => {
  try {
    const response = await apiClient.put<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>('/video/batch-status', {
      ids,
      status
    })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 상태 변경에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '비디오/세미나 상태 변경에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 복구
 */
export const restoreVideo = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.post<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/video/${id}/restore`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 복구에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '비디오/세미나 복구에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오 파일 업로드 (Cloudflare Stream)
 * TUS 프로토콜을 직접 구현하여 Cloudflare Stream direct upload URL에 업로드
 */
export const uploadVideoFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  videoStreamId: string
  embedUrl: string
  thumbnailUrl: string
  hlsUrl: string
  dashUrl: string
  videoInfo: any
}> => {
  try {
    // 파일 크기 검증 (2GB 제한)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `파일 크기가 2GB를 초과합니다. (현재: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`
      )
    }

    // 서버 사이드 업로드: 모든 파일을 백엔드를 통해 Cloudflare Stream에 업로드
    // apiClient를 사용하여 토큰 자동 갱신 기능 활용
    const formData = new FormData()
    formData.append('file', file)

    // apiClient를 사용하여 업로드 (토큰 자동 갱신 지원)
    // 큰 파일 업로드를 위해 타임아웃을 명시적으로 설정 (30분)
    const response = await apiClient.post<{
      IndeAPIResponse: {
        ErrorCode: string
        Message: string
        Result: {
          videoStreamId: string
          embedUrl: string
          thumbnailUrl: string
          hlsUrl: string
          dashUrl: string
          videoInfo?: any
        }
      }
    }>('/video/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // FormData 업로드를 위해 명시
      },
      timeout: 30 * 60 * 1000, // 30분 (2GB 파일 업로드 고려)
      maxContentLength: 2 * 1024 * 1024 * 1024, // 2GB
      maxBodyLength: 2 * 1024 * 1024 * 1024, // 2GB
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          // 클라이언트 -> 서버 업로드 진행률
          // 큰 파일의 경우 서버가 파일을 받는 데 시간이 걸리므로
          // 실제 진행률을 표시 (0-100%)
          const progress = Math.min(
            (progressEvent.loaded / progressEvent.total) * 100,
            100
          )
          console.log(`[Video Upload] 진행률: ${progress.toFixed(2)}% (${progressEvent.loaded}/${progressEvent.total} bytes)`)
          onProgress(progress)
        } else if (progressEvent.loaded && onProgress) {
          // total이 없는 경우 (스트리밍 업로드)
          // 최소한 업로드 중임을 표시
          console.log(`[Video Upload] 업로드 중: ${progressEvent.loaded} bytes 전송됨`)
          onProgress(1) // 최소한 1% 표시
        }
      },
    })

    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오 업로드에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    const result = apiResponse.Result

    // 진행률 100%로 설정
    if (onProgress) {
      onProgress(100)
    }

    return {
      videoStreamId: result.videoStreamId,
      embedUrl: result.embedUrl,
      thumbnailUrl: result.thumbnailUrl,
      hlsUrl: result.hlsUrl,
      dashUrl: result.dashUrl,
      videoInfo: result.videoInfo || {},
    }
  } catch (error: any) {
    let errorMessage = '비디오 업로드에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * Cloudflare Stream 비디오 정보 조회
 */
export const getVideoStreamInfo = async (videoStreamId: string): Promise<{
  videoStreamId: string
  embedUrl: string
  thumbnailUrl: string
  hlsUrl: string
  dashUrl: string
  videoInfo: any
}> => {
  try {
    const response = await apiClient.get<{
      IndeAPIResponse: {
        ErrorCode: string
        Message: string
        Result: {
          videoStreamId: string
          embedUrl: string
          thumbnailUrl: string
          hlsUrl: string
          dashUrl: string
          videoInfo: any
        }
      }
    }>(`/video/stream/${videoStreamId}/info`)

    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오 정보 조회에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '비디오 정보 조회에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 비디오/세미나 영구 삭제
 */
export const hardDeleteVideo = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/video/${id}/hard-delete`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '비디오/세미나 영구 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '비디오/세미나 영구 삭제에 실패했습니다.'

    if (error.response?.data?.IndeAPIResponse?.Message) {
      errorMessage = error.response.data.IndeAPIResponse.Message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

