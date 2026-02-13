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
 * 비디오 파일 업로드 (Cloudflare Stream TUS Direct Upload)
 * 브라우저가 Cloudflare로 직접 TUS 업로드하여 413 에러를 방지합니다.
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
  return new Promise(async (resolve, reject) => {
    try {
      // 파일 크기 검증 (2GB 제한)
      const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(
          `파일 크기가 2GB를 초과합니다. (현재: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`
        ))
        return
      }

      console.log('[Cloudflare TUS] 업로드 시작:', {
        filename: file.name,
        size: file.size,
      })

      // 1. Django에서 TUS 업로드 세션 생성
      const sessionResponse = await apiClient.post<{
        IndeAPIResponse: {
          ErrorCode: string
          Message: string
          Result: {
            uid: string
            uploadUrl: string
          }
        }
      }>('/video/cloudflare/tus/create', {
        filename: file.name,
        filesize: file.size,
        contentType: 'video/mp4',
      })

      const sessionApiResponse = sessionResponse.data.IndeAPIResponse

      if (!sessionApiResponse || sessionApiResponse.ErrorCode !== '00') {
        reject(new Error(sessionApiResponse?.Message || 'TUS 업로드 세션 생성에 실패했습니다.'))
        return
      }

      if (!sessionApiResponse.Result) {
        reject(new Error('세션 생성 응답 데이터가 없습니다.'))
        return
      }

      const { uid, uploadUrl } = sessionApiResponse.Result

      console.log('[Cloudflare TUS] 세션 생성 성공:', {
        uid,
        uploadUrl: uploadUrl.substring(0, 50) + '...',
      })

      // 2. tus-js-client로 Cloudflare에 직접 업로드
      const { Upload } = await import('tus-js-client')

      // 업로드 인스턴스를 외부에서 접근 가능하도록 변수 선언
      let uploadInstance: any = null
      let isRetrying = false // 재시도 중 플래그 (무한 루프 방지)

      const upload = new Upload(file, {
        endpoint: uploadUrl, // Cloudflare TUS 업로드 URL (직접 연결)
        retryDelays: [0, 1000, 3000, 5000, 10000], // 재시도 지연 시간 (ms)
        chunkSize: 8 * 1024 * 1024, // 8MB 청크 크기 (256KiB 배수)
        removeFingerprintOnSuccess: false,
        // Cloudflare TUS는 인증이 필요 없음 (세션 생성 시 이미 인증됨)
        // headers는 필요 없음
        onError: (error: Error) => {
          console.error('[Cloudflare TUS] 업로드 오류:', error)
          reject(new Error(`비디오 업로드 실패: ${error.message}`))
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          if (onProgress) {
            const progress = (bytesUploaded / bytesTotal) * 100
            console.log(`[Cloudflare TUS] 진행률: ${progress.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`)
            onProgress(progress)
          }
        },
        onSuccess: async () => {
          try {
            console.log('[Cloudflare TUS] 업로드 완료, Django에 완료 알림 전송 중...')
            
            // 3. Django에 업로드 완료 알림 (서버는 파일을 업로드하지 않고 DB 저장만)
            const completeResponse = await apiClient.post<{
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
            }>('/video/cloudflare/tus/complete', {
              uid: uid,
              filename: file.name,
              filesize: file.size,
            })

            const apiResponse = completeResponse.data.IndeAPIResponse

            if (!apiResponse || apiResponse.ErrorCode !== '00') {
              reject(new Error(apiResponse?.Message || '비디오 업로드 완료 처리에 실패했습니다.'))
              return
            }

            if (!apiResponse.Result) {
              reject(new Error('응답 데이터가 없습니다.'))
              return
            }

            const result = apiResponse.Result

            // 진행률 100%로 설정
            if (onProgress) {
              onProgress(100)
            }

            console.log('[Cloudflare TUS] 업로드 완료 처리 성공:', result.videoStreamId)

            resolve({
              videoStreamId: result.videoStreamId,
              embedUrl: result.embedUrl,
              thumbnailUrl: result.thumbnailUrl,
              hlsUrl: result.hlsUrl,
              dashUrl: result.dashUrl,
              videoInfo: result.videoInfo || {},
            })
          } catch (error: any) {
            console.error('[Cloudflare TUS] 완료 처리 오류:', error)
            let errorMessage = '비디오 업로드 완료 처리에 실패했습니다.'

            if (error.response?.data?.IndeAPIResponse?.Message) {
              errorMessage = error.response.data.IndeAPIResponse.Message
            } else if (error.response?.data?.error) {
              errorMessage = error.response.data.error
            } else if (error.message) {
              errorMessage = error.message
            }

            reject(new Error(errorMessage))
          }
        },
        onChunkComplete: (chunkSize: number, bytesAccepted: number, bytesTotal: number) => {
          console.log(`[Cloudflare TUS] 청크 완료: ${chunkSize} bytes, 총 ${bytesAccepted}/${bytesTotal} bytes`)
        },
      })

      // 업로드 인스턴스 저장
      uploadInstance = upload

      // 업로드 시작
      upload.start()
    } catch (error: any) {
      console.error('[TUS Upload] 초기화 오류:', error)
      reject(new Error(`비디오 업로드 초기화 실패: ${error.message}`))
    }
  })
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

