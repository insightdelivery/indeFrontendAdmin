'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PublicMemberListItem } from '@/types/publicMember'

export interface WithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: PublicMemberListItem | null
  onConfirm: (memberSid: number, payload: { reason?: string; detail_reason?: string }) => Promise<void>
}

export function WithdrawModal({ open, onOpenChange, member, onConfirm }: WithdrawModalProps) {
  const [reason, setReason] = useState('')
  const [detailReason, setDetailReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    setReason('')
    setDetailReason('')
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!member) return
    setSubmitting(true)
    try {
      await onConfirm(member.member_sid, {
        reason: reason.trim() || undefined,
        detail_reason: detailReason.trim() || undefined,
      })
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
        <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
          <DialogTitle className="text-lg font-semibold text-white">회원 탈퇴 처리</DialogTitle>
          <DialogDescription className="text-slate-200">
            이 회원을 탈퇴 처리하시겠습니까? 탈퇴 시 로그인이 불가하며, 복구는 수정 페이지에서 할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-4">
          {member ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium">대상</span>: {member.name} ({member.email})
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="withdraw-reason">탈퇴 사유 (선택)</Label>
            <Input
              id="withdraw-reason"
              placeholder="예: 관리자 판단에 의한 탈퇴"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="withdraw-detail">상세 사유 (선택)</Label>
            <Input
              id="withdraw-detail"
              placeholder="기타 메모"
              value={detailReason}
              onChange={(e) => setDetailReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            취소
          </Button>
          <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={handleConfirm} disabled={submitting}>
            {submitting ? '처리 중...' : '탈퇴 처리'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
