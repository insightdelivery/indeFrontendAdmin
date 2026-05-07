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
  createSenderEmail,
  deleteSenderEmail,
  getSenderEmails,
  type SenderEmail,
} from '@/services/messages'

export default function EmailSenderEmailsPage() {
  const [rows, setRows] = useState<SenderEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SenderEmail | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deleteSenderEmail(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadRows()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '발신 이메일 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="relative space-y-2">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-700">
            등록된 발신 이메일 <span className="tabular-nums text-[#000]">{count}</span>건
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
              발신 이메일 등록
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
              <col className="w-[280px]" />
              <col className="w-[180px]" />
              <col />
              <col className="w-28" />
            </colgroup>
            <thead className="bg-[#03213b] border-b border-white/15">
              <tr>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>No</th>
                <th className={`${ADMIN_CONTENT_TABLE_HEAD_TH} text-center h-12`}>발신 이메일</th>
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
                  <td className="px-3 py-3 align-middle text-center font-medium text-[#000] break-all">
                    {row.sender_email}
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
                    {loading ? '불러오는 중...' : '등록된 발신 이메일이 없습니다.'}
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
            <DialogTitle className="text-lg font-semibold text-white">발신 이메일 등록</DialogTitle>
            <DialogDescription className="text-slate-200">
              등록한 주소는 이메일 전송 화면의 발신 이메일 선택 목록에 표시됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="발신 이메일 주소"
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
                  window.alert(
                    e instanceof Error ? e.message : '발신 이메일 등록에 실패했습니다.',
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
            <DialogTitle className="text-lg font-semibold text-white">발신 이메일 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              {deleteTarget?.sender_email ?? '—'} 발신 이메일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
