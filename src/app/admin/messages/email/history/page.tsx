'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cancelMessageBatch, getMessageBatch, getMessageBatches } from '@/services/messages'

type EmailHistoryRow = {
  no: number
  batchId: number
  sender: string
  title: string
  content: string
  count: number
  successCount: number
  failCount: number
  status: string
  requestedAt: string
  scheduledAt: string | null | undefined
  completedAt: string | null | undefined
}

/** 예약 건이 아직 발송 큐에서 처리되지 않은 상태(scheduled) — 취소 가능 */
function canCancelScheduledReserve(row: EmailHistoryRow): boolean {
  return row.status === 'scheduled'
}

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

export default function EmailHistoryPage() {
  const [tab, setTab] = useState<'send' | 'reserve'>('send')
  const [serverRows, setServerRows] = useState<EmailHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<string[] | null>(null)
  const [selectedContent, setSelectedContent] = useState<{ title: string; body: string; batchId: number } | null>(null)
  const [openingContent, setOpeningContent] = useState<number | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<EmailHistoryRow | null>(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const data = await getMessageBatches({ type: 'email' })
      const sorted = [...data].sort((a, b) => {
        const ta = new Date(a.completed_at || a.requested_at).getTime()
        const tb = new Date(b.completed_at || b.requested_at).getTime()
        if (tb !== ta) return tb - ta
        return b.id - a.id
      })
      const mapped: EmailHistoryRow[] = sorted.map((b, idx) => ({
        no: idx + 1,
        batchId: b.id,
        sender: b.sender,
        title: b.title || '',
        content: b.content || '',
        count: b.total_count,
        successCount: b.success_count,
        failCount: b.fail_count,
        status: b.status,
        requestedAt: b.requested_at,
        scheduledAt: b.scheduled_at,
        completedAt: b.completed_at,
      }))
      setServerRows(mapped)
    } catch (e) {
      setServerRows([])
      setLoadError(e instanceof Error ? e.message : '전송내역 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const openContentByTitle = async (row: EmailHistoryRow) => {
    try {
      setOpeningContent(row.batchId)
      const detail = await getMessageBatch(row.batchId)
      const body = detail.details?.[0]?.final_content || detail.content || row.content
      setSelectedContent({
        title: detail.title || row.title || '(제목 없음)',
        body,
        batchId: row.batchId,
      })
    } catch {
      setSelectedContent({
        title: row.title || '(제목 없음)',
        body: row.content,
        batchId: row.batchId,
      })
    } finally {
      setOpeningContent(null)
    }
  }

  const shownRows = useMemo(() => {
    if (tab === 'send') {
      return serverRows.filter((r) => r.status !== 'scheduled')
    }
    return serverRows.filter((r) => r.status === 'scheduled')
  }, [tab, serverRows])

  return (
    <section className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 flex justify-between">
        <div className="flex gap-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('send')}
            className={`pb-3 text-sm font-medium ${tab === 'send' ? 'border-b-2 border-[#3c83cf] text-[#3c83cf]' : 'text-slate-400'}`}
          >
            전송
          </button>
          <button
            type="button"
            onClick={() => setTab('reserve')}
            className={`pb-3 text-sm font-medium ${tab === 'reserve' ? 'border-b-2 border-[#3c83cf] text-[#3c83cf]' : 'text-slate-400'}`}
          >
            예약
          </button>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={loadHistory}>
            {loading ? '불러오는 중...' : '새로고침'}
          </Button>
        </div>
        {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-16" />
              <col className="w-[220px]" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-24" />
              <col />
              <col className="w-[170px]" />
              <col className="w-[170px]" />
              <col className="w-28" />
            </colgroup>
            <thead className="bg-[#03213b] border-b border-white/15">
              <tr>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>No</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>발송자(E-MAIL)</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>상태</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>수신자수</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>성공/실패</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>제목</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>전송 일시</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>전송 완료 일시</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {shownRows.map((row) => (
                <tr key={row.batchId} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-center align-middle tabular-nums text-gray-600">{row.no}</td>
                  <td className="px-3 py-3 align-middle break-all text-sm text-[#000]">{row.sender}</td>
                  <td className="px-3 py-3 text-center align-middle">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{row.status}</span>
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    <button
                      type="button"
                      className="text-[#3c83cf] underline underline-offset-2"
                      onClick={async () => {
                        try {
                          const detail = await getMessageBatch(row.batchId)
                          const emails =
                            detail.details?.map((d) => d.receiver_email || d.receiver_phone || '-').filter(Boolean) || []
                          setSelectedRecipients(emails.length ? emails : [`총 ${row.count}건 (상세 없음)`])
                        } catch {
                          setSelectedRecipients([`총 ${row.count}건`])
                        }
                      }}
                    >
                      {row.count}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center align-middle tabular-nums">
                    {row.successCount}/{row.failCount}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <button
                      type="button"
                      disabled={openingContent === row.batchId}
                      className="w-full truncate text-left text-sm font-medium text-[#000] hover:no-underline disabled:opacity-60"
                      title="클릭하여 본문 보기"
                      onClick={() => void openContentByTitle(row)}
                    >
                      {openingContent === row.batchId ? '불러오는 중…' : row.title || '—'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center align-middle whitespace-nowrap tabular-nums text-gray-600">{formatKstDateTime(row.requestedAt)}</td>
                  <td className="px-3 py-3 text-center align-middle whitespace-nowrap tabular-nums text-gray-600">{formatKstDateTime(row.completedAt)}</td>
                  <td className="px-3 py-2 text-center align-middle">
                    {tab === 'reserve' && canCancelScheduledReserve(row) ? (
                      <button
                        type="button"
                        disabled={cancellingId === row.batchId}
                        className="text-sm font-medium text-rose-600 underline underline-offset-2 hover:text-rose-800 disabled:opacity-50"
                        onClick={() => {
                          setCancelConfirmTarget(row)
                          setCancelConfirmOpen(true)
                        }}
                      >
                        {cancellingId === row.batchId ? '처리 중…' : '발송 취소'}
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {shownRows.length === 0 ? (
                <tr>
                  <td className="p-12 text-center text-gray-500" colSpan={9}>
                    {loading ? '불러오는 중...' : '데이터가 없습니다.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={selectedRecipients != null} onOpenChange={(open) => (!open ? setSelectedRecipients(null) : null)}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">수신 이메일</DialogTitle>
            <DialogDescription className="text-slate-200">
              총 {selectedRecipients?.length ?? 0}건
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">No</th>
                    <th className="px-3 py-2 text-left">이메일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedRecipients ?? []).map((em, idx) => (
                    <tr key={`${em}-${idx}`}>
                      <td className="px-3 py-2 tabular-nums text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 break-all text-slate-800">{em}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRecipients(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedContent != null} onOpenChange={(open) => (!open ? setSelectedContent(null) : null)}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {selectedContent?.title || '(제목 없음)'}
            </DialogTitle>
            <DialogDescription className="text-slate-200">
              batch_id: {selectedContent?.batchId ?? '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {selectedContent?.body ?? ''}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedContent(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          setCancelConfirmOpen(open)
          if (!open) setCancelConfirmTarget(null)
        }}
      >
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">예약 발송 취소</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              batch_id {cancelConfirmTarget?.batchId ?? '-'} 예약 발송을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCancelConfirmOpen(false)} disabled={cancellingId != null}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              disabled={cancellingId != null || cancelConfirmTarget == null}
              onClick={async () => {
                if (!cancelConfirmTarget) return
                try {
                  setCancellingId(cancelConfirmTarget.batchId)
                  await cancelMessageBatch(cancelConfirmTarget.batchId)
                  setCancelConfirmOpen(false)
                  setCancelConfirmTarget(null)
                  await loadHistory()
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : '발송 취소에 실패했습니다.')
                } finally {
                  setCancellingId(null)
                }
              }}
            >
              {cancellingId != null ? '처리 중…' : '취소 진행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
