import apiClient from '@/lib/axios'

const BASE = '/dashboard/summary'

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

export type MemberChartGranularity = 'day' | 'week' | 'month'

export type DashboardMemberChartRow = {
  label: string
  joinCount: number
  withdrawCount: number
}

export type DashboardMembersSummary = {
  totalActive: number
  totalWithdrawn: number
  todayNew: number
  todayWithdrawn: number
  memberChart: DashboardMemberChartRow[]
}

export type DashboardInquiriesSummary = {
  unanswered: number
}

/** 회원 관리 카드(오늘 로그인·미답변 문의) */
export type DashboardMemberMgmtSummary = {
  todayLoginMemberCount: number
  unansweredInquiries: number
}

export type DashboardArticleSummary = {
  total: number
  draft: number
  published: number
  private: number
  scheduled: number
  deleted: number
}

export type DashboardVideoSummary = {
  total: number
  public: number
  private: number
  scheduled: number
  deleted: number
}

export type DashboardVisitorChartRow = {
  label: string
  visitCount: number
}

export type DashboardVisitorsSummary = {
  todayTotal: number
  todayDirect: number
  todayShareLink: number
  visitorChart: DashboardVisitorChartRow[]
}

export type DashboardSummaryResult = {
  members?: DashboardMembersSummary
  inquiries?: DashboardInquiriesSummary
  memberMgmt?: DashboardMemberMgmtSummary
  article?: DashboardArticleSummary
  video?: DashboardVideoSummary
  seminar?: DashboardVideoSummary
  /** null이면 방문 집계 테이블 미적용·오류 등 */
  visitors?: DashboardVisitorsSummary | null
}

function unwrapResult<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  const inde = d?.IndeAPIResponse as Record<string, unknown> | undefined
  if (inde?.Result !== undefined) return inde.Result as T
  if (d?.Result !== undefined) return d.Result as T
  return data as T
}

export async function fetchDashboardSummary(params: {
  asOf: string
  memberGranularity: MemberChartGranularity
  visitorAsOf: string
  visitorGranularity: MemberChartGranularity
}): Promise<DashboardSummaryResult> {
  const { data } = await apiClient.get(BASE, {
    params: {
      asOf: params.asOf,
      memberGranularity: params.memberGranularity,
      visitorAsOf: params.visitorAsOf,
      visitorGranularity: params.visitorGranularity,
    },
  })
  return unwrapResult<DashboardSummaryResult>(data)
}
