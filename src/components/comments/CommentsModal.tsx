'use client'

import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  type AdminStaffMember,
  createAdminReply,
  deleteAdminComment,
  fetchAdminComments,
  updateAdminReply,
  type AdminCommentItem,
  type CommentContentType,
} from '@/services/contentComments'

const COMMENT_MAX_LENGTH = 500

export function CommentsModal({
  open,
  onOpenChange,
  contentType,
  contentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: CommentContentType
  contentId: number
}) {
  const [items, setItems] = useState<AdminCommentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staffMembers, setStaffMembers] = useState<AdminStaffMember[]>([])
  const [selectedStaffSid, setSelectedStaffSid] = useState<number | null>(null)
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({})
  const [replyComposerOpenId, setReplyComposerOpenId] = useState<number | null>(null)
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAdminComments({ contentType, contentId })
      setItems(res.list ?? [])
      const staffs = res.staffMembers ?? []
      setStaffMembers(staffs)
      setSelectedStaffSid((prev) => prev ?? (staffs[0]?.member_sid ?? null))
    } catch (e) {
      setError(e instanceof Error ? e.message : '댓글을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [open, contentType, contentId])

  useEffect(() => {
    void load()
    setReplyDraft({})
    setReplyComposerOpenId(null)
    setEditingReplyId(null)
    setEditingText('')
  }, [load])

  const submitReply = useCallback(
    async (parentId: number) => {
      const t = (replyDraft[parentId] ?? '').trim()
      if (!t) return
      try {
        if (selectedStaffSid != null) {
          await createAdminReply({ parentId, commentText: t, adminMemberSid: selectedStaffSid })
        } else {
          await createAdminReply({ parentId, commentText: t })
        }
        setReplyDraft((prev) => ({ ...prev, [parentId]: '' }))
        setReplyComposerOpenId(null)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : '대댓글 작성에 실패했습니다.')
      }
    },
    [replyDraft, selectedStaffSid, load]
  )

  const startEditReply = useCallback((id: number, text: string) => {
    setEditingReplyId(id)
    setEditingText(text)
  }, [])

  const saveEditReply = useCallback(async () => {
    if (!editingReplyId) return
    const t = editingText.trim()
    if (!t) return
    try {
      await updateAdminReply({ commentId: editingReplyId, commentText: t })
      setEditingReplyId(null)
      setEditingText('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '대댓글 수정에 실패했습니다.')
    }
  }, [editingReplyId, editingText, load])

  const remove = useCallback(
    async (id: number) => {
      if (!confirm('삭제하시겠습니까?')) return
      try {
        await deleteAdminComment(id)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : '댓글 삭제에 실패했습니다.')
      }
    },
    [load]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>댓글 관리</DialogTitle>
          <DialogDescription className="sr-only">
            댓글 목록을 확인하고 관리자 대댓글을 작성, 수정, 삭제할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-500">불러오는 중...</p> : null}

        <div className="max-h-[70vh] overflow-auto space-y-6 pr-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {c.user?.nickname ?? c.user?.email ?? '—'}{' '}
                    {c.user?.isAdmin ? <span className="text-xs text-gray-500">(관리자)</span> : null}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.text}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove(c.id)}>
                  삭제
                </Button>
              </div>

              <div className="mt-4 space-y-3 pl-5">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setReplyComposerOpenId((prev) => (prev === c.id ? null : c.id))
                    }
                  >
                    댓글 달기
                  </Button>
                </div>

                {c.replies?.map((r) => (
                  <div key={r.id} className="rounded-md bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700">
                          {r.user?.nickname ?? r.user?.email ?? '관리자'}{' '}
                          {r.user?.isAdmin ? <span className="text-[11px] text-gray-500">(관리자 답변)</span> : null}
                        </p>
                        {editingReplyId === r.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editingText}
                              maxLength={COMMENT_MAX_LENGTH}
                              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setEditingText(e.target.value.slice(0, COMMENT_MAX_LENGTH))
                              }
                              className="min-h-[80px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" onClick={() => setEditingReplyId(null)}>
                                취소
                              </Button>
                              <Button onClick={() => void saveEditReply()}>저장</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.text}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEditReply(r.id, r.text)}>
                          수정
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove(r.id)}>
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {replyComposerOpenId === c.id ? (
                  <div className="rounded-md border border-gray-200 p-3">
                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-gray-600">작성자 선택</label>
                      <select
                        className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
                        value={selectedStaffSid ?? ''}
                        onChange={(e) => setSelectedStaffSid(e.target.value ? Number(e.target.value) : null)}
                      >
                        {staffMembers.map((m) => (
                          <option key={m.member_sid} value={m.member_sid}>
                            {m.nickname || m.email} ({m.member_sid})
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={replyDraft[c.id] ?? ''}
                      maxLength={COMMENT_MAX_LENGTH}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setReplyDraft((prev) => ({
                          ...prev,
                          [c.id]: e.target.value.slice(0, COMMENT_MAX_LENGTH),
                        }))
                      }
                      placeholder="대댓글을 입력하세요"
                      className="min-h-[80px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setReplyComposerOpenId(null)}>
                        취소
                      </Button>
                      <Button onClick={() => void submitReply(c.id)}>등록</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {!loading && items.length === 0 ? <p className="text-sm text-gray-500">댓글이 없습니다.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

