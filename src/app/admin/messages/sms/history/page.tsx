'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  cancelMessageBatch,
  getKakaoAligoHistoryDetail,
  getMessageBatch,
  getMessageBatches,
  resendFailed,
  syncMessageBatchResult,
} from '@/services/messages'

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
  /** 알리고 mid — 있으면 액션에서 전송결과(상세) 조회 */
  aligoKakaoMid: string | null
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  return String(v)
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
  const [aligoDetailOpen, setAligoDetailOpen] = useState(false)
  const [aligoDetailBatchId, setAligoDetailBatchId] = useState<number | null>(null)
  const [aligoDetailMid, setAligoDetailMid] = useState<string | null>(null)
  const [aligoDetailLoading, setAligoDetailLoading] = useState(false)
  const [aligoDetailError, setAligoDetailError] = useState<string | null>(null)
  const [aligoDetailRows, setAligoDetailRows] = useState<Array<Record<string, unknown>>>([])
  const [aligoDetailMeta, setAligoDetailMeta] = useState<{
    current_page?: string | number
    total_page?: string | number
    total_count?: string | number
  }>({})

  const loadHistory = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const data = await getMessageBatches()
      const smsKakaoOnly = data
        .filter((b) => b.type === 'sms' || b.type === 'kakao')
        .sort((a, b) => {
          const ta = new Date(a.completed_at || a.requested_at).getTime()
          const tb = new Date(b.completed_at || b.requested_at).getTime()
          if (tb !== ta) return tb - ta
          return b.id - a.id
        })
      const mapped = smsKakaoOnly.map((b, idx) => ({
        no: idx + 1,
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
        aligoKakaoMid: b.type === 'kakao' ? (b.aligo_kakao_mid ?? null) : null,
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
              <tr key={row.batchId} className="hover:bg-slate-50">
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
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {row.type === '카카오' && row.aligoKakaoMid ? (
                      <button
                        type="button"
                        className="text-violet-700 underline underline-offset-2"
                        onClick={async () => {
                          setAligoDetailOpen(true)
                          setAligoDetailBatchId(row.batchId)
                          setAligoDetailMid(row.aligoKakaoMid)
                          setAligoDetailLoading(true)
                          setAligoDetailError(null)
                          setAligoDetailRows([])
                          setAligoDetailMeta({})
                          try {
                            const r = await getKakaoAligoHistoryDetail(row.batchId, { page: 1, limit: 500 })
                            setAligoDetailRows(Array.isArray(r.list) ? r.list : [])
                            setAligoDetailMeta({
                              current_page: r.current_page,
                              total_page: r.total_page,
                              total_count: r.total_count,
                            })
                          } catch (e) {
                            setAligoDetailError(e instanceof Error ? e.message : '알리고 상세 조회에 실패했습니다.')
                          } finally {
                            setAligoDetailLoading(false)
                          }
                        }}
                      >
                        알리고 상세
                      </button>
                    ) : null}
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

      {aligoDetailOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">알리고 알림톡 전송결과(상세)</h3>
                <p className="mt-1 text-xs text-slate-500">
                  batch {aligoDetailBatchId ?? '-'} · mid {aligoDetailMid ?? '-'}
                  {aligoDetailMeta.total_count != null
                    ? ` · 총 ${String(aligoDetailMeta.total_count)}건 (페이지 ${String(aligoDetailMeta.current_page ?? 1)}/${String(aligoDetailMeta.total_page ?? 1)})`
                    : null}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                onClick={() => {
                  setAligoDetailOpen(false)
                  setAligoDetailBatchId(null)
                  setAligoDetailMid(null)
                  setAligoDetailRows([])
                  setAligoDetailError(null)
                  setAligoDetailMeta({})
                }}
              >
                닫기
              </button>
            </div>
            <div className="max-h-[calc(90vh-5rem)] overflow-auto p-5">
              {aligoDetailLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">불러오는 중…</p>
              ) : aligoDetailError ? (
                <p className="py-4 text-center text-sm text-rose-600">{aligoDetailError}</p>
              ) : aligoDetailRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">수신별 상세 내역이 없습니다. (전송 직후·24시간 이내 등 알리고 안내 참고)</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[880px] text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">수신번호</th>
                        <th className="px-3 py-2">결과(rslt)</th>
                        <th className="px-3 py-2">사유</th>
                        <th className="px-3 py-2">요청일</th>
                        <th className="px-3 py-2">전송일</th>
                        <th className="px-3 py-2">응답일</th>
                        <th className="px-3 py-2">tpl_code</th>
                        <th className="px-3 py-2">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aligoDetailRows.map((item, idx) => (
                        <tr key={`${cellStr(item.msgid)}-${idx}`}>
                          <td className="px-3 py-2 whitespace-nowrap">{cellStr(item.phone)}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-mono">{cellStr(item.rslt)}</td>
                          <td className="max-w-[200px] px-3 py-2 break-words">{cellStr(item.rslt_message)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{cellStr(item.reqdate)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{cellStr(item.sentdate)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{cellStr(item.rsltdate)}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{cellStr(item.tpl_code)}</td>
                          <td className="max-w-[280px] px-3 py-2 break-words text-slate-700">{cellStr(item.message)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
