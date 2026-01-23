'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { AdminMember } from '@/services/admin'

// 폼 스키마 정의
const adminFormSchema = z.object({
  memberShipId: z.string().min(1, '회원 ID를 입력해주세요').max(50, '회원 ID는 50자 이하여야 합니다'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다').optional().or(z.literal('')),
  password_confirm: z.string().optional().or(z.literal('')),
  memberShipName: z.string().min(1, '이름을 입력해주세요').max(100, '이름은 100자 이하여야 합니다'),
  memberShipEmail: z.string().email('올바른 이메일 주소를 입력해주세요'),
  memberShipPhone: z.string().optional().or(z.literal('')),
  memberShipLevel: z.number().min(1).max(10).default(1),
  is_admin: z.boolean().default(false),
  is_active: z.boolean().optional(),
}).refine((data) => {
  // 수정 모드가 아니거나 비밀번호가 입력된 경우에만 비밀번호 확인
  if (data.password || data.password_confirm) {
    return data.password === data.password_confirm
  }
  return true
}, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
})

type AdminFormData = z.infer<typeof adminFormSchema>

interface AdminFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AdminFormData) => Promise<void>
  admin?: AdminMember | null
  mode: 'create' | 'edit'
}

export function AdminFormModal({
  open,
  onOpenChange,
  onSubmit,
  admin,
  mode,
}: AdminFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      memberShipId: '',
      password: '',
      password_confirm: '',
      memberShipName: '',
      memberShipEmail: '',
      memberShipPhone: '',
      memberShipLevel: 1,
      is_admin: false,
      is_active: true,
    },
  })

  // 수정 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && admin) {
        reset({
          memberShipId: admin.memberShipId,
          password: '',
          password_confirm: '',
          memberShipName: admin.memberShipName,
          memberShipEmail: admin.memberShipEmail,
          memberShipPhone: admin.memberShipPhone || '',
          memberShipLevel: admin.memberShipLevel,
          is_admin: admin.is_admin,
          is_active: admin.is_active,
        })
      } else {
        reset({
          memberShipId: '',
          password: '',
          password_confirm: '',
          memberShipName: '',
          memberShipEmail: '',
          memberShipPhone: '',
          memberShipLevel: 1,
          is_admin: false,
          is_active: true,
        })
      }
    }
  }, [open, admin, mode, reset])

  const isEditMode = mode === 'edit'
  const passwordValue = watch('password')

  const onFormSubmit = async (data: AdminFormData) => {
    // 수정 모드이고 비밀번호가 비어있으면 비밀번호 필드 제거
    if (isEditMode && !data.password) {
      const { password, password_confirm, ...rest } = data
      await onSubmit(rest as AdminFormData)
    } else {
      await onSubmit(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '관리자 수정' : '관리자 등록'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '관리자 정보를 수정합니다. 비밀번호는 변경할 경우에만 입력하세요.'
              : '새로운 관리자를 등록합니다.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            {/* 회원 ID */}
            <div className="space-y-2">
              <Label htmlFor="memberShipId">
                회원 ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="memberShipId"
                {...register('memberShipId')}
                disabled={isEditMode} // 수정 모드에서는 ID 변경 불가
                placeholder="회원 ID를 입력하세요"
              />
              {errors.memberShipId && (
                <p className="text-sm text-red-600">{errors.memberShipId.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">
                비밀번호 {!isEditMode && <span className="text-red-500">*</span>}
                {isEditMode && <span className="text-gray-500 text-xs">(변경 시에만 입력)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={isEditMode ? '변경할 비밀번호를 입력하세요' : '비밀번호를 입력하세요 (최소 8자)'}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            {(!isEditMode || passwordValue) && (
              <div className="space-y-2">
                <Label htmlFor="password_confirm">
                  비밀번호 확인 {!isEditMode && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="password_confirm"
                  type="password"
                  {...register('password_confirm')}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                {errors.password_confirm && (
                  <p className="text-sm text-red-600">{errors.password_confirm.message}</p>
                )}
              </div>
            )}

            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="memberShipName">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="memberShipName"
                {...register('memberShipName')}
                placeholder="이름을 입력하세요"
              />
              {errors.memberShipName && (
                <p className="text-sm text-red-600">{errors.memberShipName.message}</p>
              )}
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="memberShipEmail">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="memberShipEmail"
                type="email"
                {...register('memberShipEmail')}
                placeholder="이메일을 입력하세요"
              />
              {errors.memberShipEmail && (
                <p className="text-sm text-red-600">{errors.memberShipEmail.message}</p>
              )}
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="memberShipPhone">전화번호</Label>
              <Input
                id="memberShipPhone"
                {...register('memberShipPhone')}
                placeholder="전화번호를 입력하세요 (선택)"
              />
              {errors.memberShipPhone && (
                <p className="text-sm text-red-600">{errors.memberShipPhone.message}</p>
              )}
            </div>

            {/* 회원 레벨 */}
            <div className="space-y-2">
              <Label htmlFor="memberShipLevel">회원 레벨</Label>
              <Input
                id="memberShipLevel"
                type="number"
                min="1"
                max="10"
                {...register('memberShipLevel', { valueAsNumber: true })}
                placeholder="1-10 사이의 레벨을 입력하세요"
              />
              {errors.memberShipLevel && (
                <p className="text-sm text-red-600">{errors.memberShipLevel.message}</p>
              )}
            </div>

            {/* 관리자 여부 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_admin"
                {...register('is_admin')}
                className="h-4 w-4 rounded border-gray-300 text-neon-yellow focus:ring-neon-yellow"
              />
              <Label htmlFor="is_admin" className="cursor-pointer">
                관리자 권한 부여
              </Label>
            </div>

            {/* 활성화 여부 (수정 모드에서만 표시) */}
            {isEditMode && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="h-4 w-4 rounded border-gray-300 text-neon-yellow focus:ring-neon-yellow"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  활성화 (비활성화된 관리자를 다시 활성화할 수 있습니다)
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="bg-neon-yellow text-black hover:bg-opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? '처리 중...' : isEditMode ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

