'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSysCodeFromCache, getSysCodeName } from '@/lib/syscode'
import type { PublicMemberDetail } from '@/types/publicMember'

const JOINED_VIA_LABEL: Record<string, string> = {
  LOCAL: '로컬',
  KAKAO: '카카오',
  NAVER: '네이버',
  GOOGLE: '구글',
}

/** 직분 코드 → 이름 (SYS26127B006) */
const POSITION_PARENT = 'SYS26127B006'
/** 국내 지역 코드 → 이름 (SYS26127B018) */
const REGION_DOMESTIC_PARENT = 'SYS26127B018'
/** 해외/지역 코드 → 이름 (SYS26127B017) */
const REGION_FOREIGN_PARENT = 'SYS26127B017'

function formatDate(s: string | null | undefined) {
  if (!s) return '-'
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 회원 상태 표시 라벨 (status 미반환 시 정상으로 간주) */
function getStatusLabel(status: string | undefined): string {
  if (status === 'WITHDRAWN') return '탈퇴'
  if (status === 'WITHDRAW_REQUEST') return '탈퇴 요청'
  return '정상'
}

/** 탈퇴 회원 여부 */
function isWithdrawn(detail: PublicMemberDetail): boolean {
  return detail.status === 'WITHDRAWN'
}

function resolvePositionName(position: string | null): string {
  if (!position) return '-'
  const codes = getSysCodeFromCache(POSITION_PARENT)
  return codes ? getSysCodeName(codes, position) : position
}

function resolveRegionDisplay(detail: PublicMemberDetail): string {
  const isDomestic = detail.region_type === 'DOMESTIC' || detail.region_type === 'SYS26127B018'
  const isForeign = detail.region_type === 'FOREIGN' || detail.region_type === 'SYS26127B019'
  if (isDomestic && detail.region_domestic) {
    const codes = getSysCodeFromCache(REGION_DOMESTIC_PARENT)
    return codes ? getSysCodeName(codes, detail.region_domestic) : detail.region_domestic
  }
  if (isForeign && detail.region_foreign) {
    const codes = getSysCodeFromCache(REGION_FOREIGN_PARENT)
    return codes ? getSysCodeName(codes, detail.region_foreign) : detail.region_foreign
  }
  return '-'
}

interface DetailRowProps {
  label: string
  value: React.ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 px-3 rounded-lg bg-gray-50/80">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '-'}</span>
    </div>
  )
}

export interface MemberDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: PublicMemberDetail | null
  loading: boolean
}

export function MemberDetailModal({ open, onOpenChange, detail, loading }: MemberDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">회원 상세</DialogTitle>
            {detail && isWithdrawn(detail) && (
              <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">
                탈퇴 회원
              </span>
            )}
          </div>
          <DialogDescription>등록된 회원 정보를 확인할 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">불러오는 중...</p>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <DetailRow label="회원 SID" value={detail.member_sid} />
                    <DetailRow label="이메일" value={detail.email} />
                    <DetailRow label="이름" value={detail.name} />
                    <DetailRow label="닉네임" value={detail.nickname} />
                    <DetailRow label="연락처" value={detail.phone} />
                    <DetailRow label="직분" value={resolvePositionName(detail.position)} />
                    <DetailRow label="가입 경로" value={JOINED_VIA_LABEL[detail.joined_via] ?? detail.joined_via} />
                    <DetailRow label="가입일" value={formatDate(detail.created_at)} />
                    <DetailRow label="마지막 로그인" value={formatDate(detail.last_login)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">상태 및 권한</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <DetailRow label="회원 상태 (탈퇴 여부)" value={getStatusLabel(detail.status)} />
                    <DetailRow label="활성" value={detail.is_active ? '예' : '아니오'} />
                    <DetailRow label="관리자" value={detail.is_staff ? '예' : '아니오'} />
                    <DetailRow label="이메일 인증" value={detail.email_verified ? '완료' : '미완료'} />
                    <DetailRow label="프로필 완료" value={detail.profile_completed ? '예' : '아니오'} />
                    <DetailRow label="뉴스레터 수신" value={detail.newsletter_agree ? '동의' : '미동의'} />
                  </div>
                </CardContent>
              </Card>

              <Card className={isWithdrawn(detail) ? 'border-amber-200 bg-amber-50/30' : ''}>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    탈퇴 정보 (추가 필드)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <DetailRow label="회원 상태" value={getStatusLabel(detail.status)} />
                    <DetailRow label="탈퇴 사유" value={detail.withdraw_reason ?? '-'} />
                    <DetailRow label="탈퇴 상세 사유" value={detail.withdraw_detail_reason ?? '-'} />
                    <DetailRow label="탈퇴 요청일시" value={formatDate(detail.withdraw_requested_at)} />
                    <DetailRow label="탈퇴 완료일시" value={formatDate(detail.withdraw_completed_at)} />
                    <DetailRow label="탈퇴 요청 IP" value={detail.withdraw_ip ?? '-'} />
                    <DetailRow
                      label="탈퇴 요청 User-Agent"
                      value={detail.withdraw_user_agent ? (
                        <span className="break-all text-xs" title={detail.withdraw_user_agent}>
                          {detail.withdraw_user_agent.length > 60
                            ? `${detail.withdraw_user_agent.slice(0, 60)}…`
                            : detail.withdraw_user_agent}
                        </span>
                      ) : '-'}
                    />
                  </div>
                </CardContent>
              </Card>

              {(detail.region_type || detail.region_domestic || detail.region_foreign || detail.birth_year != null) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">추가 정보</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <DetailRow label="지역" value={resolveRegionDisplay(detail)} />
                      {(detail.birth_year != null || detail.birth_month != null || detail.birth_day != null) && (
                        <DetailRow
                          label="생년월일"
                          value={[detail.birth_year, detail.birth_month, detail.birth_day].filter(Boolean).join('.') || '-'}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">내용을 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 shrink-0 flex-row gap-2">
          {detail && (
            <Link href={`/admin/users/edit?id=${detail.member_sid}`}>
              <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">수정</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
