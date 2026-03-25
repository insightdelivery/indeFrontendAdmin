import apiClient from '@/lib/axios'

/** `POST /files/upload` — folder `event-banner/` (백엔드 4MB·이미지 타입 검증과 일치) */
export const EVENT_BANNER_IMAGE_MAX_BYTES = 4 * 1024 * 1024
export const EVENT_BANNER_UPLOAD_FOLDER = 'event-banner/'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/** 폼에서 파일 선택 직후 미리보기 전에 동일 규칙으로 검증할 때 사용 */
export function validateEventBannerImageFile(file: File): void {
  if (file.size > EVENT_BANNER_IMAGE_MAX_BYTES) {
    throw new Error('이미지는 4MB 이하만 업로드할 수 있습니다.')
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('JPEG, PNG, GIF, WebP 이미지만 업로드할 수 있습니다.')
  }
}

export type EventBannerUploadResult = {
  /** DB·PATCH에 넣을 S3 객체 URL(비공개 버킷 직링크 — img src에는 부적합) */
  storageUrl: string
  /** 관리자 `<img>` 미리보기용 Presigned URL */
  displayUrl: string
}

/**
 * 이벤트 베너 배경 이미지를 S3에 올립니다.
 * `storageUrl`은 저장용, `displayUrl`은 브라우저 미리보기용입니다.
 */
export async function uploadEventBannerImage(file: File): Promise<EventBannerUploadResult> {
  validateEventBannerImageFile(file)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', EVENT_BANNER_UPLOAD_FOLDER)
  formData.append('prefix', 'banner')

  const response = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  const api = response.data?.IndeAPIResponse
  const res = api?.Result
  if (api?.ErrorCode !== '00' || !res?.url) {
    throw new Error(api?.Message || '이미지 업로드에 실패했습니다.')
  }
  const storageUrl = res.url as string
  const displayUrl =
    typeof res.displayUrl === 'string' && res.displayUrl.trim() !== '' ? res.displayUrl : storageUrl
  return { storageUrl, displayUrl }
}
