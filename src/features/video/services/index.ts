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
 * 비디오 파일 업로드 (TUS 프로토콜 사용)
 * Resumable upload를 지원하여 대용량 파일 업로드 안정성 향상
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
  return new Promise((resolve, reject) => {
    try {
      // 파일 크기 검증 (2GB 제한)
      const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(
          `파일 크기가 2GB를 초과합니다. (현재: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`
        ))
        return
      }

      // tus-js-client 동적 import
      import('tus-js-client').then(({ Upload }) => {
        // API base URL
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        
        // 인증 토큰 가져오기
        const token = Cookies.get('accessToken')
        if (!token) {
          reject(new Error('인증 토큰이 없습니다. 다시 로그인해주세요.'))
          return
        }

        // 파일명 base64 인코딩 (TUS 메타데이터 형식)
        const filenameBase64 = btoa(encodeURIComponent(file.name))

        // TUS 업로드 생성
        console.log('[TUS Upload] 업로드 시작:', {
          endpoint: `${baseURL}/video/upload/tus/`,
          filename: file.name,
          size: file.size,
          token: token ? `${token.substring(0, 20)}...` : '없음',
        })
        
        // 토큰이 있는지 다시 확인
        const currentToken = Cookies.get('accessToken')
        if (!currentToken) {
          reject(new Error('인증 토큰이 없습니다. 다시 로그인해주세요.'))
          return
        }

        // 업로드 인스턴스를 외부에서 접근 가능하도록 변수 선언
        let uploadInstance: any = null
        let isRetrying = false // 재시도 중 플래그 (무한 루프 방지)

        const upload = new Upload(file, {
          endpoint: `${baseURL}/video/upload/tus/`,
          retryDelays: [0, 3000, 5000, 10000, 20000], // 재시도 지연 시간 (ms)
          metadata: {
            filename: filenameBase64,
            filetype: 'video/mp4',
          },
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
          chunkSize: 5 * 1024 * 1024, // 5MB 청크 크기
          removeFingerprintOnSuccess: false,
          onError: async (error: Error) => {
            console.error('[TUS Upload] 업로드 오류:', error)
            
            // 401 또는 403 에러인 경우 토큰 갱신 시도
            const errorMessage = error.message || ''
            const isAuthError = errorMessage.includes('401') || 
                              errorMessage.includes('Unauthorized') || 
                              errorMessage.includes('403') || 
                              errorMessage.includes('Forbidden')
            
            if (isAuthError && !isRetrying) {
              try {
                isRetrying = true
                console.log('[TUS Upload] 인증 오류 감지, 토큰 갱신 시도...')
                
                // axios를 통해 토큰 갱신 (인터셉터가 자동으로 처리)
                await apiClient.post('/adminMember/tokenrefresh', {})
                
                // 새 토큰 가져오기
                const newToken = Cookies.get('accessToken')
                if (newToken) {
                  console.log('[TUS Upload] 토큰 갱신 성공, 업로드 재시도...')
                  
                  // 업로드 헤더 업데이트 (새 토큰으로)
                  // tus-js-client는 headers를 동적으로 업데이트할 수 없으므로
                  // 업로드를 중단하고 새로 시작해야 함
                  if (uploadInstance) {
                    uploadInstance.abort()
                  }
                  
                  // 잠시 대기 후 새 토큰으로 업로드 재시작
                  setTimeout(() => {
                    isRetrying = false
                    // 새 업로드 인스턴스 생성
                    const retryUpload = new Upload(file, {
                      endpoint: `${baseURL}/video/upload/tus/`,
                      retryDelays: [0, 3000, 5000, 10000, 20000],
                      metadata: {
                        filename: filenameBase64,
                        filetype: 'video/mp4',
                      },
                      headers: {
                        'Authorization': `Bearer ${newToken}`,
                      },
                      chunkSize: 5 * 1024 * 1024,
                      removeFingerprintOnSuccess: false,
                      onError: (retryError: Error) => {
                        console.error('[TUS Upload] 재시도 후 오류:', retryError)
                        reject(new Error(`비디오 업로드 실패: ${retryError.message}`))
                      },
                      onProgress: (bytesUploaded: number, bytesTotal: number) => {
                        if (onProgress) {
                          const progress = (bytesUploaded / bytesTotal) * 100
                          onProgress(progress)
                        }
                      },
                      onSuccess: async () => {
                        try {
                          console.log('[TUS Upload] 업로드 완료, Cloudflare Stream으로 전송 중...')
                          
                          const uploadUrl = retryUpload.url
                          if (!uploadUrl) {
                            reject(new Error('업로드 URL을 찾을 수 없습니다.'))
                            return
                          }

                          const uploadIdMatch = uploadUrl.match(/\/upload\/tus\/([^\/]+)/)
                          if (!uploadIdMatch) {
                            reject(new Error('업로드 ID를 찾을 수 없습니다.'))
                            return
                          }
                          const uploadId = uploadIdMatch[1]

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
                          }>(`/video/upload/tus/${uploadId}/complete`)

                          const apiResponse = completeResponse.data.IndeAPIResponse

                          if (!apiResponse || apiResponse.ErrorCode !== '00') {
                            reject(new Error(apiResponse?.Message || 'Cloudflare Stream 업로드에 실패했습니다.'))
                            return
                          }

                          if (!apiResponse.Result) {
                            reject(new Error('응답 데이터가 없습니다.'))
                            return
                          }

                          const result = apiResponse.Result

                          if (onProgress) {
                            onProgress(100)
                          }

                          console.log('[TUS Upload] Cloudflare Stream 업로드 완료:', result.videoStreamId)

                          resolve({
                            videoStreamId: result.videoStreamId,
                            embedUrl: result.embedUrl,
                            thumbnailUrl: result.thumbnailUrl,
                            hlsUrl: result.hlsUrl,
                            dashUrl: result.dashUrl,
                            videoInfo: result.videoInfo || {},
                          })
                        } catch (error: any) {
                          console.error('[TUS Upload] 완료 처리 오류:', error)
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
                    })
                    
                    uploadInstance = retryUpload
                    retryUpload.start()
                  }, 500)
                  
                  return // 에러를 reject하지 않고 재시도
                } else {
                  isRetrying = false
                  reject(new Error('토큰 갱신 후에도 토큰을 찾을 수 없습니다. 다시 로그인해주세요.'))
                }
              } catch (refreshError: any) {
                isRetrying = false
                console.error('[TUS Upload] 토큰 갱신 실패:', refreshError)
                reject(new Error(`인증 오류: 토큰 갱신에 실패했습니다. ${refreshError.message}`))
              }
            } else {
              reject(new Error(`비디오 업로드 실패: ${error.message}`))
            }
          },
          onProgress: (bytesUploaded: number, bytesTotal: number) => {
            if (onProgress) {
              const progress = (bytesUploaded / bytesTotal) * 100
              console.log(`[TUS Upload] 진행률: ${progress.toFixed(2)}% (${bytesUploaded}/${bytesTotal} bytes)`)
              onProgress(progress)
            }
          },
          onSuccess: async () => {
            try {
              console.log('[TUS Upload] 업로드 완료, Cloudflare Stream으로 전송 중...')
              
              // 업로드 ID 추출 (Location 헤더에서)
              // uploadInstance가 설정되어 있으면 사용, 없으면 upload 사용
              const currentUpload = uploadInstance || upload
              const uploadUrl = currentUpload.url
              if (!uploadUrl) {
                reject(new Error('업로드 URL을 찾을 수 없습니다.'))
                return
              }

              // 업로드 ID 추출
              const uploadIdMatch = uploadUrl.match(/\/upload\/tus\/([^\/]+)/)
              if (!uploadIdMatch) {
                reject(new Error('업로드 ID를 찾을 수 없습니다.'))
                return
              }
              const uploadId = uploadIdMatch[1]

              // 업로드 완료 및 Cloudflare Stream 전송
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
              }>(`/video/upload/tus/${uploadId}/complete`)

              const apiResponse = completeResponse.data.IndeAPIResponse

              if (!apiResponse || apiResponse.ErrorCode !== '00') {
                reject(new Error(apiResponse?.Message || 'Cloudflare Stream 업로드에 실패했습니다.'))
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

              console.log('[TUS Upload] Cloudflare Stream 업로드 완료:', result.videoStreamId)

              resolve({
                videoStreamId: result.videoStreamId,
                embedUrl: result.embedUrl,
                thumbnailUrl: result.thumbnailUrl,
                hlsUrl: result.hlsUrl,
                dashUrl: result.dashUrl,
                videoInfo: result.videoInfo || {},
              })
            } catch (error: any) {
              console.error('[TUS Upload] 완료 처리 오류:', error)
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
            console.log(`[TUS Upload] 청크 완료: ${chunkSize} bytes, 총 ${bytesAccepted}/${bytesTotal} bytes`)
          },
        })

        // 업로드 인스턴스 저장
        uploadInstance = upload

        // 업로드 시작
        upload.start()
      }).catch((error) => {
        console.error('[TUS Upload] tus-js-client 로드 실패:', error)
        reject(new Error('TUS 업로드 클라이언트를 로드할 수 없습니다.'))
      })
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

