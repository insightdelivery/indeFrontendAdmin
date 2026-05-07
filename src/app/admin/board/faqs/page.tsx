'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ListPagination } from '@/components/admin/ListPagination'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import { deleteFAQ, getFAQ, getFAQList } from '@/services/board'
import type { FAQItem } from '@/types/board'
import { Edit, Plus, Trash2 } from 'lucide-react'

function formatDate(s: string | undefined) {
  if (!s) return '-'
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PAGE_SIZE = 20

export default function FAQListPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<FAQItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getFAQList({ page, page_size: PAGE_SIZE })
      setItems(Array.isArray(res.results) ? res.results : [])
      setTotalCount(typeof res.count === 'number' ? res.count : 0)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || 'FAQ 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDeleteClick = (id: number) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (deletingId == null) return
    try {
      await deleteFAQ(deletingId)
      toast({ title: '삭제 완료', description: 'FAQ가 삭제되었습니다.', duration: 3000 })
      setDeleteModalOpen(false)
      setDeletingId(null)
      void load()
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleQuestionClick = async (id: number) => {
    setDetailModalOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await getFAQ(id)
      setDetail(data)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || 'FAQ 상세를 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-end">
          <Link href="/admin/board/faqs/new">
            <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
              새 FAQ
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">등록된 FAQ가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[100px]" />
                <col />
                <col className="w-[160px]" />
                <col className="w-28" />
              </colgroup>
              <thead className="bg-[#03213b] border-b border-white/15">
                <tr>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>순서</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>질문</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>등록일시</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-center align-middle tabular-nums text-gray-600">
                      {row.order}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        className="max-w-full truncate text-left text-sm font-medium text-[#000] hover:no-underline"
                        onClick={() => void handleQuestionClick(row.id)}
                        title={row.question}
                      >
                        {row.question}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center align-middle tabular-nums text-gray-600">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/admin/board/faqs/edit?id=${row.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDeleteClick(row.id)}
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

        <ListPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={totalCount}
          disabled={loading}
        />
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FAQ 삭제</DialogTitle>
            <DialogDescription>이 FAQ를 삭제하시겠습니까? 복구할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleDeleteConfirm}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#308edc] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">FAQ 상세</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <p className="py-6 text-gray-500">불러오는 중...</p>
            ) : detail ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">순서</span>
                  <p>{detail.order}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">등록일시</span>
                  <p className="text-gray-600">{formatDate(detail.created_at)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">질문</span>
                  <p className="font-medium text-[#000]">{detail.question}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">답변</span>
                  <div className="mt-1 max-h-60 overflow-y-auto rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                    {detail.answer}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-gray-500">내용을 불러올 수 없습니다.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4">
            {detail ? (
              <Link href={`/admin/board/faqs/edit?id=${detail.id}`}>
                <Button type="button" variant="outline" size="sm">
                  수정
                </Button>
              </Link>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
