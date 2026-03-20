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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

const PAGE_SIZE = 20
const EVENT_TYPE_FILTER_ALL = '__all__'

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이벤트 베너 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hero 배너 등 노출 행을 관리합니다. (eventBannerPlan)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button asChild size="sm" className="bg-neon-yellow text-black hover:bg-neon-yellow/90">
            <Link href="/admin/display-events/new">
              <Plus className="h-4 w-4 mr-2" />
              등록
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between space-y-0">
          <CardTitle className="text-lg">목록 ({count}건)</CardTitle>
          <div className="flex flex-col gap-1.5 w-full sm:w-64">
            <Label htmlFor="display-event-type-filter" className="text-xs text-muted-foreground">
              이벤트 유형
            </Label>
            <Select
              value={eventTypeFilter || EVENT_TYPE_FILTER_ALL}
              onValueChange={(v) => {
                setEventTypeFilter(v === EVENT_TYPE_FILTER_ALL ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger id="display-event-type-filter" className="h-9">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              {eventTypeFilter.trim()
                ? '선택한 이벤트 유형에 해당하는 항목이 없습니다.'
                : '등록된 항목이 없습니다.'}
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium w-16">ID</th>
                    <th className="text-left p-3 font-medium w-[6.5rem]">이미지</th>
                    <th className="text-left p-3 font-medium">제목</th>
                    <th className="text-left p-3 font-medium min-w-[7rem]">이벤트 유형</th>
                    <th className="text-left p-3 font-medium min-w-[8rem]">콘텐츠</th>
                    <th className="text-left p-3 font-medium w-20">순서</th>
                    <th className="text-left p-3 font-medium w-20">활성</th>
                    <th className="text-right p-3 font-medium w-32">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.displayEventId} className="border-b last:border-0 hover:bg-gray-50/80">
                      <td className="p-3 font-mono text-xs">{r.displayEventId}</td>
                      <td className="p-2 align-middle">
                        <BannerThumbCell url={bannerPreviewUrl(r)} />
                      </td>
                      <td className="p-3 max-w-[200px] truncate">
                        {r.title || r.content?.title || '—'}
                      </td>
                      <td className="p-3 text-sm">
                        {getSysCodeName(eventTypeCodes, r.eventTypeCode)}
                      </td>
                      <td className="p-3 text-sm">
                        <span className="block">
                          {getSysCodeName(contentTypeCodes, r.contentTypeCode)}
                        </span>
                        {r.contentId != null && (
                          <span className="text-xs text-gray-500">ID {r.contentId}</span>
                        )}
                      </td>
                      <td className="p-3">{r.displayOrder ?? '—'}</td>
                      <td className="p-3">{r.isActive === false ? 'N' : 'Y'}</td>
                      <td className="p-3 text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild title="수정">
                          <Link href={`/admin/display-events/edit?id=${r.displayEventId}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="삭제"
                          onClick={() => {
                            setDeleteTarget(r)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </Button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
            <DialogDescription>
              ID {deleteTarget?.displayEventId} 항목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
