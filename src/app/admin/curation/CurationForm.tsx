'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { createCuration, getCuration, updateCuration, type CurationContentType } from '@/services/curation'

function newRowKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fromDatetimeLocalValue(v: string): string | null {
  const t = v?.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const TYPE_OPTIONS: { value: CurationContentType; label: string }[] = [
  { value: 'ARTICLE', label: 'ARTICLE' },
  { value: 'VIDEO', label: 'VIDEO' },
  { value: 'SEMINAR', label: 'SEMINAR' },
]

type DraftRow = {
  key: string
  contentType: CurationContentType
  contentCode: string
  sortOrder: number
}

type SortableRowProps = {
  row: DraftRow
  index: number
  rowCount: number
  onUpdate: (key: string, patch: Partial<DraftRow>) => void
  onRemove: (key: string) => void
}

function CurationSortableRow({ row, index, rowCount, onUpdate, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : undefined,
  }
  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-muted/30">
      <td className="px-1 py-2 w-10 align-middle">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`순서 변경 (행 ${index + 1})`}
        >
          <GripVertical className="h-4 w-4 shrink-0" />
        </button>
      </td>
      <td className="px-3 py-2 align-middle tabular-nums text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-2 align-middle">
        <Select
          value={row.contentType}
          onValueChange={(v) => onUpdate(row.key, { contentType: v as CurationContentType })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 align-middle">
        <Input
          className="h-9"
          inputMode="numeric"
          value={row.contentCode}
          onChange={(e) => onUpdate(row.key, { contentCode: e.target.value })}
          placeholder="PK"
          aria-label={`콘텐츠 코드 (행 ${index + 1})`}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <Input
          className="h-9"
          type="number"
          min={0}
          value={row.sortOrder}
          onChange={(e) => onUpdate(row.key, { sortOrder: Number.parseInt(e.target.value, 10) || 0 })}
          aria-label={`정렬 (행 ${index + 1})`}
        />
      </td>
      <td className="px-3 py-2 align-middle text-right">
        {rowCount > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600"
            onClick={() => onRemove(row.key)}
            aria-label={`행 ${index + 1} 제거`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
    </tr>
  )
}

type Props = {
  curationId?: number
  /** 모달 등: 상단 제목은 바깥에서 두고 폼만 표시 */
  compact?: boolean
  /** 저장 성공 시 호출. 있으면 목록으로 라우팅하지 않음 */
  onSaved?: () => void
  /** 취소/닫기. 있으면 목록 링크 대신 호출 */
  onCancel?: () => void
}

export default function CurationForm({ curationId, compact, onSaved, onCancel }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = curationId != null && Number.isFinite(curationId)
  const [loading, setLoading] = useState(!!isEdit)
  const [saving, setSaving] = useState(false)
  const [blockName, setBlockName] = useState('')
  const [isExposed, setIsExposed] = useState(false)
  const [exposureStart, setExposureStart] = useState('')
  const [exposureEnd, setExposureEnd] = useState('')
  const [rows, setRows] = useState<DraftRow[]>([
    { key: newRowKey(), contentType: 'ARTICLE', contentCode: '', sortOrder: 0 },
  ])

  const loadExisting = useCallback(async () => {
    if (!isEdit || !curationId) return
    try {
      setLoading(true)
      const d = await getCuration(curationId)
      setBlockName(d.name ?? '')
      setIsExposed(d.isExposed)
      setExposureStart(toDatetimeLocalValue(d.exposureStartDatetime))
      setExposureEnd(toDatetimeLocalValue(d.exposureEndDatetime))
      if (d.items.length > 0) {
        setRows(
          d.items.map((it, i) => ({
            key: `e-${it.itemId}`,
            contentType: it.contentType,
            contentCode: String(it.contentCode),
            sortOrder: it.sortOrder ?? i,
          })),
        )
      }
    } catch (e: unknown) {
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '불러오지 못했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [curationId, isEdit, toast])

  useEffect(() => {
    void loadExisting()
  }, [loadExisting])

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: newRowKey(),
        contentType: 'ARTICLE',
        contentCode: '',
        sortOrder: prev.length,
      },
    ])
  }

  const removeRow = (key: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((r) => r.key !== key)
      return next.map((r, i) => ({ ...r, sortOrder: i }))
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onRowsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.key === active.id)
      const newIndex = prev.findIndex((r) => r.key === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      const moved = arrayMove(prev, oldIndex, newIndex)
      return moved.map((r, i) => ({ ...r, sortOrder: i }))
    })
  }

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const titleTrimmed = blockName.trim()
    if (!titleTrimmed) {
      toast({ title: '검증', description: '특집 제목을 입력해 주세요.', variant: 'destructive' })
      return
    }
    const items = rows.map((r, i) => {
      const code = Number.parseInt(r.contentCode.trim(), 10)
      return {
        contentType: r.contentType,
        contentCode: code,
        sortOrder: r.sortOrder ?? i,
      }
    })
    for (const it of items) {
      if (!Number.isFinite(it.contentCode)) {
        toast({ title: '검증', description: '모든 행에 콘텐츠 코드(숫자)를 입력하세요.', variant: 'destructive' })
        return
      }
    }
    try {
      setSaving(true)
      const base = {
        name: titleTrimmed,
        isActive: true,
        isExposed,
        exposureStartDatetime: fromDatetimeLocalValue(exposureStart),
        exposureEndDatetime: fromDatetimeLocalValue(exposureEnd),
        items,
      }
      if (isEdit && curationId) {
        await updateCuration(curationId, base)
        toast({ title: '저장됨', description: '큐레이션이 수정되었습니다.' })
      } else {
        await createCuration(base)
        toast({ title: '등록됨', description: '큐레이션이 추가되었습니다.' })
      }
      if (onSaved) onSaved()
      else router.push('/admin/curation')
    } catch (e: unknown) {
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8">불러오는 중…</p>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl">
      {!compact ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {isEdit ? '특집(큐레이션) 수정' : '특집(큐레이션) 등록'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              한 특집에 여러 콘텐츠(아티클·비디오·세미나)를 순서대로 묶을 수 있습니다.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/curation">목록</Link>
          </Button>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label
              htmlFor="curation-block-name"
              className="w-28 shrink-0 text-right text-sm font-medium leading-none"
            >
              특집 제목 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="curation-block-name"
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              placeholder="특집 제목을 입력하세요"
              required
              className="h-9 min-w-[12rem] flex-1 basis-[min(100%,22rem)] max-w-xl"
            />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-border sm:border-l sm:pl-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={isExposed} onChange={(e) => setIsExposed(e.target.checked)} />
                홈페이지 노출
              </label>
            </div>
          </div>

          {/* 노출 기간: 라벨 너비 w-28 로 위 행과 수직 정렬 */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <Label
                htmlFor="curation-start"
                className="w-28 shrink-0 text-right text-sm font-medium leading-none whitespace-nowrap"
              >
                노출 시작
              </Label>
              <Input
                id="curation-start"
                type="datetime-local"
                value={exposureStart}
                onChange={(e) => setExposureStart(e.target.value)}
                className="h-9 w-[min(100%,16rem)]"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Label
                htmlFor="curation-end"
                className="w-28 shrink-0 text-right text-sm font-medium leading-none whitespace-nowrap"
              >
                노출 종료
              </Label>
              <Input
                id="curation-end"
                type="datetime-local"
                value={exposureEnd}
                onChange={(e) => setExposureEnd(e.target.value)}
                className="h-9 w-[min(100%,16rem)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              행 추가
            </Button>
          </div>
          <div className="rounded-md border">
            <div className="max-h-[min(22rem,55vh)] overflow-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowsDragEnd}>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted text-muted-foreground shadow-sm">
                    <tr>
                      <th className="px-1 py-2 font-medium w-10" aria-label="순서 변경" />
                      <th className="px-3 py-2 font-medium w-12">#</th>
                      <th className="px-3 py-2 font-medium min-w-[140px]">타입</th>
                      <th className="px-3 py-2 font-medium min-w-[120px]">콘텐츠 코드</th>
                      <th className="px-3 py-2 font-medium w-28">정렬</th>
                      <th className="px-3 py-2 font-medium w-20 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
                      {rows.map((row, idx) => (
                        <CurationSortableRow
                          key={row.key}
                          row={row}
                          index={idx}
                          rowCount={rows.length}
                          onUpdate={updateRow}
                          onRemove={removeRow}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
          {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        ) : (
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/curation">취소</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
