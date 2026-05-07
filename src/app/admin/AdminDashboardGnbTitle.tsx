'use client'

import { LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

function todayLabel(): string {
  return new Date().toLocaleDateString('ko-KR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AdminDashboardGnbTitle({
  displayName,
  className,
}: {
  displayName: string
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">대시보드</h1>
        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
          <LayoutDashboard className="h-3 w-3 shrink-0" />
          <span className="truncate">오늘 기준 · {todayLabel()}</span>
        </span>
        {process.env.NODE_ENV === 'development' ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            개발
          </span>
        ) : null}
      </div>
    </div>
  )
}
