'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getFAQList, getFAQ, deleteFAQ } from '@/services/board'
import type { FAQItem } from '@/types/board'
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
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Edit, Trash2 } from 'lucide-react'

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
      const res = await getFAQList({ page, page_size: 20 })
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
    load()
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
      load()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ 관리</h1>
          <p className="text-gray-600 text-sm">FAQ 목록을 조회·수정·삭제할 수 있습니다.</p>
        </div>
        <Link href="/admin/board/faqs/new">
          <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
            <Plus className="h-4 w-4 mr-2" />
            새 FAQ
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-gray-500 py-8 text-center">불러오는 중...</p>
          ) : (items?.length ?? 0) === 0 ? (
            <p className="text-gray-500 py-8 text-center">등록된 FAQ가 없습니다.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-center p-3 font-medium w-[100px]">순서</th>
                    <th className="text-left p-3 font-medium">질문</th>
                    <th className="text-right p-3 font-medium w-[140px] min-w-[140px] whitespace-nowrap">등록일시</th>
                    <th className="text-right p-3 font-medium w-28">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 text-center text-gray-600 w-[100px]">{row.order}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="text-left text-black hover:font-bold hover:underline cursor-pointer"
                          onClick={() => handleQuestionClick(row.id)}
                        >
                          {row.question}
                        </button>
                      </td>
                      <td className="p-3 text-right text-gray-600 whitespace-nowrap w-[140px] min-w-[140px]">{formatDate(row.created_at)}</td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/board/faqs/edit?id=${row.id}`}>
                          <Button variant="ghost" size="sm" className="mr-1">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalCount > 20 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-gray-500 text-sm">총 {totalCount}건</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FAQ 삭제</DialogTitle>
            <DialogDescription>이 FAQ를 삭제하시겠습니까? 복구할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-[1008px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FAQ 상세</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-gray-500 py-6">불러오는 중...</p>
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
                <p className="font-medium">{detail.question}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">답변</span>
                <div className="mt-1 rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {detail.answer}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 py-6">내용을 불러올 수 없습니다.</p>
          )}
          <DialogFooter>
            {detail && (
              <Link href={`/admin/board/faqs/edit?id=${detail.id}`}>
                <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">수정</Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
