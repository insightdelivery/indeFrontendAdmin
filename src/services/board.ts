/**
 * 관리자 게시판 API (공지/FAQ/1:1문의) - admin_api /board/ 엔드포인트
 * IndeAPIResponse 래퍼(Result) 또는 DRF 직렬 응답 모두 처리
 */
import apiClient from '@/lib/axios'
import type {
  NoticeDetail,
  NoticeListResponse,
  FAQItem,
  FAQListResponse,
  InquiryDetail,
  InquiryListResponse,
} from '@/types/board'

const BASE = '/board'

/** IndeAPIResponse.Result 또는 본문 그대로 반환 (백엔드가 IndeJSONRenderer로 감싼 경우 대응) */
function unwrapResult<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  const inde = d?.IndeAPIResponse as Record<string, unknown> | undefined
  if (inde?.Result !== undefined) return inde.Result as T
  if (d?.Result !== undefined) return d.Result as T
  return data as T
}

/** 공지 목록 */
export async function getNoticeList(params?: {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
}): Promise<NoticeListResponse> {
  const { data } = await apiClient.get(`${BASE}/notices/`, { params })
  return unwrapResult<NoticeListResponse>(data)
}

/** 공지 상세 */
export async function getNotice(id: number): Promise<NoticeDetail> {
  const { data } = await apiClient.get(`${BASE}/notices/${id}/`)
  return unwrapResult<NoticeDetail>(data)
}

/** 공지 생성 */
export async function createNotice(body: { title: string; content: string; is_pinned?: boolean }): Promise<NoticeDetail> {
  const { data } = await apiClient.post(`${BASE}/notices/`, body)
  return unwrapResult<NoticeDetail>(data)
}

/** 공지 수정 */
export async function updateNotice(id: number, body: { title: string; content: string; is_pinned?: boolean }): Promise<NoticeDetail> {
  const { data } = await apiClient.put(`${BASE}/notices/${id}/`, body)
  return unwrapResult<NoticeDetail>(data)
}

/** 공지 삭제 */
export async function deleteNotice(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/notices/${id}/`)
}

/** FAQ 목록 */
export async function getFAQList(params?: { page?: number; page_size?: number }): Promise<FAQListResponse> {
  const { data } = await apiClient.get(`${BASE}/faqs/`, { params })
  return unwrapResult<FAQListResponse>(data)
}

/** FAQ 상세 */
export async function getFAQ(id: number): Promise<FAQItem> {
  const { data } = await apiClient.get(`${BASE}/faqs/${id}/`)
  return unwrapResult<FAQItem>(data)
}

/** FAQ 생성 */
export async function createFAQ(body: { question: string; answer: string; order?: number }): Promise<FAQItem> {
  const { data } = await apiClient.post(`${BASE}/faqs/`, body)
  return unwrapResult<FAQItem>(data)
}

/** FAQ 수정 */
export async function updateFAQ(id: number, body: { question: string; answer: string; order?: number }): Promise<FAQItem> {
  const { data } = await apiClient.put(`${BASE}/faqs/${id}/`, body)
  return unwrapResult<FAQItem>(data)
}

/** FAQ 삭제 */
export async function deleteFAQ(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/faqs/${id}/`)
}

/** 1:1 문의 목록 */
export async function getInquiryList(params?: { page?: number; page_size?: number }): Promise<InquiryListResponse> {
  const { data } = await apiClient.get(`${BASE}/inquiries/`, { params })
  return unwrapResult<InquiryListResponse>(data)
}

/** 1:1 문의 상세 */
export async function getInquiry(id: number): Promise<InquiryDetail> {
  const { data } = await apiClient.get(`${BASE}/inquiries/${id}/`)
  return unwrapResult<InquiryDetail>(data)
}

/** 1:1 문의 답변 저장 */
export async function answerInquiry(id: number, answer: string): Promise<InquiryDetail> {
  const { data } = await apiClient.patch(`${BASE}/inquiries/${id}/`, { answer })
  return unwrapResult<InquiryDetail>(data)
}
