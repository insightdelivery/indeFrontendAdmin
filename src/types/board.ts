/** 공지사항 목록 항목 */
export interface NoticeListItem {
  id: number
  title: string
  is_pinned: boolean
  view_count: number
  created_at: string
}

/** 공지사항 상세 */
export interface NoticeDetail extends NoticeListItem {
  content: string
}

/** 공지 목록 DRF 페이징 응답 */
export interface NoticeListResponse {
  count: number
  next: string | null
  previous: string | null
  results: NoticeListItem[]
}

/** FAQ 항목 */
export interface FAQItem {
  id: number
  question: string
  answer: string
  order: number
  created_at?: string
}

/** FAQ 목록 DRF 페이징 응답 */
export interface FAQListResponse {
  count: number
  next: string | null
  previous: string | null
  results: FAQItem[]
}

/** 1:1 문의 상태 */
export type InquiryStatus = 'waiting' | 'answered'

/** 문의 회원 정보 (목록: 아이디·이름, 상세: + 이메일·전화번호) */
export interface InquiryMember {
  member_sid: number
  name: string
  email?: string
  phone?: string
}

/** 1:1 문의 목록 항목 */
export interface InquiryListItem {
  id: number
  title: string
  status: InquiryStatus
  created_at: string
  member?: InquiryMember | null
}

/** 1:1 문의 상세 */
export interface InquiryDetail extends InquiryListItem {
  content: string
  answer: string | null
}

/** 문의 목록 DRF 페이징 응답 */
export interface InquiryListResponse {
  count: number
  next: string | null
  previous: string | null
  results: InquiryListItem[]
}
