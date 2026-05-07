'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ListPagination } from '@/components/admin/ListPagination'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import {
  getSysCode,
  getSysCodeName,
  INQUIRY_TYPE_PARENT,
  type SysCodeItem,
} from '@/lib/syscode'
import { getInquiry, getInquiryList } from '@/services/board'
import type { InquiryDetail, InquiryListItem } from '@/types/board'
import { ChevronRight } from 'lucide-react'
import { InquiryAttachmentBlock } from './_components/InquiryAttachmentBlock'

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

function shortMailAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function mailOpenedCell(sent: string | null | undefined, opened: string | null | undefined) {
  if (!sent) return <span className="text-gray-400">—</span>
  if (opened) return <span className="text-gray-700">{shortMailAt(opened)}</span>
  return <span className="text-amber-700">미열람</span>
}

const PAGE_SIZE = 20

export default function InquiryListPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<InquiryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [typeSysCodes, setTypeSysCodes] = useState<SysCodeItem[]>([])

  useEffect(() => {
    let cancelled = false
    void getSysCode(INQUIRY_TYPE_PARENT).then((rows) => {
      if (!cancelled) setTypeSysCodes(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getInquiryList({ page, page_size: PAGE_SIZE })
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
    void load()
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">등록된 문의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-28" />
                <col className="w-44" />
                <col className="w-24" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[160px]" />
                <col className="w-16" />
              </colgroup>
              <thead className="bg-[#03213b] border-b border-white/15">
                <tr>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>번호</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>제목</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>유형</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>문의자</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>상태</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>메일 발송</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>메일 열람</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>등록일</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>이동</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((row, index) => {
                  const rowNum = totalCount - (page - 1) * PAGE_SIZE - index
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-center align-middle tabular-nums text-gray-600">
                        {rowNum}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <button
                          type="button"
                          className="max-w-full truncate text-left text-sm font-medium text-[#000] hover:no-underline"
                          onClick={() => void handleTitleClick(row.id)}
                          title={row.title}
                        >
                          {row.title}
                        </button>
                      </td>
                      <td className="px-3 py-3 align-middle text-xs text-gray-600">
                        {getSysCodeName(typeSysCodes, row.inquiry_type)}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm text-gray-600">
                        {row.member ? `${row.member.member_sid} / ${row.member.name || '-'}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        <span
                          className={
                            row.status === 'answered'
                              ? 'rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800'
                              : 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800'
                          }
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center align-middle text-xs tabular-nums text-gray-700">
                        {shortMailAt(row.answer_email_sent_at)}
                      </td>
                      <td className="px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                        {mailOpenedCell(row.answer_email_sent_at, row.answer_email_opened_at)}
                      </td>
                      <td className="px-3 py-3 text-center align-middle tabular-nums text-gray-600">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-center align-middle">
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

        <ListPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={totalCount}
          disabled={loading}
        />
      </div>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#308edc] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">문의 상세</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <p className="py-6 text-gray-500">불러오는 중...</p>
            ) : detail ? (
              <div className="space-y-4">
                {detail.member ? (
                  <div className="space-y-2 rounded border bg-gray-50 p-4">
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
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">상태</span>
                  <span
                    className={
                      detail.status === 'answered'
                        ? 'rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800'
                        : 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800'
                    }
                  >
                    {statusLabel(detail.status)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">제목</span>
                  <p className="font-medium text-[#000]">{detail.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">문의 유형</span>
                  <p className="text-sm text-gray-800">
                    {getSysCodeName(typeSysCodes, detail.inquiry_type)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">등록일</span>
                  <p className="text-sm text-gray-600">{formatDate(detail.created_at)}</p>
                </div>
                {detail.attachment ? <InquiryAttachmentBlock url={detail.attachment} /> : null}
                <div>
                  <span className="text-sm text-gray-500">문의 내용</span>
                  <div className="mt-1 max-h-40 overflow-y-auto rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                    {detail.content}
                  </div>
                </div>
                {detail.answer ? (
                  <div>
                    <span className="text-sm text-gray-500">답변</span>
                    <div className="mt-1 max-h-40 overflow-y-auto rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap">
                      {detail.answer}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="py-6 text-gray-500">내용을 불러올 수 없습니다.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4">
            {detail ? (
              <Link href={`/admin/board/inquiries/detail?id=${detail.id}`}>
                <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
                  답변하기
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
