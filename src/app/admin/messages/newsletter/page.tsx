'use client'

import { useCallback, useEffect, useState } from 'react'
import { ListPagination } from '@/components/admin/ListPagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  deleteNewsletterSubscriber,
  downloadNewsletterExport,
  fetchNewsletterSubscribers,
  newsletterAdminApiErrorMessage,
  postNewsletterMergeMembers,
  postNewsletterSubscriberUnsubscribe,
  type NewsletterSubscriberRow,
} from '@/services/newsletter'

const PAGE_SIZE = 20

function formatKstDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\.\s/g, '-')
    .replace('.', '')
}

export default function AdminNewsletterPage() {
  const [rows, setRows] = useState<NewsletterSubscriberRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [merging, setMerging] = useState(false)
  const [rowPending, setRowPending] = useState<{ id: number; kind: 'unsub' | 'delete' } | null>(
    null,
  )
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<
    | { title: string; message: string; action: 'unsub' | 'delete'; row: NewsletterSubscriberRow }
    | null
  >(null)

  const loadList = useCallback(async () => {
    try {
      setListLoading(true)
      setListError(null)
      const r = await fetchNewsletterSubscribers({
        page,
        page_size: PAGE_SIZE,
        search: appliedSearch.trim() || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setRows(r.list)
      setTotal(r.total)
    } catch (e) {
      console.error(e)
      setRows([])
      setTotal(0)
      setListError(e instanceof Error ? e.message : '원장 목록을 불러오지 못했습니다.')
    } finally {
      setListLoading(false)
    }
  }, [page, appliedSearch, status, dateFrom, dateTo])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const onExport = async () => {
    try {
      setExporting(true)
      await downloadNewsletterExport()
    } catch (e) {
      console.error(e)
      setAlertModal({ title: '오류', message: '엑셀 다운로드에 실패했습니다.' })
    } finally {
      setExporting(false)
    }
  }

  const onMergeMembers = async () => {
    try {
      setMerging(true)
      const r = await postNewsletterMergeMembers()
      setAlertModal({
        title: '병합 완료',
        message: `신규 ${r.created}건, 갱신 ${r.updated}건 (처리 ${r.total}건). 원장 목록을 새로고침합니다.`,
      })
      setListLoading(true)
      setListError(null)
      const listRes = await fetchNewsletterSubscribers({
        page: 1,
        page_size: PAGE_SIZE,
        search: appliedSearch.trim() || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setRows(listRes.list)
      setTotal(listRes.total)
      setPage(1)
    } catch (e) {
      console.error(e)
      setAlertModal({ title: '오류', message: '회원 뉴스레터 병합에 실패했습니다.' })
    } finally {
      setListLoading(false)
      setMerging(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const tableBusy = listLoading || rowPending !== null

  const onUnsubscribeRow = async (r: NewsletterSubscriberRow) => {
    if (r.subscribe_status !== 'SUBSCRIBED') return
    setConfirmModal({
      title: '구독 취소',
      message: `${r.email}\n구독을 취소 처리할까요?`,
      action: 'unsub',
      row: r,
    })
  }

  const onDeleteRow = async (r: NewsletterSubscriberRow) => {
    setConfirmModal({
      title: '원장 삭제',
      message: `${r.email}\n원장에서 이 행을 삭제합니다. 복구할 수 없습니다. 삭제할까요?`,
      action: 'delete',
      row: r,
    })
  }

  return (
    <section className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-fit mr-2">
              등록일(시작)
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-fit mr-2">
              등록일(종료)
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-fit mr-2">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">전체</option>
              <option value="SUBSCRIBED">SUBSCRIBED</option>
              <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-fit mr-2">
              검색
            </label>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이메일·이름"
              className="h-9"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              className="w-32 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              onClick={() => {
                setAppliedSearch(searchInput.trim())
                setPage(1)
              }}
            >
              조회
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-right sm:justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void loadList()}>
                {listLoading ? '불러오는 중...' : '새로고침'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onMergeMembers()}
                disabled={merging || listLoading}
              >
                {merging ? '병합 중…' : '회원 뉴스레터 병합'}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                onClick={() => void onExport()}
                disabled={exporting}
              >
                {exporting ? '다운로드 중…' : '엑셀 다운로드'}
              </Button>
            </div>
            {listError ? <p className="text-sm text-rose-600">{listError}</p> : null}
          </div>
        </div>

      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[260px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead className="bg-[#03213b] border-b border-white/15">
              <tr>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>이메일</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>이름</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>상태</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>유입</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>등록일</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((r) => (
                <tr key={r.subscriber_id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 align-middle text-sm text-[#000] break-all">
                    {r.email}
                  </td>
                  <td className="px-3 py-3 align-middle text-center text-sm text-gray-700">
                    {r.name || '—'}
                  </td>
                  <td className="px-3 py-3 align-middle text-center">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {r.subscribe_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle text-center text-sm text-gray-700">
                    {r.signup_source}
                  </td>
                  <td className="px-3 py-3 align-middle text-center text-sm tabular-nums text-gray-600">
                    {formatKstDateTime(r.create_at)}
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-40"
                        disabled={tableBusy || r.subscribe_status !== 'SUBSCRIBED'}
                        title={
                          r.subscribe_status !== 'SUBSCRIBED'
                            ? '이미 구독 취소된 행입니다.'
                            : '구독 상태를 취소로 변경합니다.'
                        }
                        onClick={() => void onUnsubscribeRow(r)}
                      >
                        {rowPending?.id === r.subscriber_id && rowPending.kind === 'unsub'
                          ? '처리 중…'
                          : '구독 취소'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                        disabled={tableBusy}
                        title="원장에서 행을 삭제합니다."
                        onClick={() => void onDeleteRow(r)}
                      >
                        {rowPending?.id === r.subscriber_id && rowPending.kind === 'delete'
                          ? '처리 중…'
                          : '삭제'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="p-12 text-center text-gray-500" colSpan={6}>
                    {listLoading ? '불러오는 중...' : '데이터가 없습니다.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <ListPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={total}
          disabled={listLoading}
        />
      </div>

      <Dialog open={alertModal != null} onOpenChange={(open) => (!open ? setAlertModal(null) : null)}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">{alertModal?.title ?? '알림'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="whitespace-pre-wrap text-sm text-gray-600">
              {alertModal?.message ?? ''}
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAlertModal(null)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmModal != null}
        onOpenChange={(open) => {
          if (!open) setConfirmModal(null)
        }}
      >
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">{confirmModal?.title ?? '확인'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="whitespace-pre-wrap text-sm text-gray-600">
              {confirmModal?.message ?? ''}
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmModal(null)} disabled={tableBusy}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className={confirmModal?.action === 'delete' ? 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-60' : 'bg-black text-white hover:bg-gray-800 disabled:opacity-60'}
              disabled={tableBusy || confirmModal == null}
              onClick={async () => {
                if (!confirmModal) return
                const r = confirmModal.row
                const action = confirmModal.action
                setConfirmModal(null)
                setRowPending({ id: r.subscriber_id, kind: action })
                try {
                  if (action === 'unsub') {
                    await postNewsletterSubscriberUnsubscribe(r.subscriber_id)
                  } else {
                    await deleteNewsletterSubscriber(r.subscriber_id)
                  }
                  await loadList()
                } catch (e) {
                  console.error(e)
                  setAlertModal({ title: '오류', message: newsletterAdminApiErrorMessage(e) })
                } finally {
                  setRowPending(null)
                }
              }}
            >
              {confirmModal?.action === 'delete' ? '삭제' : '취소 진행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
