'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { listDisplayEvents, deleteDisplayEvent } from '@/services/displayEvent'
import type { DisplayEventHeroItem } from '@/types/displayEvent'
import {
  DISPLAY_CONTENT_TYPE_PARENT,
  DISPLAY_EVENT_TYPE_PARENT,
  createSysCodeOptions,
  fetchSysCodeByParent,
  getSysCodeName,
  type SysCodeItem,
} from '@/lib/syscode'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ListPagination } from '@/components/admin/ListPagination'
import { cn } from '@/lib/utils'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

const PAGE_SIZE = 20
const EVENT_TYPE_FILTER_ALL = '__all__'
const TH = ADMIN_CONTENT_TABLE_HEAD_TH

const COL_ID = 'w-16 min-w-16 max-w-16 px-2'
const COL_THUMB = 'w-[88px] min-w-[88px] max-w-[88px] px-2'
const COL_TITLE = 'min-w-0 px-3'
const COL_EVENT_TYPE = 'w-[132px] min-w-[132px] max-w-[132px] px-2'
const COL_CONTENT = 'w-[140px] min-w-[140px] max-w-[140px] px-2'
const COL_ORDER = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
const COL_ACTIVE = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
const COL_ACTIONS = 'w-20 min-w-20 max-w-20 px-0.5'

function bannerPreviewUrl(row: DisplayEventHeroItem): string | null {
  const direct = row.imageUrl?.trim()
  if (direct) return direct
  const thumb = row.content?.thumbnail?.trim()
  return thumb || null
}

