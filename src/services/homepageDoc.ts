/**
 * 홈페이지 정적 문서 관리 API — wwwDocEtc.md
 */
import apiClient from '@/lib/axios'
import type { HomepageDocType } from '@/constants/homepageDoc'

export interface HomepageDocPayload {
  docType: string
  title: string | null
  bodyHtml: string
  isPublished: boolean
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

export async function listHomepageDocs(): Promise<HomepageDocPayload[]> {
  const { data } = await apiClient.get<unknown>('/homepage-doc-info')
  const result = unwrapInde<{ documents: HomepageDocPayload[] }>(data)
  return result.documents ?? []
}

export async function putHomepageDoc(
  docType: HomepageDocType,
  body: { title: string | null; bodyHtml: string; isPublished: boolean }
): Promise<HomepageDocPayload> {
  const { data } = await apiClient.put<unknown>(`/homepage-doc-info/${docType}`, body)
  return unwrapInde<HomepageDocPayload>(data)
}
