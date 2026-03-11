'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_GROUP_SIZE = 10

export interface ListPaginationProps {
  /** 현재 페이지 (1-based) */
  currentPage: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 페이지 변경 시 호출 */
  onPageChange: (page: number) => void
  /** 전체 건수 (선택, "총 N건" 표시용) */
  total?: number
  /** 비활성화 시 (로딩 중 등) */
  disabled?: boolean
  /** 추가 className (컨테이너) */
  className?: string
}

/**
 * 관리자 리스트 공통 페이지네이션 (_docsRules/backend/listPageRules.md)
 * [<<] [<] [1 2 3 ... 10] [>] [>>], 10개 단위 그룹
 */
export function ListPagination({
  currentPage,
  totalPages,
  onPageChange,
  total,
  disabled = false,
  className,
}: ListPaginationProps) {
  if (totalPages <= 0) return null

  const pageGroup = Math.ceil(currentPage / PAGE_GROUP_SIZE)
  const startPage = (pageGroup - 1) * PAGE_GROUP_SIZE + 1
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages)
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  )

  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-6 py-4 border-t bg-gray-50/50',
        className
      )}
    >
      <p className="text-sm text-gray-600">
        {total != null && (
          <>
            총 <span className="font-medium">{total.toLocaleString()}</span>건
            {totalPages > 0 && (
              <>
                {' '}
                · {currentPage} / {totalPages} 페이지
              </>
            )}
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        {/* << 처음으로 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || isFirst}
          onClick={() => onPageChange(1)}
          title="처음 페이지"
          aria-label="처음 페이지"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* < 이전 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || isFirst}
          onClick={() => onPageChange(currentPage - 1)}
          title="이전 페이지"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 페이지 번호들 */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p) => (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'outline'}
              size="sm"
              className="h-8 min-w-8 px-2"
              disabled={disabled}
              onClick={() => onPageChange(p)}
              aria-label={`${p}페이지`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </Button>
          ))}
        </div>

        {/* > 다음 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || isLast}
          onClick={() => onPageChange(currentPage + 1)}
          title="다음 페이지"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* >> 맨끝으로 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || isLast}
          onClick={() => onPageChange(totalPages)}
          title="마지막 페이지"
          aria-label="마지막 페이지"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
