/**
 * Content Author API 서비스
 */
import apiClient from '@/lib/axios'

const PROFILE_IMAGE_MAX_BYTES = 3 * 1024 * 1024 // 3MB
const PROFILE_IMAGE_MAX_PX = 500

/** 프로필 이미지 파일 검증: 3MB 이하, 정사각형, 500px 이하 */
export function validateProfileImageFile(file: File): Promise<{ valid: true; width: number; height: number } | { valid: false; error: string }> {
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return Promise.resolve({ valid: false, error: '이미지 용량은 3MB 이하여야 합니다.' })
  }
  const accepted = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!accepted.includes(file.type)) {
    return Promise.resolve({ valid: false, error: '이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF, WebP)' })
  }
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w !== h) {
        resolve({ valid: false, error: '정사각형 이미지만 가능합니다.' })
        return
      }
      if (w > PROFILE_IMAGE_MAX_PX || h > PROFILE_IMAGE_MAX_PX) {
        resolve({ valid: false, error: `한 변이 500px 이하여야 합니다. (현재 ${w}px)` })
        return
      }
      resolve({ valid: true, width: w, height: h })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ valid: false, error: '이미지를 불러올 수 없습니다.' })
    }
    img.src = url
  })
}

/** 프로필 이미지 업로드: 검증 후 S3 업로드, URL 반환 */
export async function uploadProfileImage(file: File): Promise<string> {
  const validation = await validateProfileImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', 'content-author/profile/')
  const response = await apiClient.post<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: { url: string } } }>(
    '/files/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  const api = response.data.IndeAPIResponse
  if (!api || api.ErrorCode !== '00' || !api.Result?.url) {
    throw new Error(api?.Message || '프로필 이미지 업로드에 실패했습니다.')
  }
  return api.Result.url
}
import type {
  ContentAuthor,
  ContentAuthorListParams,
  ContentAuthorListResponse,
  ContentAuthorDetailResponse,
  ContentAuthorCreateRequest,
  ContentAuthorUpdateRequest,
  ContentTypeOption,
} from '../types'

const unwrap = <T>(response: { data: { IndeAPIResponse?: { ErrorCode: string; Message: string; Result: T } } }): T => {
  const api = response.data.IndeAPIResponse
  if (!api || api.ErrorCode !== '00') {
    throw new Error(api?.Message || '요청 처리에 실패했습니다.')
  }
  if (api.Result === undefined) {
    throw new Error('응답 데이터가 없습니다.')
  }
  return api.Result
}

/** 저자 목록 조회 */
export async function getAuthorList(params?: ContentAuthorListParams): Promise<{
  authors: ContentAuthor[]
  total: number
  page: number
  pageSize: number
}> {
  const response = await apiClient.get<ContentAuthorListResponse>('/authors/list', { params })
  return unwrap(response)
}

/** 저자 상세 조회 */
export async function getAuthor(id: number): Promise<ContentAuthor> {
  const response = await apiClient.get<ContentAuthorDetailResponse>(`/authors/${id}`)
  return unwrap(response)
}

/** 저자 등록 */
export async function createAuthor(data: ContentAuthorCreateRequest): Promise<ContentAuthor> {
  const response = await apiClient.post<ContentAuthorDetailResponse>('/authors/create', data)
  return unwrap(response)
}

/** 저자 수정 */
export async function updateAuthor(id: number, data: ContentAuthorUpdateRequest): Promise<ContentAuthor> {
  const payload = { ...data }
  delete (payload as { author_id?: number }).author_id
  const response = await apiClient.put<ContentAuthorDetailResponse>(`/authors/${id}`, payload)
  return unwrap(response)
}

/** 저자 삭제 */
export async function deleteAuthor(id: number): Promise<void> {
  await apiClient.delete(`/authors/${id}`)
}

/** 콘텐츠 유형별 ACTIVE 저자 목록 (셀렉트 옵션용) */
export async function getAuthorsByContentType(type: ContentTypeOption): Promise<ContentAuthor[]> {
  const response = await apiClient.get<ContentAuthorListResponse>('/authors/by-content-type', {
    params: { type },
  })
  const result = unwrap(response)
  return result.authors ?? []
}
