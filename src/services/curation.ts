/**
 * 특집(큐레이션) 관리 API — admin /curation
 * 한 큐레이션에 여러 콘텐츠(items) 포함.
 */
import apiClient from '@/lib/axios'

export type CurationContentType = 'ARTICLE' | 'VIDEO' | 'SEMINAR'

export type CurationAdminLineItem = {
  itemId: number
  contentType: CurationContentType
  contentCode: number
  customTitle: string | null
  sortOrder: number
  displayTitle: string
  originalTitle: string
  thumbnail: string
  categoryName: string
  summary: string
  resolveError: string | null
}

export type CurationSummary = {
  id: number
  name: string | null
  itemCount: number
  isActive: boolean
  isExposed: boolean
  exposureStartDatetime: string | null
  exposureEndDatetime: string | null
  regDatetime: string | null
}

export type CurationDetail = CurationSummary & {
  items: CurationAdminLineItem[]
}

export type CurationPreviewResult = {
  displayTitle: string
  thumbnail: string
  categoryName: string
  summary: string
}

export type CurationItemInput = {
  contentType: CurationContentType
  contentCode: number
  title?: string | null
  sortOrder?: number
}

export type CurationWritePayload = {
  name?: string | null
  isActive?: boolean
  isExposed?: boolean
  exposureStartDatetime?: string | null
  exposureEndDatetime?: string | null
  items: CurationItemInput[]
}

function unwrapInde<T>(data: unknown): T {
  const d = data as { IndeAPIResponse?: { ErrorCode?: string; Message?: string; Result?: T } }
  const api = d?.IndeAPIResponse
  if (!api || api.ErrorCode !== '00') {
    throw new Error(api?.Message || '요청 처리에 실패했습니다.')
  }
  if (api.Result === undefined) {
    throw new Error('응답 데이터가 없습니다.')
  }
  return api.Result as T
}

export async function listCurationGroups(): Promise<CurationSummary[]> {
  const { data } = await apiClient.get<unknown>('/curation')
  const r = unwrapInde<{ items: CurationSummary[] }>(data)
  return r.items ?? []
}

export async function getCurationPreview(params: {
  contentType: CurationContentType
  contentCode: number
}): Promise<CurationPreviewResult> {
  const { data } = await apiClient.get<unknown>('/curation/preview', {
    params: { contentType: params.contentType, contentCode: params.contentCode },
  })
  return unwrapInde<CurationPreviewResult>(data)
}

export async function getCuration(id: number): Promise<CurationDetail> {
  const { data } = await apiClient.get<unknown>(`/curation/${id}`)
  return unwrapInde<CurationDetail>(data)
}

export async function createCuration(payload: CurationWritePayload): Promise<CurationDetail> {
  const { data } = await apiClient.post<unknown>('/curation', payload)
  return unwrapInde<CurationDetail>(data)
}

export async function updateCuration(id: number, payload: Partial<CurationWritePayload>): Promise<CurationDetail> {
  const { data } = await apiClient.patch<unknown>(`/curation/${id}`, payload)
  return unwrapInde<CurationDetail>(data)
}

export async function deleteCuration(id: number): Promise<void> {
  const { data } = await apiClient.delete<unknown>(`/curation/${id}`)
  unwrapInde<{ id: number; deleted: boolean }>(data)
}
