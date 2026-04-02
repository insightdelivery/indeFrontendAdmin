'use client'

import { useEffect, useMemo, useState } from 'react'
import { cancelMessageBatch, getMessageBatch, getMessageBatches, resendFailed, syncMessageBatchResult } from '@/services/messages'

type HistoryRow = {
  no: number
  batchId: number
  from: string
  type: string
  count: number
  successCount: number
  failCount: number
  status: string
  content: string
  date: string
  scheduledAt: string | null
  recipients: string[]
}

function formatKstDateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
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

function isScheduledTimePassed(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false
  const scheduledDate = new Date(scheduledAt)
  if (Number.isNaN(scheduledDate.getTime())) return false
  return scheduledDate.getTime() <= Date.now()
}

export default function SmsKakaoHistoryPage() {
  const [tab, setTab] = useState<'send' | 'reserve'>('send')
  const [selectedRecipients, setSelectedRecipients] = useState<string[] | null>(null)
  const [selectedContent, setSelectedContent] = useState<{ content: string; type: string; batchId: number } | null>(null)
  const [serverRows, setServerRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncSummary, setSyncSummary] = useState<{
    batchId: number
    updatedCount: number
    pendingCount: number
    successCount: number
    failCount: number
    excludedCount: number
  } | null>(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const data = await getMessageBatches()
      const smsKakaoOnly = data.filter((b) => b.type === 'sms' || b.type === 'kakao')
      const mapped = smsKakaoOnly.map((b, idx) => ({
        no: smsKakaoOnly.length - idx,
        batchId: b.id,
        from: b.sender,
        type: b.type === 'kakao' ? '카카오' : '문자',
        count: b.total_count,
        successCount: b.success_count,
        failCount: b.fail_count,
        status: b.status,
        content: b.content,
        date: b.requested_at,
        scheduledAt: b.scheduled_at ?? null,
        recipients: [],
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

  const dataSource = serverRows
  const shownRows = useMemo(() => {
    if (tab === 'send') {
      return dataSource.filter((r) => r.status !== 'scheduled')
    }
    return dataSource.filter((r) => r.status === 'scheduled')
  }, [tab, dataSource])

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 relative">
      <h1 className="text-lg font-semibold text-gray-900">문자 전송 내역</h1>
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
              <th className="px-4 py-3">발신 번호</th>
              <th className="px-4 py-3 text-center">전송 수단</th>
              <th className="px-4 py-3 text-center">배치 상태</th>
              <th className="px-4 py-3 text-center">수신자 수</th>
              <th className="px-4 py-3 text-center">성공/실패</th>
              <th className="px-4 py-3 text-center">내용</th>
              <th className="px-4 py-3 text-center">전송 일시</th>
              <th className="px-4 py-3 text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {shownRows.map((row) => (
              <tr key={row.no} className="hover:bg-slate-50">
                <td className="px-4 py-4">{row.no}</td>
                <td className="px-4 py-4">{row.from}</td>
                <td className="px-4 py-4 text-center">{row.type}</td>
                <td className="px-4 py-4 text-center">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-700">{row.status}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    className="text-violet-700 underline underline-offset-2"
                    onClick={async () => {
                      try {
                        const detail = await getMessageBatch(row.batchId)
                        const phones = (detail.details ?? []).flatMap((d) =>
                          d.receiver_phone ? [d.receiver_phone] : []
                        )
                        setSelectedRecipients(phones.length > 0 ? phones : row.recipients)
                      } catch {
                        setSelectedRecipients(row.recipients)
                      }
                    }}
                  >
                    {row.count}
                  </button>
                </td>
                <td className="px-4 py-4 text-center">{row.successCount}/{row.failCount}</td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="max-w-[360px] truncate text-slate-700">{row.content}</span>
                    <button
                      type="button"
                      className="shrink-0 text-sm font-semibold text-slate-700 underline underline-offset-2"
                      onClick={async () => {
                        try {
                          const detail = await getMessageBatch(row.batchId)
                          const content = detail.details?.[0]?.final_content || row.content
                          setSelectedContent({ content, type: row.type, batchId: row.batchId })
                        } catch {
                          setSelectedContent({ content: row.content, type: row.type, batchId: row.batchId })
                        }
                      }}
                    >
                      내용 확인
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">{formatKstDateTime(row.date)}</td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {row.status === 'scheduled' && !isScheduledTimePassed(row.scheduledAt) ? (
                      <button
                        type="button"
                        className="text-rose-500 underline"
                        onClick={async () => {
                          try {
                            await cancelMessageBatch(row.batchId)
                            await loadHistory()
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : '예약취소에 실패했습니다.')
                          }
                        }}
                      >
                        예약취소
                      </button>
                    ) : null}
                    {row.failCount > 0 ? (
                      <button
                        type="button"
                        className="text-violet-700 underline"
                        onClick={async () => {
                          try {
                            await resendFailed(row.batchId)
                            await loadHistory()
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : '실패 재전송에 실패했습니다.')
                          }
                        }}
                      >
                        실패 재전송
                      </button>
                    ) : null}
                    {row.type === '문자' &&
                    row.status !== 'canceled' &&
                    (row.status !== 'scheduled' || isScheduledTimePassed(row.scheduledAt)) ? (
                      <button
                        type="button"
                        className="text-slate-700 underline"
                        onClick={async () => {
                          try {
                            const result = await syncMessageBatchResult(row.batchId)
                            await loadHistory()
                            setSyncSummary({
                              batchId: result.batch_id,
                              updatedCount: result.updated_count,
                              pendingCount: result.pending_count,
                              successCount: result.success_count,
                              failCount: result.fail_count,
                              excludedCount: result.excluded_count,
                            })
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : '결과 동기화에 실패했습니다.')
                          }
                        }}
                      >
                        결과동기화
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {shownRows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-400" colSpan={9}>데이터가 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedRecipients ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">수신자 휴대폰 번호</h3>
            <p className="mt-1 text-slate-500">총 {selectedRecipients.length}건</p>
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr><th className="px-3 py-2 text-left">No</th><th className="px-3 py-2 text-left">휴대폰 번호</th></tr>
                </thead>
                <tbody>
                  {selectedRecipients.map((phone, idx) => (
                    <tr key={`${phone}-${idx}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={() => setSelectedRecipients(null)}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedContent ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">발송 내용 확인</h3>
            <p className="mt-1 text-slate-500">batch_id: {selectedContent.batchId} / 전송수단: {selectedContent.type}</p>
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {selectedContent.content}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={() => setSelectedContent(null)}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}

      {syncSummary ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">결과 동기화 완료</h3>
            <p className="mt-1 text-slate-500">batch_id: {syncSummary.batchId}</p>
            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>업데이트: {syncSummary.updatedCount}건</p>
              <p>대기: {syncSummary.pendingCount}건</p>
              <p>성공: {syncSummary.successCount}건</p>
              <p>실패: {syncSummary.failCount}건</p>
              <p>제외: {syncSummary.excludedCount}건</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={() => setSyncSummary(null)}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
