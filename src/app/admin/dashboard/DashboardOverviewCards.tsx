'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getUserInfo } from '@/services/auth'
import type {
  DashboardInquiriesSummary,
  DashboardMemberMgmtSummary,
  DashboardMembersSummary,
  DashboardVisitorsSummary,
  MemberChartGranularity,
} from '@/services/dashboard'
import { MenuCodes, canReadMenuCode } from '@/lib/adminMenuCodes'
import { getAligoRemain } from '@/services/messages'

export type { MemberChartGranularity }

const ACCENT_MEMBER = '#171717'
/** 월별 차트 — 탈퇴 막대 색 (가입은 ACCENT_MEMBER) */
const CHART_WITHDRAW_FILL = '#e11d48'
const ACCENT_VISITOR = '#EA90FF'
const ACCENT_MEMBER_MGMT = '#FF75E1'
/** 알리고 카드 — 파스텔 톤(강한 대비 최소화) */
const ACCENT_ALIGO_BAR = '#ddd5f5'
const ACCENT_ALIGO_COUNT = '#c9a0a8'

export type MemberChartRow = {
  label: string
  joinCount: number
  withdrawCount: number
}

/** @deprecated MemberChartRow 사용 */
export type MonthlyMemberChartRow = MemberChartRow

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** `YYYY-MM-DD` 로컬 자정 기준 파싱, 실패 시 null */
function parseLocalYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return startOfLocalDay(dt)
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** 기준일(포함)까지 거슬러 `count`일 — 라벨 M/D */
function memberChartSeriesByDay(count: number, anchor: Date): MemberChartRow[] {
  const rows: MemberChartRow[] = []
  const end = startOfLocalDay(anchor)
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(end)
    x.setDate(end.getDate() - i)
    const label = `${x.getMonth() + 1}/${x.getDate()}`
    rows.push({ label, joinCount: 0, withdrawCount: 0 })
  }
  return rows
}

/** 기준일이 속한 주의 월요일을 마지막 주로, 그 전 `count - 1`주 — 라벨 M/D */
function memberChartSeriesByWeek(count: number, anchor: Date): MemberChartRow[] {
  const rows: MemberChartRow[] = []
  const a = startOfLocalDay(anchor)
  const dow = a.getDay()
  const toMonday = dow === 0 ? -6 : 1 - dow
  a.setDate(a.getDate() + toMonday)
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(a)
    x.setDate(a.getDate() - i * 7)
    const label = `${x.getMonth() + 1}/${x.getDate()}`
    rows.push({ label, joinCount: 0, withdrawCount: 0 })
  }
  return rows
}

/** 기준일이 속한 달을 마지막 달로, 그 전 11개월(총 12개월) — 라벨 YYYY.MM */
function memberChartSeriesByMonth(count: number, anchor: Date): MemberChartRow[] {
  const end = startOfLocalDay(anchor)
  const rows: MemberChartRow[] = []
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const label = `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}`
    rows.push({ label, joinCount: 0, withdrawCount: 0 })
  }
  return rows
}

function memberChartDataForGranularity(g: MemberChartGranularity, anchor: Date): MemberChartRow[] {
  if (g === 'day') return memberChartSeriesByDay(14, anchor)
  if (g === 'week') return memberChartSeriesByWeek(12, anchor)
  return memberChartSeriesByMonth(12, anchor)
}

function memberChartSubtitle(g: MemberChartGranularity, asOfYmd: string): string {
  const head = `기준일 ${asOfYmd}`
  if (g === 'day') return `${head} · 해당일까지 14일 · 막대: 가입(진한색) · 탈퇴(붉은색)`
  if (g === 'week') return `${head} · 해당일이 속한 주(월요일 시작)까지 12주 · 막대: 가입 · 탈퇴`
  return `${head} · 해당 월까지 12개월 · 막대: 가입 · 탈퇴`
}

function memberChartTitle(g: MemberChartGranularity): string {
  if (g === 'day') return '일별 가입·탈퇴'
  if (g === 'week') return '주간별 가입·탈퇴'
  return '월별 가입·탈퇴'
}

