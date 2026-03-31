import apiClient from '@/lib/axios'

export interface AdminMember {
  memberShipSid: string
  memberShipId: string
  memberShipName: string
  memberShipEmail: string
  memberShipPhone?: string
  memberShipLevel: number
  is_admin: boolean
  is_active: boolean
  last_login?: string
  login_count: number
  created_at: string
  updated_at: string
}

export interface AdminListResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      admins: AdminMember[]
      total: number
    }
  }
}

export interface IndeAPIResponse<T> {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: T
  }
}

export interface AdminRegisterRequest {
  memberShipId: string
  password: string
  password_confirm: string
  memberShipName: string
  memberShipEmail: string
  memberShipPhone?: string
  memberShipLevel?: number
  is_admin?: boolean
}

export interface AdminRegisterResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      message: string
      user: AdminMember
    }
  }
}

export interface AdminUpdateRequest {
  memberShipSid: string
  memberShipName?: string
  memberShipEmail?: string
  memberShipPhone?: string
  memberShipLevel?: number
  is_admin?: boolean
  is_active?: boolean
  password?: string
  password_confirm?: string
}

export interface AdminUpdateResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      message: string
      user: AdminMember
    }
  }
}

export interface AdminDeleteResponse {
  IndeAPIResponse: {
    ErrorCode: string
    Message: string
    Result: {
      message: string
    }
  }
}

export interface AdminListPagedResult {
  admins: AdminMember[]
  total: number
  page: number
  pageSize: number
}

/** Inde 래퍼 또는 DRF 직접 응답 모두 처리 */
function parseAdminListPayload(data: unknown): AdminListPagedResult {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const inde = d.IndeAPIResponse as
      | { ErrorCode?: string; Message?: string; Result?: { admins?: AdminMember[]; total?: number } }
      | undefined
    if (inde?.Result?.admins) {
      if (inde.ErrorCode && inde.ErrorCode !== '00') {
        throw new Error(inde.Message || '관리자 목록 조회에 실패했습니다.')
      }
      const admins = inde.Result.admins
      const total = inde.Result.total ?? admins.length
      return { admins, total, page: 1, pageSize: total || 1 }
    }
    if (Array.isArray(d.admins)) {
      const admins = d.admins as AdminMember[]
      const total = typeof d.total === 'number' ? d.total : admins.length
      const page = typeof d.page === 'number' ? d.page : 1
      const pageSize = typeof d.page_size === 'number' ? d.page_size : total || 1
      return { admins, total, page, pageSize }
    }
  }
  throw new Error('응답 형식이 올바르지 않습니다.')
}

/**
 * 관리자 목록 조회 (전체 — page 파라미터 없이 호출 시 백엔드가 전체 반환)
 */
export const getAdminList = async (): Promise<AdminMember[]> => {
  try {
    const response = await apiClient.get('/adminMember/list')
    return parseAdminListPayload(response.data).admins
  } catch (error: unknown) {
    const err = error as { response?: { data?: { IndeAPIResponse?: { Message?: string }; error?: string } } }
    const msg =
      err.response?.data?.IndeAPIResponse?.Message ||
      err.response?.data?.error ||
      (error instanceof Error ? error.message : null) ||
      '관리자 목록 조회에 실패했습니다.'
    throw new Error(msg)
  }
}

/**
 * 관리자 목록 — 검색(q)·페이지네이션 (메뉴권한 화면 등)
 */
export async function getAdminListPaged(params: {
  q?: string
  page: number
  pageSize: number
}): Promise<AdminListPagedResult> {
  try {
    const response = await apiClient.get('/adminMember/list', {
      params: {
        q: params.q || undefined,
        page: params.page,
        page_size: params.pageSize,
      },
    })
    return parseAdminListPayload(response.data)
  } catch (error: unknown) {
    const err = error as { response?: { data?: { IndeAPIResponse?: { Message?: string }; error?: string } } }
    const msg =
      err.response?.data?.IndeAPIResponse?.Message ||
      err.response?.data?.error ||
      (error instanceof Error ? error.message : null) ||
      '관리자 목록 조회에 실패했습니다.'
    throw new Error(msg)
  }
}

