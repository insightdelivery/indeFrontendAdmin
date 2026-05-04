/**
 * 뉴스레터 관리 API — admin_api /api/newsletter/
 */
import apiClient from '@/lib/axios'

export type NewsletterSubscriberRow = {
  subscriber_id: number
  email: string
  name: string
  subscribe_status: string
  signup_source: string
  member_id: number | null
  agree_datetime: string | null
  create_at: string | null
}

function unwrapResult<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  const inde = d?.IndeAPIResponse as Record<string, unknown> | undefined
  if (inde?.Result !== undefined) return inde.Result as T
  if (d?.Result !== undefined) return d.Result as T
  return data as T
}

function assertIndeSuccess(data: unknown): void {
  const inde = (data as Record<string, unknown>)?.IndeAPIResponse as Record<string, unknown> | undefined
  if (!inde || inde.ErrorCode === undefined) return
  if (inde.ErrorCode !== '00') {
    throw new Error(String(inde.Message || '처리에 실패했습니다.'))
  }
}

export function newsletterAdminApiErrorMessage(e: unknown): string {
  const ax = e as { response?: { data?: { IndeAPIResponse?: { Message?: string } } }; message?: string }
  return ax.response?.data?.IndeAPIResponse?.Message || ax.message || '요청에 실패했습니다.'
}

export type NewsletterMergeMembersResult = {
  created: number
  updated: number
  total: number
}

export async function postNewsletterMergeMembers(): Promise<NewsletterMergeMembersResult> {
  const { data } = await apiClient.post('/api/newsletter/merge-members', {})
  return unwrapResult(data) as NewsletterMergeMembersResult
}

export async function postNewsletterSubscriberUnsubscribe(subscriberId: number): Promise<void> {
  const { data } = await apiClient.post(`/api/newsletter/subscribers/${subscriberId}/unsubscribe`, {})
  assertIndeSuccess(data)
}

export async function deleteNewsletterSubscriber(subscriberId: number): Promise<void> {
  const { data } = await apiClient.delete(`/api/newsletter/subscribers/${subscriberId}`)
  assertIndeSuccess(data)
}

export async function fetchNewsletterSubscribers(params: {
  page?: number
  page_size?: number
  search?: string
  status?: string
  date_from?: string
  date_to?: string
}): Promise<{ list: NewsletterSubscriberRow[]; total: number; page: number; page_size: number }> {
  const { data } = await apiClient.get('/api/newsletter/subscribers', { params })
  return unwrapResult(data) as { list: NewsletterSubscriberRow[]; total: number; page: number; page_size: number }
}

function buildNewsletterExportFilename(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `newsletter_combined_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.xlsx`
}

export async function downloadNewsletterExport(): Promise<void> {
  const res = await apiClient.get('/api/newsletter/export', { responseType: 'blob' })
  const blob = res.data as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildNewsletterExportFilename()
  a.click()
  URL.revokeObjectURL(url)
}
