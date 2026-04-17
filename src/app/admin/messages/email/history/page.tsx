'use client'

import { useEffect, useMemo, useState } from 'react'
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
    <section className="relative space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="text-lg font-semibold text-gray-900">이메일 전송 내역</h1>
      <div className="flex justify-end">
        <button type="button" className="h-9 rounded-lg border border-slate-300 px-4 text-sm" onClick={loadHistory}>
          {loading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>
      {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      <div className="flex gap-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('send')}
          className={`pb-3 text-sm font-medium ${tab === 'send' ? 'border-b-2 border-violet-600 text-violet-700' : 'text-slate-400'}`}
        >
          전송
        </button>
        <button
          type="button"
          onClick={() => setTab('reserve')}
          className={`pb-3 text-sm font-medium ${tab === 'reserve' ? 'border-b-2 border-violet-600 text-violet-700' : 'text-slate-400'}`}
        >
          예약
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">발송자(E-MAIL)</th>
              <th className="px-4 py-3 text-center">상태</th>
              <th className="px-4 py-3 text-center">수신자수</th>
              <th className="px-4 py-3 text-center">성공/실패</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3 text-center">전송 일시</th>
              <th className="px-4 py-3 text-center">전송 완료 일시</th>
              <th className="px-4 py-3 text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {shownRows.map((row) => (
              <tr key={row.batchId} className="hover:bg-slate-50">
                <td className="px-4 py-4">{row.no}</td>
                <td className="px-4 py-4 break-all">{row.sender}</td>
                <td className="px-4 py-4 text-center">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{row.status}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    className="text-violet-700 underline underline-offset-2"
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
                <td className="px-4 py-4 text-center">
                  {row.successCount}/{row.failCount}
                </td>
                <td className="px-4 py-4 max-w-[min(360px,40vw)]">
                  <button
                    type="button"
                    disabled={openingContent === row.batchId}
                    className="w-full text-left font-medium text-violet-700 underline decoration-violet-400 underline-offset-2 hover:text-violet-900 disabled:opacity-60"
                    title="클릭하여 본문 보기"
                    onClick={() => void openContentByTitle(row)}
                  >
                    {openingContent === row.batchId ? '불러오는 중…' : row.title || '—'}
                  </button>
                </td>
                <td className="px-4 py-4 text-center whitespace-nowrap">{formatKstDateTime(row.requestedAt)}</td>
                <td className="px-4 py-4 text-center whitespace-nowrap">{formatKstDateTime(row.completedAt)}</td>
                <td className="px-4 py-4 text-center">
                  {tab === 'reserve' && canCancelScheduledReserve(row) ? (
                    <button
                      type="button"
                      disabled={cancellingId === row.batchId}
                      className="text-sm font-medium text-rose-600 underline underline-offset-2 hover:text-rose-800 disabled:opacity-50"
                      onClick={async () => {
                        if (!window.confirm('예약 발송을 취소하시겠습니까?')) return
                        try {
                          setCancellingId(row.batchId)
                          await cancelMessageBatch(row.batchId)
                          await loadHistory()
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : '발송 취소에 실패했습니다.')
                        } finally {
                          setCancellingId(null)
                        }
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
                <td className="px-4 py-10 text-center text-slate-400" colSpan={9}>
                  {loading ? '불러오는 중...' : '데이터가 없습니다.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedRecipients ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">수신 이메일</h3>
            <p className="mt-1 text-slate-500">총 {selectedRecipients.length}건</p>
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">No</th>
                    <th className="px-3 py-2 text-left">이메일</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipients.map((em, idx) => (
                    <tr key={`${em}-${idx}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 break-all">{em}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="h-10 rounded-lg bg-violet-600 px-5 text-white"
                onClick={() => setSelectedRecipients(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedContent ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">{selectedContent.title || '(제목 없음)'}</h3>
            <p className="mt-1 text-slate-500">batch_id: {selectedContent.batchId}</p>
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {selectedContent.body}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="h-10 rounded-lg bg-violet-600 px-5 text-white"
                onClick={() => setSelectedContent(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
