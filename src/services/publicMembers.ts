/**
 * 관리자 공개 회원(PublicMemberShip) API - admin_api /publicMembers/
 */
import apiClient from '@/lib/axios'
import type {
  PublicMemberListItem,
  PublicMemberDetail,
  PublicMemberListResponse,
  PublicMemberCreateUpdateRequest,
} from '@/types/publicMember'

const BASE = '/publicMembers'

function unwrapResult<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  const inde = d?.IndeAPIResponse as Record<string, unknown> | undefined
  if (inde?.Result !== undefined) return inde.Result as T
  if (d?.Result !== undefined) return d.Result as T
  return data as T
}

export async function getPublicMemberList(params?: {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
}): Promise<PublicMemberListResponse> {
  const { data } = await apiClient.get(`${BASE}/`, { params })
  return unwrapResult<PublicMemberListResponse>(data)
}

export async function getPublicMember(memberSid: number): Promise<PublicMemberDetail> {
  const { data } = await apiClient.get(`${BASE}/${memberSid}/`)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function createPublicMember(body: PublicMemberCreateUpdateRequest & { password: string }): Promise<PublicMemberDetail> {
  const { data } = await apiClient.post(`${BASE}/`, body)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function updatePublicMember(memberSid: number, body: PublicMemberCreateUpdateRequest): Promise<PublicMemberDetail> {
  const { data } = await apiClient.put(`${BASE}/${memberSid}/`, body)
  return unwrapResult<PublicMemberDetail>(data)
}

export async function deletePublicMember(memberSid: number): Promise<void> {
  await apiClient.delete(`${BASE}/${memberSid}/`)
}
