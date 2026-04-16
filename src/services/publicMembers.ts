/**
 * 관리자 공개 회원(PublicMemberShip) API - admin_api /publicMembers/
 */
import apiClient from '@/lib/axios'
import type {
  PublicMemberListItem,
  PublicMemberDetail,
  PublicMemberListResponse,
  PublicMemberCreateUpdateRequest,
  PublicMemberActivityItem,
  PublicMemberActivityQuery,
  PublicMemberHighlightItem,
  PublicMemberAppliedQuestionItem,
  PublicMemberRatingSummary,
  PublicMemberListPayload,
} from '@/types/publicMember'

const BASE = '/publicMembers'

function unwrapResult<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  const inde = d?.IndeAPIResponse as Record<string, unknown> | undefined
  if (inde?.Result !== undefined) return inde.Result as T
  if (d?.Result !== undefined) return d.Result as T
  return data as T
}

function normalizeListPayload<T>(raw: unknown): PublicMemberListPayload<T> {
  const d = raw as Record<string, unknown>
  const list = (Array.isArray(d?.list) ? d.list : Array.isArray(d?.results) ? d.results : []) as T[]
  const total = typeof d?.total === 'number' ? d.total : typeof d?.count === 'number' ? d.count : list.length
  const page = typeof d?.page === 'number' ? d.page : 1
  const pageSize = typeof d?.page_size === 'number' ? d.page_size : typeof d?.pageSize === 'number' ? d.pageSize : 10
  return { list, total, page, page_size: pageSize }
}

export type PublicMemberRecipientScope =
  | 'marketing_agree'
  | 'all'
  | 'join_date'
  | 'inactive_90'
  | 'withdrawn'

export async function getPublicMemberList(params?: {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  status?: 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN'
  /** 문자/카카오 수신자 검색 등: 백엔드 `AdminPublicMemberViewSet.get_queryset` */
  recipient_scope?: PublicMemberRecipientScope
  join_date_from?: string
  join_date_to?: string
}): Promise<PublicMemberListResponse> {
  const { data } = await apiClient.get(`${BASE}`, { params })
  return unwrapResult<PublicMemberListResponse>(data)
}

export async function getPublicMember(memberSid: number): Promise<PublicMemberDetail> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}`)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function checkPublicMemberEmailDuplicate(
  memberSid: number,
  email: string
): Promise<{ email: string; isDuplicate: boolean; memberSid: number }> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/check-email`, {
    params: { email },
  })
  return unwrapResult<{ email: string; isDuplicate: boolean; memberSid: number }>(data)
}

export async function createPublicMember(body: PublicMemberCreateUpdateRequest & { password: string }): Promise<PublicMemberDetail> {
  const { data } = await apiClient.post(`${BASE}`, body)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function updatePublicMember(memberSid: number, body: PublicMemberCreateUpdateRequest): Promise<PublicMemberDetail> {
  const { data } = await apiClient.put(`${BASE}/${memberSid}`, body)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function deletePublicMember(memberSid: number): Promise<void> {
  await apiClient.delete(`${BASE}/${memberSid}`)
}

/** 관리자 탈퇴 처리 (Soft Delete): status=WITHDRAWN, is_active=false */
export async function withdrawPublicMember(
  memberSid: number,
  body?: { reason?: string; detail_reason?: string }
): Promise<{ detail: string; member_sid: number }> {
  const { data } = await apiClient.post(`${BASE}/${memberSid}/withdraw`, body ?? {})
  return unwrapResult<{ detail: string; member_sid: number }>(data)
}

/** 탈퇴 회원 정상 복구 */
export async function restorePublicMember(memberSid: number): Promise<{ detail: string; member_sid: number }> {
  const { data } = await apiClient.post(`${BASE}/${memberSid}/restore`, {})
  return unwrapResult<{ detail: string; member_sid: number }>(data)
}

export async function getPublicMemberViews(
  memberSid: number,
  params?: PublicMemberActivityQuery
): Promise<PublicMemberListPayload<PublicMemberActivityItem>> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/activity/views`, { params })
  return normalizeListPayload<PublicMemberActivityItem>(unwrapResult<unknown>(data))
}

export async function getPublicMemberHighlights(
  memberSid: number,
  params?: PublicMemberActivityQuery & { view?: 'date' | 'article' }
): Promise<PublicMemberListPayload<PublicMemberHighlightItem>> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/highlights`, { params })
  return normalizeListPayload<PublicMemberHighlightItem>(unwrapResult<unknown>(data))
}

export async function deletePublicMemberHighlight(
  memberSid: number,
  highlightGroupId: number
): Promise<void> {
  await apiClient.delete(`${BASE}/${memberSid}/highlights/${highlightGroupId}`)
}

export async function getPublicMemberAppliedQuestions(
  memberSid: number,
  params?: PublicMemberActivityQuery
): Promise<PublicMemberListPayload<PublicMemberAppliedQuestionItem>> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/applied-questions`, { params })
  return normalizeListPayload<PublicMemberAppliedQuestionItem>(unwrapResult<unknown>(data))
}

export async function getPublicMemberBookmarks(
  memberSid: number,
  params?: PublicMemberActivityQuery
): Promise<PublicMemberListPayload<PublicMemberActivityItem>> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/activity/bookmarks`, { params })
  return normalizeListPayload<PublicMemberActivityItem>(unwrapResult<unknown>(data))
}

export async function deletePublicMemberBookmark(
  memberSid: number,
  contentType: string,
  contentCode: string
): Promise<void> {
  await apiClient.delete(`${BASE}/${memberSid}/activity/bookmarks`, {
    params: { contentType, contentCode },
  })
}

export async function getPublicMemberRatings(
  memberSid: number,
  params?: PublicMemberActivityQuery
): Promise<PublicMemberListPayload<PublicMemberActivityItem> & { summary: PublicMemberRatingSummary }> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/activity/ratings`, { params })
  const result = unwrapResult<Record<string, unknown>>(data)
  const payload = normalizeListPayload<PublicMemberActivityItem>(result)
  const summaryRaw = (result?.summary ?? {}) as Record<string, unknown>
  return {
    ...payload,
    summary: {
      avgRating: typeof summaryRaw.avgRating === 'number' ? summaryRaw.avgRating : 0,
      totalCount: typeof summaryRaw.totalCount === 'number' ? summaryRaw.totalCount : 0,
      distribution: (summaryRaw.distribution as Record<string, number>) ?? {},
    },
  }
}
