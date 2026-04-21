'use client'

import { isAxiosError } from 'axios'
import { LayoutDashboard } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import DashboardContentRegistrationCards from './dashboard/DashboardContentRegistrationCards'
import DashboardOverviewCards from './dashboard/DashboardOverviewCards'
import DashboardVisitorTrendCard from './dashboard/DashboardVisitorTrendCard'
import { getUserInfo } from '@/services/auth'
import type { DashboardSummaryResult, MemberChartGranularity } from '@/services/dashboard'
import { fetchDashboardSummary, formatLocalYmd } from '@/services/dashboard'

function todayLabel(): string {
  return new Date().toLocaleDateString('ko-KR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function dashboardErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as Record<string, unknown> | undefined
    const inde = body?.IndeAPIResponse as Record<string, unknown> | undefined
    const msg = inde?.Message
    if (typeof msg === 'string' && msg.trim()) return msg
    if (err.message) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return '대시보드 집계를 불러오지 못했습니다.'
}

export default function AdminDashboardClient() {
  const user = useMemo(() => getUserInfo(), [])
  const displayName = user?.memberShipName?.trim() || user?.memberShipId || '관리자'

  const [memberChartGranularity, setMemberChartGranularity] = useState<MemberChartGranularity>('month')
  const [memberChartAsOfYmd, setMemberChartAsOfYmd] = useState(() => formatLocalYmd(new Date()))
  const [visitorGranularity, setVisitorGranularity] = useState<MemberChartGranularity>('month')
  const [visitorAsOfYmd, setVisitorAsOfYmd] = useState(() => formatLocalYmd(new Date()))
  const [summary, setSummary] = useState<DashboardSummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setSummaryLoading(true)
    setSummaryError(null)
    fetchDashboardSummary({
      asOf: memberChartAsOfYmd,
      memberGranularity: memberChartGranularity,
      visitorAsOf: visitorAsOfYmd,
      visitorGranularity: visitorGranularity,
    })
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setSummary(null)
          setSummaryError(dashboardErrorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, memberChartAsOfYmd, memberChartGranularity, visitorAsOfYmd, visitorGranularity])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">대시보드</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
              <LayoutDashboard className="h-3 w-3" />
              오늘 기준 · {todayLabel()}
            </span>
            {process.env.NODE_ENV === 'development' ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                개발
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{displayName}</span>님, 요약 지표를 확인하세요. 방문 수는 www
            첫 로드 기준(사이트 이벤트)이며, 회원·콘텐츠 집계는 서버에서 불러옵니다.
          </p>
        </div>
      </div>

      <DashboardOverviewCards
        memberChartGranularity={memberChartGranularity}
        memberChartAsOfYmd={memberChartAsOfYmd}
        onMemberChartGranularityChange={setMemberChartGranularity}
        onMemberChartAsOfYmdChange={setMemberChartAsOfYmd}
        membersSummary={summary?.members ?? null}
        inquiriesSummary={summary?.inquiries ?? null}
        memberMgmtSummary={summary?.memberMgmt ?? null}
        visitorsSummary={summary?.visitors ?? null}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
      />

      <DashboardVisitorTrendCard
        granularity={visitorGranularity}
        asOfYmd={visitorAsOfYmd}
        onGranularityChange={setVisitorGranularity}
        onAsOfYmdChange={setVisitorAsOfYmd}
        serverChart={summary?.visitors?.visitorChart ?? null}
        summaryLoading={summaryLoading}
      />

      <DashboardContentRegistrationCards
        article={summary?.article ?? null}
        video={summary?.video ?? null}
        seminar={summary?.seminar ?? null}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
      />
    </div>
  )
}
