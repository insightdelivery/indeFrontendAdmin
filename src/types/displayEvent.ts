/** 관리자/공통 DisplayEvent payload (Hero 형태 + 관리 필드) */
export interface DisplayEventHeroItem {
  displayEventId: number
  eventTypeCode: string
  contentTypeCode: string
  contentId: number | null
  title: string | null
  subtitle: string | null
  imageUrl: string | null
  linkUrl: string | null
  content: {
    id: number
    title?: string
    thumbnail?: string | null
    subtitle?: string | null
  } | null
  displayOrder?: number
  isActive?: boolean
  startAt?: string | null
  endAt?: string | null
}

export interface DisplayEventWritePayload {
  eventTypeCode: string
  contentTypeCode: string
  contentId?: number | null
  title?: string | null
  subtitle?: string | null
  imageUrl?: string | null
  linkUrl?: string | null
  displayOrder?: number
  isActive?: boolean
  startAt?: string | null
  endAt?: string | null
}
