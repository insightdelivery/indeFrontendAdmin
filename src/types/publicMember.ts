/** 회원 상태 (탈퇴 규칙) */
export type PublicMemberStatus = 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN'

/** 공개 회원(PublicMemberShip) 목록 항목 */
export interface PublicMemberListItem {
  member_sid: number
  email: string
  name: string
  nickname: string
  phone: string
  position: string | null
  joined_via: string
  is_staff: boolean
  is_active: boolean
  email_verified: boolean
  profile_completed: boolean
  newsletter_agree: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  /** 회원 상태 (백엔드 0007 마이그레이션 후 반환) */
  status?: PublicMemberStatus
  withdraw_requested_at?: string | null
  withdraw_completed_at?: string | null
}

/** 공개 회원 상세 (비밀번호 제외) */
export interface PublicMemberDetail extends PublicMemberListItem {
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  region_type: string | null
  region_domestic: string | null
  region_foreign: string | null
  sns_provider_uid: string | null
  withdraw_reason?: string | null
  withdraw_detail_reason?: string | null
  withdraw_ip?: string | null
  withdraw_user_agent?: string | null
}

/** 목록 페이징 응답 */
export interface PublicMemberListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PublicMemberListItem[]
}

/** 생성/수정 요청 (password는 생성 시 필수, 수정 시 선택) */
export interface PublicMemberCreateUpdateRequest {
  email: string
  name: string
  nickname: string
  phone: string
  password?: string
  position?: string
  birth_year?: number | null
  birth_month?: number | null
  birth_day?: number | null
  region_type?: string | null
  region_domestic?: string | null
  region_foreign?: string | null
  joined_via?: string
  newsletter_agree?: boolean
  profile_completed?: boolean
  email_verified?: boolean
  is_staff?: boolean
  is_active?: boolean
  /** 회원 상태 (관리자 수정용) */
  status?: PublicMemberStatus
  withdraw_reason?: string | null
  withdraw_detail_reason?: string | null
}
