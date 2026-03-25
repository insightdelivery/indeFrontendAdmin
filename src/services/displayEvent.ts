/**
 * 이벤트 베너(DisplayEvent) 관리자 API
 * @see _docsRules/1_planDoc/eventBannerPlan.md
 */
import apiClient from '@/lib/axios'
import type { DisplayEventHeroItem, DisplayEventWritePayload } from '@/types/displayEvent'

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

/** DRF 페이지네이션 또는 Inde 래핑 목록 */
export async function listDisplayEvents(params?: {
  page?: number
  page_size?: number
  eventTypeCode?: string
  contentTypeCode?: string
  isActive?: string
}): Promise<{ results: DisplayEventHeroItem[]; count: number }> {
  const { data } = await apiClient.get<unknown>('/display-events', { params })

  const plain = data as {
    count?: number
    results?: DisplayEventHeroItem[]
  }
  if (plain && Array.isArray(plain.results) && typeof plain.count === 'number') {
    return { results: plain.results, count: plain.count }
  }

  const wrapped = data as {
    IndeAPIResponse?: { ErrorCode?: string; Result?: { results?: DisplayEventHeroItem[]; count?: number } }
  }
  const r = wrapped?.IndeAPIResponse?.Result
  if (r?.results && typeof r.count === 'number') {
    return { results: r.results, count: r.count }
  }

  throw new Error('목록 응답 형식을 해석할 수 없습니다.')
}

export async function getDisplayEvent(id: number): Promise<DisplayEventHeroItem> {
  const { data } = await apiClient.get(`/display-events/${id}`)
  return unwrapInde<DisplayEventHeroItem>(data)
}

export async function createDisplayEvent(payload: DisplayEventWritePayload): Promise<DisplayEventHeroItem> {
  const { data } = await apiClient.post('/display-events', payload)
  return unwrapInde<DisplayEventHeroItem>(data)
}

export async function updateDisplayEvent(
  id: number,
  payload: Partial<DisplayEventWritePayload>
): Promise<DisplayEventHeroItem> {
  const { data } = await apiClient.patch(`/display-events/${id}`, payload)
  return unwrapInde<DisplayEventHeroItem>(data)
}

export async function deleteDisplayEvent(id: number): Promise<void> {
  await apiClient.delete(`/display-events/${id}`)
}