function BannerThumbCell({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false)
  if (!url || broken) {
    return (
      <div className="h-11 w-[5.5rem] shrink-0 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
        없음
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className="h-11 w-[5.5rem] shrink-0 rounded border object-cover bg-gray-100"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

export default function DisplayEventsListPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<DisplayEventHeroItem[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DisplayEventHeroItem | null>(null)
  const [eventTypeCodes, setEventTypeCodes] = useState<SysCodeItem[]>([])
  const [contentTypeCodes, setContentTypeCodes] = useState<SysCodeItem[]>([])
  const [eventTypeFilter, setEventTypeFilter] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await listDisplayEvents({
        page,
        page_size: PAGE_SIZE,
        ...(eventTypeFilter.trim() ? { eventTypeCode: eventTypeFilter.trim() } : {}),
      })
      setRows(res.results)
      setCount(res.count)
    } catch (e: unknown) {
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '목록을 불러오지 못했습니다.',
        variant: 'destructive',
      })
      setRows([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, toast, eventTypeFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [et, ct] = await Promise.all([
          fetchSysCodeByParent(DISPLAY_EVENT_TYPE_PARENT),
          fetchSysCodeByParent(DISPLAY_CONTENT_TYPE_PARENT),
        ])
        setEventTypeCodes(et)
        setContentTypeCodes(ct)
      } catch (e: unknown) {
        toast({
          title: '시스템 코드',
          description: e instanceof Error ? e.message : '코드 이름을 불러오지 못했습니다.',
          variant: 'destructive',
        })
      }
    })()
  }, [toast])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const eventTypeSelectOptions = createSysCodeOptions(eventTypeCodes)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDisplayEvent(deleteTarget.displayEventId)
      toast({ title: '삭제됨', description: '이벤트 베너가 삭제되었습니다.' })
      setDeleteOpen(false)
      setDeleteTarget(null)
      void load()
    } catch (e: unknown) {
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '삭제 실패',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-2 relative">
      {/* 필터/툴바 — defaultUxUiListPlan.md 규격 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 flex justify-between">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 md:col-span-2 lg:col-span-2">
            <Label
              htmlFor="display-event-type-filter"
              className="whitespace-nowrap text-sm font-medium text-gray-700"
              style={{ minWidth: 'fit-content' }}
            >
              이벤트 유형
            </Label>
            <Select
              value={eventTypeFilter || EVENT_TYPE_FILTER_ALL}
              onValueChange={(v) => {
                setEventTypeFilter(v === EVENT_TYPE_FILTER_ALL ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger id="display-event-type-filter" className="h-9 min-w-[12rem]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVENT_TYPE_FILTER_ALL}>전체</SelectItem>
                {eventTypeSelectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
     
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              새로고침
            </Button>
            <Link href="/admin/display-events/new">
              <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                새 이벤트 배너
              </Button>
            </Link>
          </div>

      </div>

      {/* 테이블 — defaultUxUiListPlan.md 규격 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {eventTypeFilter.trim() ? '선택한 이벤트 유형에 해당하는 항목이 없습니다.' : '등록된 항목이 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-16" />
                <col className="w-[88px]" />
                <col />
                <col className="w-[132px]" />
                <col className="w-[140px]" />
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-20" />
              </colgroup>
              <thead className="border-b border-white/15 bg-[#03213b] text-[#fff] text-sm shadow-sm bg-muted text-muted-foreground rounded-t-md h-12">
                <tr>
                  <th className={cn(TH, COL_ID, 'text-center')}>ID</th>
                  <th className={cn(TH, COL_THUMB, 'text-center')}>이미지</th>
                  <th className={cn(TH, COL_TITLE, 'text-left normal-case')}>제목</th>
                  <th className={cn(TH, COL_EVENT_TYPE, 'text-center normal-case')}>이벤트 유형</th>
                  <th className={cn(TH, COL_CONTENT, 'text-center normal-case')}>콘텐츠</th>
                  <th className={cn(TH, COL_ORDER, 'text-center normal-case')}>순서</th>
                  <th className={cn(TH, COL_ACTIVE, 'text-center')}>활성</th>
                  <th className={cn(TH, COL_ACTIONS, 'text-center')}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rows.map((r) => (
                  <tr key={r.displayEventId} className="hover:bg-gray-50">
                    <td className={cn(COL_ID, 'py-3 align-middle text-center text-sm text-gray-600 tabular-nums')}>
                      {r.displayEventId}
                    </td>
                    <td className={cn(COL_THUMB, 'py-3 align-middle')}>
                      <div className="flex justify-center">
                        <BannerThumbCell url={bannerPreviewUrl(r)} />
                      </div>
                    </td>
                    <td className={cn(COL_TITLE, 'py-3 align-middle text-left text-sm text-gray-900')}>
                      <Link
                        href={`/admin/display-events/edit?id=${r.displayEventId}`}
                        className="block w-full truncate font-medium text-[#000] no-underline hover:text-[#000] hover:no-underline"
                        title={(r.title || r.content?.title || '—') + ' — 수정'}
                      >
                        {r.title || r.content?.title || '—'}
                      </Link>
                    </td>
                    <td className={cn(COL_EVENT_TYPE, 'py-3 align-middle text-center text-sm text-gray-600')}>
                      {getSysCodeName(eventTypeCodes, r.eventTypeCode)}
                    </td>
                    <td className={cn(COL_CONTENT, 'py-3 align-middle text-center text-sm text-gray-600')}>
                      <span className="block">{getSysCodeName(contentTypeCodes, r.contentTypeCode)}</span>
                      {r.contentId != null ? (
                        <span className="block text-xs text-gray-500 tabular-nums">ID {r.contentId}</span>
                      ) : null}
                    </td>
                    <td className={cn(COL_ORDER, 'py-3 align-middle text-center text-sm text-gray-600 tabular-nums')}>
                      {r.displayOrder ?? '—'}
                    </td>
                    <td className={cn(COL_ACTIVE, 'py-3 align-middle text-center')}>
                      {r.isActive === false ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">N</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Y</span>
                      )}
                    </td>
                    <td className={cn(COL_ACTIONS, 'py-2 align-middle text-center')}>
                      <div className="flex items-center justify-center gap-0">
                        <Button variant="ghost" size="icon" asChild title="수정" className="h-6 w-6 shrink-0 p-0">
                          <Link href={`/admin/display-events/edit?id=${r.displayEventId}`}>
                            <Pencil className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="삭제"
                          className="h-6 w-6 shrink-0 p-0 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setDeleteTarget(r)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > 0 ? (
          <ListPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={count}
            disabled={loading}
          />
        ) : null}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              ID {deleteTarget?.displayEventId} 항목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => void confirmDelete()}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
