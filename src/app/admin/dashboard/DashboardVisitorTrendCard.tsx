'use client'

import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getUserInfo } from '@/services/auth'
import type { DashboardVisitorChartRow, MemberChartGranularity } from '@/services/dashboard'

const ACCENT_VISITOR = '#EA90FF'

export type VisitorTrendGranularity = MemberChartGranularity

export type VisitorTrendRow = {
  label: string
  visitCount: number
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

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

function seriesByDay(count: number, anchor: Date): VisitorTrendRow[] {
  const end = startOfLocalDay(anchor)
  const rows: VisitorTrendRow[] = []
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(end)
    x.setDate(end.getDate() - i)
    const label = `${x.getMonth() + 1}/${x.getDate()}`
    rows.push({ label, visitCount: 0 })
  }
  return rows
}

function seriesByWeek(count: number, anchor: Date): VisitorTrendRow[] {
  const rows: VisitorTrendRow[] = []
  const a = startOfLocalDay(anchor)
  const dow = a.getDay()
  const toMonday = dow === 0 ? -6 : 1 - dow
  a.setDate(a.getDate() + toMonday)
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(a)
    x.setDate(a.getDate() - i * 7)
    const label = `${x.getMonth() + 1}/${x.getDate()}`
    rows.push({ label, visitCount: 0 })
  }
  return rows
}

function seriesByMonth(count: number, anchor: Date): VisitorTrendRow[] {
  const end = startOfLocalDay(anchor)
  const rows: VisitorTrendRow[] = []
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const label = `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}`
    rows.push({ label, visitCount: 0 })
  }
  return rows
}

function dataForGranularity(g: VisitorTrendGranularity, anchor: Date): VisitorTrendRow[] {
  if (g === 'day') return seriesByDay(14, anchor)
  if (g === 'week') return seriesByWeek(12, anchor)
  return seriesByMonth(12, anchor)
}

function chartSubtitle(g: VisitorTrendGranularity, asOfYmd: string): string {
  const head = `기준일 ${asOfYmd}`
  if (g === 'day') return `${head} · 해당일까지 14일 구간 합계(이벤트 건수)`
  if (g === 'week') return `${head} · 해당일이 속한 주(월요일 시작)까지 12주 구간 합계`
  return `${head} · 해당 월까지 12개월 구간 합계`
}

function chartTitle(g: VisitorTrendGranularity): string {
  if (g === 'day') return '일별 전체 방문자 추이'
  if (g === 'week') return '주간별 전체 방문자 추이'
  return '월별 전체 방문자 추이'
}

function toVisitorRows(server: DashboardVisitorChartRow[] | null | undefined): VisitorTrendRow[] | null {
  if (!server || server.length === 0) return null
  return server.map((r) => ({ label: r.label, visitCount: r.visitCount }))
}

export type DashboardVisitorTrendCardProps = {
  granularity: VisitorTrendGranularity
  asOfYmd: string
  onGranularityChange: (g: VisitorTrendGranularity) => void
  onAsOfYmdChange: (ymd: string) => void
  serverChart: DashboardVisitorChartRow[] | null
  summaryLoading: boolean
}

export default function DashboardVisitorTrendCard({
  granularity,
  asOfYmd,
  onGranularityChange,
  onAsOfYmdChange,
  serverChart,
  summaryLoading,
}: DashboardVisitorTrendCardProps) {
  const user = useMemo(() => getUserInfo(), [])

  const anchor = useMemo(() => parseLocalYmd(asOfYmd) ?? startOfLocalDay(new Date()), [asOfYmd])

  const chartData = useMemo(() => {
    const fromApi = toVisitorRows(serverChart)
    if (fromApi) return fromApi
    return dataForGranularity(granularity, anchor)
  }, [serverChart, granularity, anchor])

  if (!user) return null

  return (
    <section className="space-y-2" aria-label="방문자 추이">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">방문자 추이</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex min-h-[120px]">
          <div className="w-1.5 shrink-0" style={{ backgroundColor: ACCENT_VISITOR }} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col px-5 py-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{chartTitle(granularity)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{chartSubtitle(granularity, asOfYmd)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="visitor-trend-asof" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                    기준일
                  </label>
                  <Input
                    id="visitor-trend-asof"
                    type="date"
                    value={asOfYmd}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v) onAsOfYmdChange(v)
                    }}
                    className="h-9 w-[10.5rem] shrink-0 cursor-pointer text-sm"
                    aria-label="방문자 추이 차트 기준일"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 px-3 text-xs"
                    onClick={() => onAsOfYmdChange(formatLocalYmd(new Date()))}
                  >
                    오늘
                  </Button>
                </div>
                <div
                  className="inline-flex gap-0.5 self-start rounded-md border border-border bg-muted/40 p-0.5 sm:self-auto"
                  role="tablist"
                  aria-label="방문자 추이 단위"
                >
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="tab"
                      aria-selected={granularity === g}
                      onClick={() => onGranularityChange(g)}
                      className={cn(
                        'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                        granularity === g
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
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={`${granularity}-${asOfYmd}`}
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#737373' }}
                    axisLine={{ stroke: '#e5e5e5' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 11, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(115, 115, 115, 0.25)', strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e5e5',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()}회`, '전체 방문']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitCount"
                    name="전체 방문"
                    stroke={ACCENT_VISITOR}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ACCENT_VISITOR, stroke: '#fff', strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {summaryLoading
                ? '집계를 불러오는 중입니다…'
                : 'www 루트에서 전송한 사이트 방문 이벤트 기준입니다. 라이브러리 상세 조회수와 다를 수 있습니다.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