export type DashboardOverviewCardsProps = {
  memberChartGranularity: MemberChartGranularity
  memberChartAsOfYmd: string
  onMemberChartGranularityChange: (g: MemberChartGranularity) => void
  onMemberChartAsOfYmdChange: (ymd: string) => void
  membersSummary?: DashboardMembersSummary | null
  inquiriesSummary?: DashboardInquiriesSummary | null
  memberMgmtSummary?: DashboardMemberMgmtSummary | null
  visitorsSummary?: DashboardVisitorsSummary | null
  summaryLoading?: boolean
  summaryError?: string | null
}

export default function DashboardOverviewCards({
  memberChartGranularity,
  memberChartAsOfYmd,
  onMemberChartGranularityChange,
  onMemberChartAsOfYmdChange,
  membersSummary,
  inquiriesSummary,
  memberMgmtSummary,
  visitorsSummary,
  summaryLoading = false,
  summaryError = null,
}: DashboardOverviewCardsProps) {
  const user = useMemo(() => getUserInfo(), [])
  const showMember = user && canReadMenuCode(user, MenuCodes.PUBLIC_MEMBERS)
  const showVisitor = !!user
  const showMemberMgmt =
    user &&
    (canReadMenuCode(user, MenuCodes.PUBLIC_MEMBERS) ||
      canReadMenuCode(user, MenuCodes.INQUIRY))
  const showAligo = !!(user && canReadMenuCode(user, MenuCodes.SMS_KAKAO_SEND))
  const canLinkInquiries = user && canReadMenuCode(user, MenuCodes.INQUIRY)

  const [aligoSmsRemain, setAligoSmsRemain] = useState<number | null>(null)
  const [aligoRemainLoaded, setAligoRemainLoaded] = useState(false)

  useEffect(() => {
    if (!showAligo) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await getAligoRemain()
        if (!cancelled) setAligoSmsRemain(data.sms_cnt)
      } catch {
        if (!cancelled) setAligoSmsRemain(null)
      } finally {
        if (!cancelled) setAligoRemainLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showAligo])
  const memberChartAnchor = useMemo(() => {
    return parseLocalYmd(memberChartAsOfYmd) ?? startOfLocalDay(new Date())
  }, [memberChartAsOfYmd])

  const serverChart = membersSummary?.memberChart
  const memberChartData = useMemo(() => {
    if (serverChart && serverChart.length > 0) return serverChart
    return memberChartDataForGranularity(memberChartGranularity, memberChartAnchor)
  }, [serverChart, memberChartGranularity, memberChartAnchor])

  const totalMembers = membersSummary?.totalActive ?? 0
  const totalWithdrawn = membersSummary?.totalWithdrawn ?? 0
  const todayNewMembers = membersSummary?.todayNew ?? 0
  const todayWithdrawn = membersSummary?.todayWithdrawn ?? 0
  const unansweredInquiries = memberMgmtSummary?.unansweredInquiries ?? inquiriesSummary?.unanswered ?? 0
  const todayLoginMemberCount = memberMgmtSummary?.todayLoginMemberCount ?? 0
  const todayVisits = visitorsSummary?.todayTotal
  const todayGeneralVisits = visitorsSummary?.todayDirect
  const todayShareLinkVisits = visitorsSummary?.todayShareLink

  const overviewRowGridClass = useMemo(() => {
    if (showVisitor && showAligo && showMemberMgmt) return 'md:grid-cols-8'
    if (showVisitor && showMemberMgmt) return 'md:grid-cols-6'
    if (showVisitor && showAligo) return 'md:grid-cols-4'
    return 'md:grid-cols-1'
  }, [showVisitor, showAligo, showMemberMgmt])

  const visitorColClass = useMemo(() => {
    if (showVisitor && showAligo && showMemberMgmt) return 'md:col-span-2'
    if (showVisitor && showMemberMgmt && !showAligo) return 'md:col-span-2'
    if (showVisitor && showAligo && !showMemberMgmt) return 'md:col-span-2'
    return ''
  }, [showVisitor, showAligo, showMemberMgmt])

  const aligoColClass = useMemo(() => {
    if (showVisitor && showAligo && showMemberMgmt) return 'md:col-span-2'
    if (showVisitor && showAligo && !showMemberMgmt) return 'md:col-span-2'
    return ''
  }, [showVisitor, showAligo, showMemberMgmt])

  const memberColClass = useMemo(() => {
    if (showVisitor && showAligo && showMemberMgmt) return 'md:col-span-4'
    if (showVisitor && showMemberMgmt) return 'md:col-span-4'
    return ''
  }, [showVisitor, showAligo, showMemberMgmt])

  if (!user) return null

  return (
    <section className="space-y-8" aria-label="회원·방문·문의 요약">
      {showMember ? (
        <div>
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">회원 현황</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex min-h-[140px]">
              <div className="w-1.5 shrink-0" style={{ backgroundColor: ACCENT_MEMBER }} aria-hidden />
              <div className="flex flex-1 flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:gap-8">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                    <span>총 회원수(탈퇴회원 제외)</span>
                    <span className="text-muted-foreground/60" aria-hidden>
                      /
                    </span>
                    <span>총 탈퇴회원수</span>
                  </p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                    <span>{totalMembers.toLocaleString()}</span>
                    <span className="text-3xl font-semibold text-muted-foreground/80" aria-hidden>
                      /
                    </span>
                    <span>{totalWithdrawn.toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 text-right md:min-w-[220px]">
                  <div className="flex items-center justify-end gap-6 text-sm">
                    <span className="text-muted-foreground">오늘 신규 회원</span>
                    <span className="min-w-[2.5rem] font-semibold tabular-nums text-foreground">
                      {todayNewMembers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-6 text-sm">
                    <span className="text-muted-foreground">오늘 탈퇴 회원</span>
                    <span className="min-w-[2.5rem] font-semibold tabular-nums text-foreground">
                      {todayWithdrawn.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border px-5 py-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{memberChartTitle(memberChartGranularity)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {memberChartSubtitle(memberChartGranularity, memberChartAsOfYmd)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="member-chart-asof" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                      기준일
                    </label>
                    <Input
                      id="member-chart-asof"
                      type="date"
                      value={memberChartAsOfYmd}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v) onMemberChartAsOfYmdChange(v)
                      }}
                      className="h-9 w-[10.5rem] shrink-0 cursor-pointer text-sm"
                      aria-label="가입·탈퇴 차트 기준일"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 px-3 text-xs"
                      onClick={() => onMemberChartAsOfYmdChange(formatLocalYmd(new Date()))}
                    >
                      오늘
                    </Button>
                  </div>
                  <div
                    className="inline-flex gap-0.5 self-start rounded-md border border-border bg-muted/40 p-0.5 sm:self-auto"
                    role="tablist"
                    aria-label="가입·탈퇴 차트 단위"
                  >
                    {(['day', 'week', 'month'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="tab"
                        aria-selected={memberChartGranularity === g}
                        onClick={() => onMemberChartGranularityChange(g)}
                        className={cn(
                          'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                          memberChartGranularity === g
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {g === 'day' ? '일별' : g === 'week' ? '주간별' : '월별'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={`${memberChartGranularity}-${memberChartAsOfYmd}`}
                    data={memberChartData}
                    margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                    barGap={0}
                    barCategoryGap={memberChartGranularity === 'day' ? '12%' : '18%'}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12, paddingBottom: 4 }} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#737373' }}
                      axisLine={{ stroke: '#e5e5e5' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={40}
                      tick={{ fontSize: 11, fill: '#737373' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(115, 115, 115, 0.12)' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e5e5e5',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => [`${value}명`, name]}
                    />
                    <Bar
                      dataKey="joinCount"
                      name="가입"
                      legendType="rect"
                      fill={ACCENT_MEMBER}
                      radius={[3, 0, 0, 3]}
                      maxBarSize={26}
                      minPointSize={4}
                    />
                    <Bar
                      dataKey="withdrawCount"
                      name="탈퇴"
                      legendType="rect"
                      fill={CHART_WITHDRAW_FILL}
                      radius={[0, 3, 3, 0]}
                      maxBarSize={26}
                      minPointSize={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {summaryError ? (
                <p className="mt-2 text-xs text-destructive">{summaryError}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {summaryLoading
                    ? '집계를 불러오는 중입니다…'
                    : '서버 기준 집계입니다. 방문은 www 첫 로드 이벤트 기준입니다.'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {(showVisitor || showMemberMgmt || showAligo) && (
        <div className={cn('grid items-stretch gap-8', overviewRowGridClass)}>
          {showVisitor ? (
            <div className={cn('flex h-full min-h-0 flex-col', visitorColClass)}>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">방문자 현황</h2>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex min-h-[140px] flex-1">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: ACCENT_VISITOR }} aria-hidden />
                  <div className="flex flex-1 flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:gap-8">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">오늘 방문 수</p>
                      <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                        {summaryLoading ? '—' : (todayVisits ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-4 text-right md:min-w-[240px]">
                      <div>
                        <div className="flex items-center justify-end gap-6 text-sm">
                          <span className="text-muted-foreground">일반 접속</span>
                          <span className="min-w-[2.5rem] font-semibold tabular-nums text-foreground">
                            {summaryLoading ? '—' : (todayGeneralVisits ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">일반 유입(direct) 이벤트 건수</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-end gap-6 text-sm">
                          <span className="text-muted-foreground">공유 링크 접속</span>
                          <span className="min-w-[2.5rem] font-semibold tabular-nums text-foreground">
                            {summaryLoading ? '—' : (todayShareLinkVisits ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          공유 링크 유입(from_share·ref=share) 이벤트 건수
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showAligo ? (
            <div className={cn('flex h-full min-h-0 flex-col', aligoColClass)}>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">알리고 잔여 문자량</h2>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex min-h-[140px] flex-1">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: ACCENT_ALIGO_BAR }} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">잔여 SMS</p>
                        <p
                          className="mt-1 text-4xl font-bold tabular-nums tracking-tight"
                          style={{ color: ACCENT_ALIGO_COUNT }}
                        >
                          {!aligoRemainLoaded ? '—' : aligoSmsRemain !== null ? aligoSmsRemain.toLocaleString('ko-KR') : '—'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-violet-200/90 bg-violet-50/80 text-violet-700 shadow-none hover:bg-violet-100/90 hover:text-violet-800"
                        onClick={() => window.open('https://www.aligo.in', '_blank', 'noopener,noreferrer')}
                      >
                        충전하기
                        <ExternalLink className="ml-1 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      알리고 API 기준 ·{' '}
                      <Link
                        href="/admin/messages/sms/send"
                        className="font-medium text-violet-500/70 underline-offset-2 hover:text-violet-600/80 hover:underline"
                      >
                        문자 전송 화면
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showMemberMgmt ? (
            <div className={cn('flex h-full min-h-0 flex-col', memberColClass)}>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">회원 관리</h2>
              {canLinkInquiries ? (
                <Link
                  href="/admin/board/inquiries"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <MemberMgmtCardBody
                    linkable
                    todayLoginMemberCount={todayLoginMemberCount}
                    unansweredCount={unansweredInquiries}
                    summaryLoading={summaryLoading}
                  />
                </Link>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <MemberMgmtCardBody
                    todayLoginMemberCount={todayLoginMemberCount}
                    unansweredCount={unansweredInquiries}
                    summaryLoading={summaryLoading}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function MemberMgmtCardBody({
  linkable = false,
  todayLoginMemberCount,
  unansweredCount,
  summaryLoading,
}: {
  linkable?: boolean
  todayLoginMemberCount: number
  unansweredCount: number
  summaryLoading: boolean
}) {
  return (
    <div className="flex min-h-[140px] flex-1">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: ACCENT_MEMBER_MGMT }} aria-hidden />
      <div className="grid flex-1 grid-cols-1 gap-6 p-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border">
        <div className="min-w-0 md:pr-5">
          <p className="text-sm text-muted-foreground">오늘 로그인</p>
          <p
            className="mt-1 text-4xl font-bold tabular-nums tracking-tight"
            style={{ color: ACCENT_MEMBER_MGMT }}
          >
            {summaryLoading ? '—' : todayLoginMemberCount.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            오늘 <span className="font-medium text-foreground/80">last_login</span>이 갱신된 회원 수(같은 날 여러 번 로그인해도 1명)
          </p>
        </div>
        <div className="min-w-0 md:pl-5">
          <p className="text-sm text-muted-foreground">1:1 문의</p>
          <p
            className="mt-1 text-4xl font-bold tabular-nums tracking-tight"
            style={{ color: ACCENT_MEMBER_MGMT }}
          >
            {summaryLoading ? '—' : unansweredCount.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            답변이 등록되지 않은 1:1 문의 수
            {linkable ? ' · 카드 클릭 시 문의 목록' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
