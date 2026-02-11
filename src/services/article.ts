import apiClient from '@/lib/axios'

// 아티클 카테고리
export const ARTICLE_CATEGORIES = [
  '전체',
  '서적',
  '브랜딩',
  '공간',
  '고전',
  '취미/일상',
  '사회',
  '글로벌',
  '콘텐츠',
  '이달의 도서',
  '설교 인사이트',
] as const

// 공개 범위
export const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체 공개' },
  { value: 'free', label: '무료 회원' },
  { value: 'paid', label: '유료 회원' },
  { value: 'purchased', label: '콘텐츠 구매자' },
] as const

// 발행 상태
export const PUBLISH_STATUS = {
  DRAFT: 'draft', // 임시저장
  PUBLISHED: 'published', // 공개
  PRIVATE: 'private', // 비공개
  SCHEDULED: 'scheduled', // 예약 발행
  DELETED: 'deleted', // 삭제됨
} as const

export interface Article {
  id: number
  title: string
  subtitle?: string
  content: string
  thumbnail?: string
  category: string
  author: string
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased'
  status: 'draft' | 'published' | 'private' | 'scheduled' | 'deleted'
  isEditorPick: boolean
  viewCount: number
  rating?: number
  commentCount: number
  highlightCount: number
  questionCount: number
  tags?: string[]
  questions?: string[]
  previewLength?: number
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: string
}

export interface ArticleListParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  category?: string
  visibility?: string
  status?: string
  search?: string
}

export interface ArticleListResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      articles: Article[]
      total: number
      page: number
      pageSize: number
    }
  }
}

export interface ArticleResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: Article
  }
}

export interface ArticleCreateRequest {
  title: string
  subtitle?: string
  content: string
  thumbnail?: string
  category: string
  author: string
  authorAffiliation?: string
  visibility: 'all' | 'free' | 'paid' | 'purchased'
  status: 'draft' | 'published' | 'private' | 'scheduled'
  isEditorPick?: boolean
  tags?: string[]
  questions?: string[]
  previewLength?: number
  scheduledAt?: string
}

export interface ArticleUpdateRequest extends Partial<ArticleCreateRequest> {
  id: number
}

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


