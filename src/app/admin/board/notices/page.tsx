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
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import { deleteNotice, getNotice, getNoticeList } from '@/services/board'
import type { NoticeDetail, NoticeListItem } from '@/types/board'
import { Edit, PanelTop, Pin, Plus, Search, Trash2 } from 'lucide-react'

function formatDate(s: string) {
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toNoticeDisplayHtml(content: string | null | undefined) {
  const raw = (content ?? '').trim()
  if (!raw) return ''

  // 에디터가 만든 HTML이면 그대로 렌더링
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    // 빈 문단(<p></p>, <p>&nbsp;</p> 등)은 줄바꿈으로 보이도록 <br/>을 보강한다.
    return raw
      .replaceAll(/<p>\s*<\/p>/gi, '<p><br/></p>')
      .replaceAll(/<p>\s*&nbsp;\s*<\/p>/gi, '<p><br/></p>')
  }

  // 일반 텍스트면 줄바꿈을 <br/>로 변환 (XSS 방지를 위해 escape)
  return escapeHtml(raw).replace(/\r?\n/g, '<br/>')
}

const PAGE_SIZE = 20

export default function NoticeListPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<NoticeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<NoticeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getNoticeList({ page, page_size: PAGE_SIZE, search: search || undefined })
      setItems(Array.isArray(res.results) ? res.results : [])
      setTotalCount(typeof res.count === 'number' ? res.count : 0)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '공지 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

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
      await deleteNotice(deletingId)
      toast({ title: '삭제 완료', description: '공지가 삭제되었습니다.', duration: 3000 })
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

  const handleTitleClick = async (id: number) => {
    setDetailModalOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await getNotice(id)
      setDetail(data)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '공지 상세를 불러오는데 실패했습니다.',
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
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 flex justify-between">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,320px)_128px] ">
          <div className="space-y-1">
            <Input
              placeholder="제목·내용 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  setSearch(searchInput.trim())
                }
              }}
              className="h-9"
            />
          </div>
          <div className="flex  mt-0">
            <Button
              type="button"
              size="sm"
              className="w-32 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              onClick={() => {
                setPage(1)
                setSearch(searchInput.trim())
              }}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" />
              조회
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Link href="/admin/board/notices/new">
            <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
              새 공지
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
          <div className="p-12 text-center text-gray-500">
            {search ? '검색 결과가 없습니다.' : '등록된 공지가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-[160px]" />
                <col className="w-28" />
              </colgroup>
              <thead className="bg-[#03213b] border-b border-white/15">
                <tr>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>번호</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>제목</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>상단고정</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>GNB</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>조회수</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>등록일</th>
                  <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>관리</th>
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
                      <td className="px-2 py-3 text-center align-middle">
                        {row.is_pinned ? <Pin className="inline h-4 w-4 text-amber-500" /> : '-'}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        {row.show_in_gnb ? (
                          <span title="GNB 상단 표시">
                            <PanelTop className="inline h-4 w-4 text-sky-600" aria-hidden />
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-center align-middle tabular-nums text-gray-700">
                        {row.view_count.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center align-middle tabular-nums text-gray-600">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/admin/board/notices/edit?id=${row.id}`}>
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

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">공지 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              이 공지를 삭제하시겠습니까? 복구할 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
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
            <DialogTitle className="text-lg font-semibold text-white">공지 상세</DialogTitle>
          </DialogHeader>
          <div className="min-h-[500px] flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <p className="py-6 text-gray-500">불러오는 중...</p>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="min-w-[100px] text-sm text-gray-500">제목 : </span>
                  <p className="font-medium text-[#000]">{detail.title}</p>
                </div>
                <div className="flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4 justify-left">
                    <span className="min-w-[100px] text-sm text-gray-500">상단고정 : </span>
                    <p>{detail.is_pinned ? '예' : '아니오'}</p>
                    <span className="min-w-[100px] text-sm text-gray-500">GNB 상단에 표시 : </span>
                    <p>{detail.show_in_gnb ? '예' : '아니오'}</p>
                  </div>
                  <div className="flex items-center gap-4 justify-end">
                    <span className="min-w-[100px] text-sm text-gray-500">조회수 · 등록일 : </span>
                    <p className="text-sm text-gray-600">
                      {detail.view_count}회 · {formatDate(detail.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="min-w-[100px] pt-1 text-sm text-gray-500">내용</span>
                  <div
                    className="flex-1 mt-0 max-h-100 overflow-y-auto whitespace-pre-wrap rounded border bg-gray-50 p-4 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: toNoticeDisplayHtml(detail.content) }}
                  />
                </div>
              </div>
        
            ) : (
              <p className="py-6 text-gray-500">내용을 불러올 수 없습니다.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
            {detail ? (
              <Link href={`/admin/board/notices/edit?id=${detail.id}`}>
                <Button type="button" variant="outline" size="sm">
                  수정
                </Button>
              </Link>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
