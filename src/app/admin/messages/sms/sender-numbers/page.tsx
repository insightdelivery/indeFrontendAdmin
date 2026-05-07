'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import {
  createSenderNumber,
  deleteSenderNumber,
  getSenderNumbers,
  type SenderNumber,
} from '@/services/messages'

export default function SmsSenderNumbersPage() {
  const [rows, setRows] = useState<SenderNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SenderNumber | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deleteSenderNumber(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadRows()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '발신번호 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-700">
            등록된 발신번호 <span className="tabular-nums text-[#000]">{count}</span>건
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadRows()}>
              {loading ? '불러오는 중...' : '새로고침'}
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-black text-white hover:bg-gray-800"
              onClick={() => setOpenCreate(true)}
            >
              발신번호 등록
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-20" />
              <col className="w-[180px]" />
              <col className="w-[180px]" />
              <col />
              <col className="w-28" />
            </colgroup>
            <thead className="bg-[#03213b] border-b border-white/15">
              <tr>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>No</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>발신번호</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>담당자</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-left h-12`}>코멘트</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-center align-middle text-sm tabular-nums text-gray-600">
                    {count - idx}
                  </td>
                  <td className="px-3 py-3 align-middle text-center font-medium text-[#000]">
                    {row.sender_number}
                  </td>
                  <td className="px-3 py-3 align-middle text-center text-sm text-gray-700">
                    {row.manager_name || '-'}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-gray-700">
                    {row.comment || '-'}
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        setDeleteTarget(row)
                        setDeleteOpen(true)
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="p-12 text-center text-gray-500" colSpan={5}>
                    {loading ? '불러오는 중...' : '등록된 발신번호가 없습니다.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#308edc] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">발신번호 등록</DialogTitle>
            <DialogDescription className="text-slate-200">
              등록한 발신번호는 문자/카카오 발신번호 선택값으로 사용됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                전기통신사업법 개정안(84조의2)에 따라
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                번호인증으로 등록된 발신번호로만 문자메시지 발송이 가능합니다.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                업체 전화번호(일반/대표번호) 또는 핸드폰번호를 입력해 주세요.
              </p>
              <p className="mt-2 text-sm font-semibold text-[#308edc]">
                알리고에 등록한 후 입력해 주세요.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="발신번호를 입력하세요(숫자만)"
                className="h-10"
              />
              <Input
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
                placeholder="담당자를 입력하세요"
                className="h-10"
              />
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="코멘트를 입력하세요"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
              취소
            </Button>
            <Button
              type="button"
              disabled={submitting}
              className="bg-black text-white hover:bg-gray-800 disabled:opacity-60"
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
                  window.alert(
                    e instanceof Error ? e.message : '발신번호 등록에 실패했습니다.',
                  )
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">발신번호 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              {deleteTarget?.sender_number ?? '—'} 발신번호를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
