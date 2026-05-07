'use client'

import { cn } from '@/lib/utils'

export default function AdminPageGnbHeading({
  title,
  subtitle,
  className,
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
      {subtitle ? (
        <p className="max-w-3xl text-xs leading-snug text-muted-foreground sm:text-sm">{subtitle}</p>
      ) : null}
    </div>
  )
}
