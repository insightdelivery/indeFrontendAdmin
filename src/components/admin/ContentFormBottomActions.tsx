'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ContentFormBottomActionsProps = {
  children: ReactNode
  className?: string
}

/**
 * 콘텐츠 등록·수정 폼 상단 우측과 동일한 액션을 폼 맨 아래에 한 번 더 둘 때 사용.
 */
export function ContentFormBottomActions({ children, className }: ContentFormBottomActionsProps) {
  return (
    <div
      className={cn(
        'mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end sm:gap-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
