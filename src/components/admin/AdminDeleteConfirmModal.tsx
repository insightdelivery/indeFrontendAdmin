'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AdminMember } from '@/services/admin'
import { AlertTriangle } from 'lucide-react'

interface AdminDeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: AdminMember | null
  onConfirm: () => Promise<void>
}

export function AdminDeleteConfirmModal({
  open,
  onOpenChange,
  admin,
  onConfirm,
}: AdminDeleteConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // 에러는 상위 컴포넌트에서 처리
      throw error
    }
  }

  if (!admin) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">관리자 삭제 확인</DialogTitle>
              <DialogDescription className="mt-1">
                이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-900 mb-2">
              다음 관리자를 삭제(비활성화)하시겠습니까?
            </p>
            <div className="bg-white rounded-md p-3 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">관리자 ID:</span>
                <span className="text-sm font-medium text-gray-900">{admin.memberShipId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">이름:</span>
                <span className="text-sm font-medium text-gray-900">{admin.memberShipName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">이메일:</span>
                <span className="text-sm font-medium text-gray-900">{admin.memberShipEmail}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              <strong>참고:</strong> 관리자는 완전히 삭제되지 않고 <strong>비활성화</strong>됩니다.
              비활성화된 관리자는 로그인할 수 없으며, 필요시 나중에 다시 활성화할 수 있습니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleConfirm}
          >
            삭제 (비활성화)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}





