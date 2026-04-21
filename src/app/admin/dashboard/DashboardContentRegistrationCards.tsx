'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getUserInfo } from '@/services/auth'
import type { DashboardArticleSummary, DashboardVideoSummary } from '@/services/dashboard'
import { MenuCodes, canReadMenuCode } from '@/lib/adminMenuCodes'

type ContentRegCardProps = {
  title: string
  accentClass: string
  total: number
  rows: readonly { key: string; label: string; value: number }[]
}

function ContentRegCard({ title, accentClass, total, rows }: ContentRegCardProps) {
  return (
    <Card className={cn('overflow-hidden border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md', accentClass)}>
      <CardHeader className="space-y-1 pb-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          액션
        </CardDescription>
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        <div>
          <p className="text-sm text-muted-foreground">총 등록 건수</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {total.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">상태별</p>
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{r.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          목록 화면의 발행·공개 상태 필터와 동일한 기준으로 집계됩니다.
        </p>
      </CardContent>
    </Card>
  )
}

const EMPTY_ARTICLE: DashboardArticleSummary = {
  total: 0,
  draft: 0,
  published: 0,
  private: 0,
  scheduled: 0,
  deleted: 0,
}

const EMPTY_VIDEO: DashboardVideoSummary = {
  total: 0,
  public: 0,
  private: 0,
  scheduled: 0,
  deleted: 0,
}

export type DashboardContentRegistrationCardsProps = {
  article?: DashboardArticleSummary | null
  video?: DashboardVideoSummary | null
  seminar?: DashboardVideoSummary | null
  summaryLoading?: boolean
  summaryError?: string | null
}

export default function DashboardContentRegistrationCards({
  article,
  video,
  seminar,
  summaryLoading = false,
  summaryError = null,
}: DashboardContentRegistrationCardsProps) {
  const user = useMemo(() => getUserInfo(), [])
  const showArticle = user && canReadMenuCode(user, MenuCodes.ARTICLE)
  const showVideo = user && canReadMenuCode(user, MenuCodes.VIDEO)
  const showSeminar = user && canReadMenuCode(user, MenuCodes.SEMINAR)

  if (!user) return null
  if (!showArticle && !showVideo && !showSeminar) return null

  const articleData = article ?? EMPTY_ARTICLE
  const videoData = video ?? EMPTY_VIDEO
  const seminarData = seminar ?? EMPTY_VIDEO

  const articleRows = [
    { key: 'draft', label: '임시저장', value: articleData.draft },
    { key: 'published', label: '공개', value: articleData.published },
    { key: 'private', label: '비공개', value: articleData.private },
    { key: 'scheduled', label: '예약 발행', value: articleData.scheduled },
    { key: 'deleted', label: '삭제', value: articleData.deleted },
  ] as const

  const videoRows = [
    { key: 'public', label: '공개', value: videoData.public },
    { key: 'private', label: '비공개', value: videoData.private },
    { key: 'scheduled', label: '예약', value: videoData.scheduled },
    { key: 'deleted', label: '삭제대기', value: videoData.deleted },
  ] as const

  const seminarRows = [
    { key: 'public', label: '공개', value: seminarData.public },
    { key: 'private', label: '비공개', value: seminarData.private },
    { key: 'scheduled', label: '예약', value: seminarData.scheduled },
    { key: 'deleted', label: '삭제대기', value: seminarData.deleted },
  ] as const

  return (
    <section className="space-y-4" aria-label="콘텐츠 등록 현황">
      <h2 className="text-sm font-semibold text-foreground">콘텐츠 등록 현황</h2>
      {summaryError ? <p className="text-sm text-destructive">{summaryError}</p> : null}
      {summaryLoading ? <p className="text-sm text-muted-foreground">집계를 불러오는 중입니다…</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {showArticle ? (
          <ContentRegCard
            title="아티클 등록현황"
            accentClass="border-l-sky-600"
            total={articleData.total}
            rows={articleRows}
          />
        ) : null}
        {showVideo ? (
          <ContentRegCard
            title="비디오 등록현황"
            accentClass="border-l-violet-600"
            total={videoData.total}
            rows={videoRows}
          />
        ) : null}
        {showSeminar ? (
          <ContentRegCard
            title="세미나 등록현황"
            accentClass="border-l-indigo-600"
            total={seminarData.total}
            rows={seminarRows}
          />
        ) : null}
      </div>
    </section>
  )
}
