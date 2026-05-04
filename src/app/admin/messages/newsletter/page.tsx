'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
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
  const [rowPending, setRowPending] = useState<{ id: number; kind: 'unsub' | 'delete' } | null>(null)

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
      window.alert('엑셀 다운로드에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const onMergeMembers = async () => {
    try {
      setMerging(true)
      const r = await postNewsletterMergeMembers()
      window.alert(
        `병합 완료: 신규 ${r.created}건, 갱신 ${r.updated}건 (처리 ${r.total}건). 원장 목록을 새로고침합니다.`,
      )
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
      window.alert('회원 뉴스레터 병합에 실패했습니다.')
    } finally {
      setListLoading(false)
      setMerging(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const tableBusy = listLoading || rowPending !== null

  const onUnsubscribeRow = async (r: NewsletterSubscriberRow) => {
    if (r.subscribe_status !== 'SUBSCRIBED') return
    if (!window.confirm(`${r.email}\n구독을 취소 처리할까요?`)) return
    setRowPending({ id: r.subscriber_id, kind: 'unsub' })
    try {
      await postNewsletterSubscriberUnsubscribe(r.subscriber_id)
      await loadList()
    } catch (e) {
      console.error(e)
      window.alert(newsletterAdminApiErrorMessage(e))
    } finally {
      setRowPending(null)
    }
  }

  const onDeleteRow = async (r: NewsletterSubscriberRow) => {
    if (
      !window.confirm(
        `${r.email}\n원장에서 이 행을 삭제합니다. 복구할 수 없습니다. 삭제할까요?`,
      )
    ) {
      return
    }
    setRowPending({ id: r.subscriber_id, kind: 'delete' })
    try {
      await deleteNewsletterSubscriber(r.subscriber_id)
      await loadList()
    } catch (e) {
      console.error(e)
      window.alert(newsletterAdminApiErrorMessage(e))
    } finally {
      setRowPending(null)
    }
  }

  return (
    <section className="relative space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">뉴스레터 신청</h1>
          <p className="mt-1 text-sm text-slate-500">
            회원 동의는「회원 뉴스레터 병합」으로 반영합니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-4 text-sm disabled:opacity-50"
            onClick={() => void loadList()}
            disabled={listLoading}
          >
            {listLoading ? '불러오는 중...' : '새로고침'}
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-4 text-sm disabled:opacity-50"
            onClick={() => void onMergeMembers()}
            disabled={merging || listLoading}
          >
            {merging ? '병합 중…' : '회원 뉴스레터 병합'}
          </button>
          <button
            type="button"
            className="h-9 rounded-lg bg-violet-600 px-4 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            onClick={() => void onExport()}
            disabled={exporting}
          >
            {exporting ? '다운로드 중…' : '엑셀 다운로드 (통합)'}
          </button>
        </div>
      </div>

      {listError ? <p className="text-sm text-rose-600">{listError}</p> : null}

      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 pb-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">검색</label>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일·이름"
            className="h-9 w-48 rounded-lg border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
          >
            <option value="">전체</option>
            <option value="SUBSCRIBED">SUBSCRIBED</option>
            <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">등록일(from)</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40 rounded-lg border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">등록일(to)</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40 rounded-lg border-slate-300 text-sm"
          />
        </div>
        <button
          type="button"
          className="h-9 rounded-lg border border-slate-300 px-4 text-sm"
          onClick={() => {
            setAppliedSearch(searchInput.trim())
            setPage(1)
          }}
        >
          검색
        </button>
      </div>

      <div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3">유입</th>
                <th className="px-4 py-3 text-center">등록일</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((r) => (
                <tr key={r.subscriber_id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 break-all">{r.email}</td>
                  <td className="px-4 py-4">{r.name || '—'}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {r.subscribe_status}
                    </span>
                  </td>
                  <td className="px-4 py-4">{r.signup_source}</td>
                  <td className="px-4 py-4 text-center whitespace-nowrap text-slate-600">
                    {formatKstDateTime(r.create_at)}
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        className="rounded-md border border-amber-200 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-40"
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
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        disabled={tableBusy}
                        title="원장에서 행을 삭제합니다."
                        onClick={() => void onDeleteRow(r)}
                      >
                        {rowPending?.id === r.subscriber_id && rowPending.kind === 'delete'
                          ? '처리 중…'
                          : '삭제'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
                    {listLoading ? '불러오는 중...' : '데이터가 없습니다.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>총 {total}건</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-40"
            disabled={page <= 1 || listLoading}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </button>
          <span className="min-w-[3.5rem] text-center tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-40"
            disabled={page >= totalPages || listLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      </div>
    </section>
  )
}
