'use client'

import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import DashboardContentRegistrationCards from './dashboard/DashboardContentRegistrationCards'
import DashboardOverviewCards from './dashboard/DashboardOverviewCards'
import DashboardVisitorTrendCard from './dashboard/DashboardVisitorTrendCard'
import { getUserInfo } from '@/services/auth'
import type { DashboardSummaryResult, MemberChartGranularity } from '@/services/dashboard'
import { fetchDashboardSummary, formatLocalYmd } from '@/services/dashboard'

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
    <div className="space-y-8 bg-white rounded-lg p-4 mt-2">
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
