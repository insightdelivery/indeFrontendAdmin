'use client'

import { useEffect, useState } from 'react'
import { createSenderEmail, deleteSenderEmail, getSenderEmails, type SenderEmail } from '@/services/messages'

export default function EmailSenderEmailsPage() {
  const [rows, setRows] = useState<SenderEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newManager, setNewManager] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRows = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSenderEmails()
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '발신 이메일 조회에 실패했습니다.')
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
    <section className="relative space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">발신이메일 관리</h1>
          <p className="mt-2 text-sm text-gray-600">등록된 발신 이메일: {count}건</p>
        </div>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="h-10 rounded-lg bg-violet-600 px-5 text-sm font-medium text-white"
        >
          발신 이메일 등록
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">발신 이메일</th>
              <th className="px-4 py-3">담당자</th>
              <th className="px-4 py-3">코멘트</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-4">{count - idx}</td>
                <td className="px-4 py-4 break-all">{row.sender_email}</td>
                <td className="px-4 py-4">{row.manager_name || '-'}</td>
                <td className="px-4 py-4">{row.comment || '-'}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className="text-rose-500 underline underline-offset-2"
                    onClick={async () => {
                      if (!window.confirm(`${row.sender_email} 발신 이메일을 삭제하시겠습니까?`)) return
                      try {
                        await deleteSenderEmail(row.id)
                        await loadRows()
                      } catch (e) {
                        window.alert(e instanceof Error ? e.message : '발신 이메일 삭제에 실패했습니다.')
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
                  {loading ? '불러오는 중...' : '등록된 발신 이메일이 없습니다.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openCreate ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">발신 이메일 등록</h3>
            <p className="mt-2 text-sm text-slate-500">등록한 주소는 이메일 전송 화면의 발신 이메일 선택 목록에 표시됩니다.</p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="발신 이메일 주소"
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
                  if (!newEmail.trim()) {
                    window.alert('발신 이메일을 입력해 주세요.')
                    return
                  }
                  if (!newManager.trim()) {
                    window.alert('담당자를 입력해 주세요.')
                    return
                  }
                  try {
                    setSubmitting(true)
                    await createSenderEmail({
                      sender_email: newEmail.trim(),
                      manager_name: newManager.trim(),
                      comment: newComment.trim(),
                      request_type: 'manual',
                      status: 'approved',
                    })
                    setNewEmail('')
                    setNewManager('')
                    setNewComment('')
                    setOpenCreate(false)
                    await loadRows()
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : '발신 이메일 등록에 실패했습니다.')
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
