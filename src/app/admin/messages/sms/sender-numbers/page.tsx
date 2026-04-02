'use client'

import { useEffect, useState } from 'react'
import { createSenderNumber, deleteSenderNumber, getSenderNumbers, type SenderNumber } from '@/services/messages'

export default function SmsSenderNumbersPage() {
  const [rows, setRows] = useState<SenderNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newManager, setNewManager] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRows = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSenderNumbers()
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '발신번호 조회에 실패했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  const count = rows.length
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">발신번호 관리</h1>
          <p className="mt-2 text-sm text-gray-600">발신번호: {count}</p>
        </div>
        <button type="button" onClick={() => setOpenCreate(true)} className="h-10 rounded-lg bg-violet-600 px-5 text-sm font-medium text-white">
          발신번호 등록
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">발신번호</th>
              <th className="px-4 py-3">담당자</th>
              <th className="px-4 py-3">코멘트</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-4">{count - idx}</td>
                <td className="px-4 py-4">{row.sender_number}</td>
                <td className="px-4 py-4">{row.manager_name || '-'}</td>
                <td className="px-4 py-4">{row.comment || '-'}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className="text-rose-500 underline underline-offset-2"
                    onClick={async () => {
                      if (!window.confirm(`${row.sender_number} 발신번호를 삭제하시겠습니까?`)) return
                      try {
                        await deleteSenderNumber(row.id)
                        await loadRows()
                      } catch (e) {
                        window.alert(e instanceof Error ? e.message : '발신번호 삭제에 실패했습니다.')
                      }
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
                  {loading ? '불러오는 중...' : '등록된 발신번호가 없습니다.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openCreate ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">발신번호 등록</h3>
            <p className="mt-2 text-sm text-slate-500">등록한 발신번호는 문자/카카오 발신번호 선택값으로 사용됩니다.</p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-slate-500">전기통신사업법 개정안(84조의2)에 따라</p>
              <p className="mt-2 text-base font-semibold text-slate-800">번호인증으로 등록된 발신번호로만 문자메시지발송이 가능합니다.</p>
              <p className="mt-2 text-sm text-slate-600">* 업체 전화번호(일반/대표번호) 또는 핸드폰번호를 입력해 주세요.</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">알리고에 등록후 입력해주세요</p>
            </div>
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="발신번호를 입력하세요(숫자만)"
              className="mt-4 h-12 w-full rounded-lg border border-slate-300 px-3"
            />
            <input
              value={newManager}
              onChange={(e) => setNewManager(e.target.value)}
              placeholder="담당자를 입력하세요"
              className="mt-3 h-12 w-full rounded-lg border border-slate-300 px-3"
            />
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="코멘트를 입력하세요"
              className="mt-3 h-12 w-full rounded-lg border border-slate-300 px-3"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpenCreate(false)} className="h-10 rounded-lg border border-slate-300 px-5">
                취소
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  if (!newNumber.trim()) {
                    window.alert('발신번호를 입력해 주세요.')
                    return
                  }
                  if (!newManager.trim()) {
                    window.alert('담당자를 입력해 주세요.')
                    return
                  }
                  try {
                    setSubmitting(true)
                    await createSenderNumber({
                      sender_number: newNumber,
                      manager_name: newManager.trim(),
                      comment: newComment.trim(),
                      request_type: 'manual',
                      status: 'approved',
                    })
                    setNewNumber('')
                    setNewManager('')
                    setNewComment('')
                    setOpenCreate(false)
                    await loadRows()
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : '발신번호 등록에 실패했습니다.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                className="h-10 rounded-lg bg-violet-600 px-5 text-white disabled:opacity-60"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
