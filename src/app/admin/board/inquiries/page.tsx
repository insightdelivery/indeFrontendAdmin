'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getInquiryList, getInquiry } from '@/services/board'
import type { InquiryListItem, InquiryDetail } from '@/types/board'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

function formatDate(s: string) {
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string) {
  return status === 'answered' ? '답변완료' : '접수'
}

export default function InquiryListPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<InquiryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getInquiryList({ page, page_size: 20 })
      setItems(Array.isArray(res.results) ? res.results : [])
      setTotalCount(typeof res.count === 'number' ? res.count : 0)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '문의 목록을 불러오는데 실패했습니다.',
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

  const handleTitleClick = async (id: number) => {
    setDetailModalOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await getInquiry(id)
      setDetail(data)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '문의 상세를 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">1:1 문의 관리</h1>
        <p className="text-gray-600 text-sm">회원 문의 목록을 보고 답변할 수 있습니다.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-gray-500 py-8 text-center">불러오는 중...</p>
          ) : (items?.length ?? 0) === 0 ? (
            <p className="text-gray-500 py-8 text-center">등록된 문의가 없습니다.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-center p-3 font-medium w-16">번호</th>
                    <th className="text-left p-3 font-medium">제목</th>
                    <th className="text-left p-3 font-medium w-40">문의자</th>
                    <th className="text-center p-3 font-medium w-24">상태</th>
                    <th className="text-right p-3 font-medium w-[140px] min-w-[140px] whitespace-nowrap">등록일</th>
                    <th className="text-right p-3 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => {
                    const pageSize = 20
                    const rowNum = totalCount - (page - 1) * pageSize - index
                    return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 text-center text-gray-600">{rowNum}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="text-left text-black hover:font-bold hover:underline cursor-pointer"
                          onClick={() => handleTitleClick(row.id)}
                        >
                          {row.title}
                        </button>
                      </td>
                      <td className="p-3 text-gray-600">
                        {row.member
                          ? `${row.member.member_sid} / ${row.member.name || '-'}`
                          : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={
                            row.status === 'answered'
                              ? 'px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800'
                              : 'px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800'
                          }
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-600 whitespace-nowrap w-[140px] min-w-[140px]">{formatDate(row.created_at)}</td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/board/inquiries/detail?id=${row.id}`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                    )
                  })}
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

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-[1008px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>문의 상세</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-gray-500 py-6">불러오는 중...</p>
          ) : detail ? (
            <div className="space-y-4">
              {detail.member && (
                <div className="rounded border bg-gray-50 p-4 space-y-2">
                  <span className="text-sm font-medium text-gray-700">문의자</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-gray-500">아이디</span>
                    <span>{detail.member.member_sid}</span>
                    <span className="text-gray-500">이름</span>
                    <span>{detail.member.name || '-'}</span>
                    <span className="text-gray-500">이메일</span>
                    <span>{detail.member.email || '-'}</span>
                    <span className="text-gray-500">전화번호</span>
                    <span>{detail.member.phone || '-'}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">상태</span>
                <span
                  className={
                    detail.status === 'answered'
                      ? 'px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800'
                      : 'px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800'
                  }
                >
                  {statusLabel(detail.status)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">제목</span>
                <p className="font-medium">{detail.title}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">등록일</span>
                <p className="text-sm text-gray-600">{formatDate(detail.created_at)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">문의 내용</span>
                <div className="mt-1 rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {detail.content}
                </div>
              </div>
              {detail.answer && (
                <div>
                  <span className="text-sm text-gray-500">답변</span>
                  <div className="mt-1 rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {detail.answer}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 py-6">내용을 불러올 수 없습니다.</p>
          )}
          <DialogFooter>
            {detail && (
              <Link href={`/admin/board/inquiries/detail?id=${detail.id}`}>
                <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">답변하기</Button>
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