/**
 * 관리자 등록
 */
export const registerAdmin = async (data: AdminRegisterRequest): Promise<AdminMember> => {
  console.log('관리자 등록 API 호출 시작:', '/adminMember/join', data)
  
  try {
    const response = await apiClient.post<AdminRegisterResponse>('/adminMember/join', data)
    console.log('관리자 등록 API 응답 원본:', response.data)
    
    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    if (!apiResponse) {
      console.error('IndeAPIResponse가 없습니다. 응답:', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }
    
    console.log('파싱된 응답:', apiResponse)
    
    // ErrorCode가 "00"이 아니면 에러
    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '관리자 등록에 실패했습니다.')
    }
    
    // Result에서 데이터 추출
    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }
    
    console.log('관리자 등록 성공, Result:', apiResponse.Result)
    if (!apiResponse.Result.user) {
      throw new Error('사용자 정보가 없습니다.')
    }
    return apiResponse.Result.user
  } catch (error: any) {
    console.error('관리자 등록 오류:', error)
    console.error('오류 응답:', error.response?.data)
    
    // 에러 메시지 추출
    let errorMessage = '관리자 등록에 실패했습니다.'
    
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
 * 관리자 수정
 */
export const updateAdmin = async (data: AdminUpdateRequest): Promise<AdminMember> => {
  console.log('관리자 수정 API 호출 시작:', '/adminMember/update', data)
  
  try {
    const response = await apiClient.put<AdminUpdateResponse>('/adminMember/update', data)
    console.log('관리자 수정 API 응답 원본:', response.data)
    
    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    if (!apiResponse) {
      console.error('IndeAPIResponse가 없습니다. 응답:', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }
    
    console.log('파싱된 응답:', apiResponse)
    
    // ErrorCode가 "00"이 아니면 에러
    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '관리자 수정에 실패했습니다.')
    }
    
    // Result에서 데이터 추출
    if (!apiResponse.Result) {
      throw new Error('응답 데이터가 없습니다.')
    }
    
    console.log('관리자 수정 성공, Result:', apiResponse.Result)
    if (!apiResponse.Result.user) {
      throw new Error('사용자 정보가 없습니다.')
    }
    return apiResponse.Result.user
  } catch (error: any) {
    console.error('관리자 수정 오류:', error)
    console.error('오류 응답:', error.response?.data)
    
    // 에러 메시지 추출
    let errorMessage = '관리자 수정에 실패했습니다.'
    
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
 * 관리자 삭제
 */
export const deleteAdmin = async (memberShipSid: string): Promise<void> => {
  console.log('관리자 삭제 API 호출 시작:', '/adminMember/delete', memberShipSid)
  
  try {
    const response = await apiClient.delete<AdminDeleteResponse>('/adminMember/delete', {
      data: { memberShipSid }
    })
    console.log('관리자 삭제 API 응답 원본:', response.data)
    
    // IndeAPIResponse 구조 파싱
    const apiResponse = response.data.IndeAPIResponse
    
    if (!apiResponse) {
      console.error('IndeAPIResponse가 없습니다. 응답:', response.data)
      throw new Error('응답 형식이 올바르지 않습니다.')
    }
    
    console.log('파싱된 응답:', apiResponse)
    
    // ErrorCode가 "00"이 아니면 에러
    if (apiResponse.ErrorCode !== '00') {
      throw new Error(apiResponse.Message || '관리자 삭제에 실패했습니다.')
    }
    
    console.log('관리자 삭제 성공, Result:', apiResponse.Result)
  } catch (error: any) {
    console.error('관리자 삭제 오류:', error)
    console.error('오류 응답:', error.response?.data)
    
    // 에러 메시지 추출
    let errorMessage = '관리자 삭제에 실패했습니다.'
    
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
