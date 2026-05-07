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
          <Button type="button" variant="outline" size="sm" onClick={() => void loadHistory()}>
            {loading ? '불러오는 중...' : '새로고침'}
          </Button>
        </div>
        {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-16" />
              <col className="w-[160px]" />
              <col className="w-24" />
              <col className="w-[120px]" />
              <col className="w-24" />
              <col className="w-[120px]" />
              <col />
              <col className="w-[170px]" />
              <col className="w-[220px]" />
            </colgroup>
            <thead className="bg-[#03213b] border-b border-white/15">
              <tr>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>No</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>발신 번호</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>전송 수단</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>배치 상태</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>수신자 수</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>성공/실패</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>내용</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>전송 일시</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {shownRows.map((row) => (
                <tr key={row.batchId} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-center align-middle tabular-nums text-gray-600">{row.no}</td>
                  <td className="px-3 py-3 text-center align-middle text-sm text-[#000]">{row.from}</td>
                  <td className="px-3 py-3 text-center align-middle text-sm text-gray-700">{row.type}</td>
                  <td className="px-3 py-3 text-center align-middle">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-700">{row.status}</span>
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    <button
                      type="button"
                      className="text-[#3c83cf] underline underline-offset-2"
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
                  <td className="px-3 py-3 text-center align-middle tabular-nums">
                    {row.successCount}/{row.failCount}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span className="max-w-[360px] truncate text-slate-700">{row.content}</span>
                      <button
                        type="button"
                        className="shrink-0 text-sm font-medium text-[#3c83cf] underline underline-offset-2"
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
                  <td className="px-3 py-3 text-center align-middle whitespace-nowrap tabular-nums text-gray-600">{formatKstDateTime(row.date)}</td>
                  <td className="px-3 py-3 text-center align-middle">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {row.type === '카카오' && row.aligoKakaoMid ? (
                        <button
                          type="button"
                          className="text-[#3c83cf] underline underline-offset-2"
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
                          className="text-[#3c83cf] underline"
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
                  <td className="p-12 text-center text-gray-500" colSpan={9}>데이터가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={selectedRecipients != null} onOpenChange={(open) => (!open ? setSelectedRecipients(null) : null)}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">수신자 휴대폰 번호</DialogTitle>
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
                    <th className="px-3 py-2 text-left">휴대폰 번호</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedRecipients ?? []).map((phone, idx) => (
                    <tr key={`${phone}-${idx}`}>
                      <td className="px-3 py-2 tabular-nums text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-800">{phone}</td>
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
            <DialogTitle className="text-lg font-semibold text-white">발송 내용 확인</DialogTitle>
            <DialogDescription className="text-slate-200">
              batch_id: {selectedContent?.batchId ?? '-'} / 전송수단: {selectedContent?.type ?? '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {selectedContent?.content ?? ''}
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
        open={aligoDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAligoDetailOpen(false)
            setAligoDetailBatchId(null)
            setAligoDetailMid(null)
            setAligoDetailRows([])
            setAligoDetailError(null)
            setAligoDetailMeta({})
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">알리고 알림톡 전송결과(상세)</DialogTitle>
            <DialogDescription className="text-slate-200">
              batch {aligoDetailBatchId ?? '-'} · mid {aligoDetailMid ?? '-'}
              {aligoDetailMeta.total_count != null
                ? ` · 총 ${String(aligoDetailMeta.total_count)}건 (페이지 ${String(aligoDetailMeta.current_page ?? 1)}/${String(aligoDetailMeta.total_page ?? 1)})`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {aligoDetailLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">불러오는 중…</p>
            ) : aligoDetailError ? (
              <p className="py-4 text-center text-sm text-rose-600">{aligoDetailError}</p>
            ) : aligoDetailRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                수신별 상세 내역이 없습니다. (전송 직후·24시간 이내 등 알리고 안내 참고)
              </p>
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
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={syncSummary != null} onOpenChange={(open) => (!open ? setSyncSummary(null) : null)}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">결과 동기화 완료</DialogTitle>
            <DialogDescription className="text-slate-200">
              batch_id: {syncSummary?.batchId ?? '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>업데이트: {syncSummary?.updatedCount ?? 0}건</p>
              <p>대기: {syncSummary?.pendingCount ?? 0}건</p>
              <p>성공: {syncSummary?.successCount ?? 0}건</p>
              <p>실패: {syncSummary?.failCount ?? 0}건</p>
              <p>제외: {syncSummary?.excludedCount ?? 0}건</p>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSyncSummary(null)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
