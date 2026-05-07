'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { deleteCuration, listCurationGroups, type CurationSummary } from '@/services/curation'
import CurationForm from './CurationForm'
import { cn } from '@/lib/utils'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'

function formatPeriodDatetime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const TH = ADMIN_CONTENT_TABLE_HEAD_TH

const COL_ID = 'w-16 min-w-16 max-w-16 px-2'
const COL_NAME = 'min-w-0 px-3'
const COL_COUNT = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
const COL_EXPOSE = 'w-[88px] min-w-[88px] max-w-[88px] px-2'
const COL_PERIOD = 'w-[220px] min-w-[220px] max-w-[220px] px-2'
const COL_REG = 'w-[104px] min-w-[104px] max-w-[104px] px-2'
const COL_ACTIONS = 'w-20 min-w-20 max-w-20 px-0.5'

export default function CurationAdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [rows, setRows] = useState<CurationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CurationSummary | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formCurationId, setFormCurationId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const items = await listCurationGroups()
      setRows(items)
    } catch (e: unknown) {
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '목록을 불러오지 못했습니다.',
        variant: 'destructive',
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const create = searchParams.get('create')
    const edit = searchParams.get('edit')
    if (create === '1') {
      setFormCurationId(null)
      setFormOpen(true)
      router.replace('/admin/curation', { scroll: false })
      return
    }
    if (edit) {
      const n = Number.parseInt(edit, 10)
      if (Number.isFinite(n)) {
        setFormCurationId(n)
        setFormOpen(true)
        router.replace('/admin/curation', { scroll: false })
      }
    }
  }, [searchParams, router])

  const openCreateModal = () => {
    setFormCurationId(null)
    setFormOpen(true)
  }

  const openEditModal = (id: number) => {
    setFormCurationId(id)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCuration(deleteTarget.id)
      toast({ title: '삭제됨', description: '큐레이션과 포함된 콘텐츠 참조가 삭제되었습니다.' })
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
      {/* 상단 툴바 — 아티클 목록과 동일 패턴 */}
      <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 lg:col-span-2">
            <span>
              목록 <span className="font-medium text-gray-900">{rows.length}</span>건
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              새로고침
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-black text-white hover:bg-gray-800"
              onClick={openCreateModal}
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              새 특집 등록
            </Button>
          </div>
        </div>
      </div>

      {/* 목록 테이블 — 아티클 목록과 동일 패턴 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">등록된 큐레이션이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-[72px]" />
                <col className="w-[88px]" />
                <col className="w-[250px]" />
                <col className="w-[104px]" />
                <col className="w-20" />
              </colgroup>
              <thead className="border-b h-12 border-white/15 bg-[#03213b] text-[#fff]">
                <tr>
                  <th className={cn(TH, COL_ID, 'text-center')}>ID</th>
                  <th className={cn(TH, COL_NAME, 'text-left normal-case')}>큐레이션 제목</th>
                  <th className={cn(TH, COL_COUNT, 'text-center')}>콘텐츠 수</th>
                  <th className={cn(TH, COL_EXPOSE, 'text-center')}>홈 노출</th>
                  <th className={cn(TH, COL_PERIOD, 'text-center normal-case')}>기간</th>
                  <th className={cn(TH, COL_REG, 'text-center')}>등록</th>
                  <th className={cn(TH, COL_ACTIONS, 'text-center')}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className={cn(COL_ID, 'py-3 align-middle text-center text-sm text-gray-600 tabular-nums')}>
                      {r.id}
                    </td>
                    <td className={cn(COL_NAME, 'py-3 align-middle text-left text-sm text-gray-900')}>
                      <button
                        type="button"
                        className="line-clamp-2 w-full cursor-pointer text-left font-medium text-[#000] hover:text-[#000] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded-sm"
                        title={r.name ? `${r.name} — 수정` : '수정'}
                        onClick={() => openEditModal(r.id)}
                      >
                        {r.name || '—'}
                      </button>
                    </td>
                    <td
                      className={cn(
                        COL_COUNT,
                        'py-3 align-middle text-center text-sm text-gray-600 tabular-nums'
                      )}
                    >
                      {r.itemCount}
                    </td>
                    <td className={cn(COL_EXPOSE, 'py-3 align-middle text-center')}>
                      {r.isExposed ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Y
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          N
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        COL_PERIOD,
                        'py-3 align-middle text-left text-xs text-gray-600 leading-tight'
                      )}
                    >
                      <div className="line-clamp-2">
                        {formatPeriodDatetime(r.exposureStartDatetime)} ~{' '}
                        {formatPeriodDatetime(r.exposureEndDatetime)}
                      </div>
                    </td>
                    <td
                      className={cn(
                        COL_REG,
                        'py-3 align-middle text-center text-xs text-gray-600 tabular-nums whitespace-nowrap'
                      )}
                    >
                      {r.regDatetime ? r.regDatetime.slice(0, 10) : '—'}
                    </td>
                    <td className={cn(COL_ACTIONS, 'py-2 align-middle text-center')}>
                      <div className="flex items-center justify-center gap-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 p-0"
                          type="button"
                          aria-label="수정"
                          title="수정"
                          onClick={() => openEditModal(r.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 p-0 text-red-600 hover:text-red-700"
                          type="button"
                          aria-label="삭제"
                          title="삭제"
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
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormCurationId(null)
        }}
      >
        <DialogContent className="flex max-h-[90vh] pb-0 max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#308edc] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {formCurationId == null ? '특집(큐레이션) 등록' : '특집(큐레이션) 수정'}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              한 특집에 여러 콘텐츠(아티클·비디오·세미나)를 순서대로 묶을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-0">
            {formOpen ? (
              <CurationForm
                key={formCurationId == null ? 'new' : `edit-${formCurationId}`}
                curationId={formCurationId ?? undefined}
                compact
                onSaved={() => {
                  setFormOpen(false)
                  setFormCurationId(null)
                  void load()
                }}
                onCancel={() => {
                  setFormOpen(false)
                  setFormCurationId(null)
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">큐레이션 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              ID {deleteTarget?.id}
              {deleteTarget?.name ? ` (${deleteTarget.name})` : ''} 특집과 포함된 {deleteTarget?.itemCount ?? 0}개
              콘텐츠 참조를 모두 삭제할까요?
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
