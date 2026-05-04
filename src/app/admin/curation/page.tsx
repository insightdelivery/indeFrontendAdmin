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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { deleteCuration, listCurationGroups, type CurationSummary } from '@/services/curation'
import CurationForm from './CurationForm'

function formatPeriodDatetime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">특집(큐레이션) 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            한 특집에 여러 콘텐츠를 담아 메인 등에 노출합니다. (curationContentPlan)
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-black text-white hover:bg-gray-800"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            등록
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">목록 ({rows.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">등록된 큐레이션이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">이름</th>
                    <th className="px-3 py-2 font-medium">콘텐츠 수</th>
                    <th className="px-3 py-2 font-medium">홈페이지 노출</th>
                    <th className="px-3 py-2 font-medium">기간</th>
                    <th className="px-3 py-2 font-medium">등록</th>
                    <th className="px-3 py-2 font-medium w-28">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 tabular-nums">{r.id}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="line-clamp-2">{r.name || '—'}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.itemCount}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.isExposed ? (
                          <span className="text-green-700">Y</span>
                        ) : (
                          <span className="text-muted-foreground">N</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="line-clamp-2">
                          {formatPeriodDatetime(r.exposureStartDatetime)} ~{' '}
                          {formatPeriodDatetime(r.exposureEndDatetime)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {r.regDatetime ? r.regDatetime.slice(0, 10) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            type="button"
                            aria-label="수정"
                            onClick={() => openEditModal(r.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            type="button"
                            aria-label="삭제"
                            onClick={() => {
                              setDeleteTarget(r)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormCurationId(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formCurationId == null ? '특집(큐레이션) 등록' : '특집(큐레이션) 수정'}
            </DialogTitle>
            <DialogDescription>
              한 특집에 여러 콘텐츠(아티클·비디오·세미나)를 순서대로 묶을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>큐레이션 삭제</DialogTitle>
            <DialogDescription>
              ID {deleteTarget?.id}
              {deleteTarget?.name ? ` (${deleteTarget.name})` : ''} 특집과 포함된 {deleteTarget?.itemCount ?? 0}개
              콘텐츠 참조를 모두 삭제할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
