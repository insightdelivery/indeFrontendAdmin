/**
 * Article API 서비스 함수
 */
import apiClient from '@/lib/axios'
import type {
  Article,
  ArticleListParams,
  ArticleListResponse,
  ArticleResponse,
  ArticleCreateRequest,
  ArticleUpdateRequest,
} from '../types'

/**
 * 아티클 목록 조회
 */
export const getArticleList = async (params?: ArticleListParams): Promise<{
  articles: Article[]
  total: number
  page: number
  pageSize: number
}> => {
  try {
    const response = await apiClient.get<ArticleListResponse>('/article/list', { params })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 목록 조회에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '아티클 목록 조회에 실패했습니다.'

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
 * 아티클 상세 조회
 */
export const getArticle = async (id: number): Promise<Article> => {
  try {
    const response = await apiClient.get<ArticleResponse>(`/article/${id}`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 조회에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '아티클 조회에 실패했습니다.'

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
 * 아티클 생성
 */
export const createArticle = async (data: ArticleCreateRequest): Promise<Article> => {
  try {
    const response = await apiClient.post<ArticleResponse>('/article/create', data)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 생성에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '아티클 생성에 실패했습니다.'

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
 * 아티클 수정
 */
export const updateArticle = async (data: ArticleUpdateRequest): Promise<Article> => {
  try {
    const response = await apiClient.put<ArticleResponse>(`/article/${data.id}`, data)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 수정에 실패했습니다.')
    }

    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }

    return apiResponse.Result
  } catch (error: any) {
    let errorMessage = '아티클 수정에 실패했습니다.'

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
 * 아티클 삭제 (소프트 삭제)
 */
export const deleteArticle = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/article/${id}`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '아티클 삭제에 실패했습니다.'

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
 * 아티클 일괄 삭제
 */
export const deleteArticles = async (ids: number[]): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>('/article/batch-delete', {
      data: { ids }
    })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 일괄 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '아티클 일괄 삭제에 실패했습니다.'

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
 * 아티클 상태 일괄 변경
 */
export const updateArticleStatus = async (ids: number[], status: string): Promise<void> => {
  try {
    const response = await apiClient.put<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>('/article/batch-status', {
      ids,
      status
    })
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 상태 변경에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '아티클 상태 변경에 실패했습니다.'

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
 * 아티클 복구
 */
export const restoreArticle = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.post<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/article/${id}/restore`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 복구에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '아티클 복구에 실패했습니다.'

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
 * 아티클 영구 삭제
 */
export const hardDeleteArticle = async (id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { message: string } } }>(`/article/${id}/hard-delete`)
    const apiResponse = response.data.IndeAPIResponse

    if (!apiResponse || apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse?.Message || '아티클 영구 삭제에 실패했습니다.')
    }
  } catch (error: any) {
    let errorMessage = '아티클 영구 삭제에 실패했습니다.'

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
 * 엑셀 다운로드
 */
export const exportArticlesToExcel = async (params?: ArticleListParams): Promise<Blob> => {
  try {
    const response = await apiClient.get('/article/export', {
      params,
      responseType: 'blob'
    })
    return response.data
  } catch (error: any) {
    let errorMessage = '엑셀 다운로드에 실패했습니다.'

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

