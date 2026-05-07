'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPublicMemberList, deletePublicMember, withdrawPublicMember } from '@/services/publicMembers'
import type { PublicMemberListItem } from '@/types/publicMember'
import { useToast } from '@/hooks/use-toast'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ListPagination } from '@/components/admin/ListPagination'
import { WithdrawModal } from '@/components/admin/users/WithdrawModal'
import { cn } from '@/lib/utils'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import { Plus, Search, Edit, Trash2, UserX, RefreshCw, X } from 'lucide-react'

const STATUS_FILTER_ALL = '__all__'
const STATUS_FILTER_OPTIONS = [
  { value: STATUS_FILTER_ALL, label: '전체' },
  { value: 'ACTIVE', label: '정상' },
  { value: 'WITHDRAW_REQUEST', label: '탈퇴 요청' },
  { value: 'WITHDRAWN', label: '탈퇴' },
] as const

const JOINED_VIA_LABEL: Record<string, string> = {
  LOCAL: '로컬',
  KAKAO: '카카오',
  NAVER: '네이버',
  GOOGLE: '구글',
}

function formatDate(s: string | null) {
  if (!s) return '-'
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TH = ADMIN_CONTENT_TABLE_HEAD_TH
const COL_SID = 'w-16 min-w-16 max-w-16 px-2'
const COL_EMAIL = 'w-[220px] min-w-[220px] max-w-[220px] px-2'
const COL_NAME = 'w-[104px] min-w-[104px] max-w-[104px] px-2'
const COL_NICK = 'w-[120px] min-w-[120px] max-w-[120px] px-2'
const COL_PHONE = 'w-[120px] min-w-[120px] max-w-[120px] px-2'
const COL_JOINED = 'w-[88px] min-w-[88px] max-w-[88px] px-2'
const COL_STATUS = 'w-[92px] min-w-[92px] max-w-[92px] px-2'
const COL_ACTIVE = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
const COL_CREATED = 'w-[132px] min-w-[132px] max-w-[132px] px-2'
const COL_WITHDRAWN = 'w-[132px] min-w-[132px] max-w-[132px] px-2'
const COL_ACTIONS = 'w-24 min-w-24 max-w-24 px-0.5'

export default function UsersPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<PublicMemberListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawingMember, setWithdrawingMember] = useState<PublicMemberListItem | null>(null)

  const load = useCallback(async (overridePage?: number) => {
    const p = overridePage ?? page
    try {
      setLoading(true)
      const res = await getPublicMemberList({
        page: p,
        page_size: 20,
        search: search || undefined,
        status: statusFilter && statusFilter !== STATUS_FILTER_ALL
          ? (statusFilter as 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN')
          : undefined,
      })
      setItems(Array.isArray(res.results) ? res.results : [])
      setTotalCount(typeof res.count === 'number' ? res.count : 0)
      if (overridePage != null) setPage(overridePage)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '회원 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => {
    load()
  }, [load])

  const filterBarActive =
    !!search.trim() || (statusFilter && statusFilter !== STATUS_FILTER_ALL)

  const resetFilters = () => {
    setSearch('')
    setStatusFilter(STATUS_FILTER_ALL)
    load(1)
  }

  const handleDeleteClick = (memberSid: number) => {
    setDeletingId(memberSid)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (deletingId == null) return
    try {
      await deletePublicMember(deletingId)
      toast({ title: '삭제 완료', description: '회원이 삭제되었습니다.', duration: 3000 })
      setDeleteModalOpen(false)
      setDeletingId(null)
      load()
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleWithdrawClick = (row: PublicMemberListItem) => {
    if (row.status === 'WITHDRAWN') return
    setWithdrawingMember(row)
    setWithdrawModalOpen(true)
  }

  const handleWithdrawConfirm = async (
    memberSid: number,
    payload: { reason?: string; detail_reason?: string }
  ) => {
    await withdrawPublicMember(memberSid, payload)
    toast({ title: '탈퇴 처리 완료', description: '회원이 탈퇴 처리되었습니다.', duration: 3000 })
    setWithdrawingMember(null)
    load()
  }

  return (
    <div className="space-y-2 relative">
      {/* 검색/필터 — defaultUxUiListPlan.md 규격 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-1 flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-2">
            <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">검색</label>
            <Input
              placeholder="이메일·이름·닉네임·연락처 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
              className="h-9 min-w-0 flex-1"
            />
            <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">상태</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] shrink-0">
                <SelectValue placeholder="회원 상태" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              className="w-32 shrink-0 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              onClick={() => load(1)}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              조회
            </Button>
            {filterBarActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="w-32 shrink-0 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              >
                <X className="mr-1 h-4 w-4" aria-hidden />
                필터 초기화
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
            <Button type="button" variant="outline" size="sm" onClick={() => load(1)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              새로고침
            </Button>
            <Link href="/admin/users/new">
              <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                새 회원
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 테이블 — defaultUxUiListPlan.md 규격 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {filterBarActive ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[960px]">
              <colgroup>
                <col className="w-16" />
                <col className="w-[220px]" />
                <col className="w-[104px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[88px]" />
                <col className="w-[92px]" />
                <col className="w-[72px]" />
                <col className="w-[132px]" />
                <col className="w-[132px]" />
                <col className="w-24" />
              </colgroup>
              <thead className="border-b h-12 border-white/15 text-[#fff] text-sm shadow-sm rounded-t-md">
                <tr style={{ backgroundColor: '#03213b' }}>
                  <th className={cn(TH, COL_SID, 'text-center')}>SID</th>
                  <th className={cn(TH, COL_EMAIL, 'text-left normal-case')}>이메일</th>
                  <th className={cn(TH, COL_NAME, 'text-center')}>이름</th>
                  <th className={cn(TH, COL_NICK, 'text-center normal-case')}>닉네임</th>
                  <th className={cn(TH, COL_PHONE, 'text-center')}>연락처</th>
                  <th className={cn(TH, COL_JOINED, 'text-center')}>가입경로</th>
                  <th className={cn(TH, COL_STATUS, 'text-center')}>상태</th>
                  <th className={cn(TH, COL_ACTIVE, 'text-center')}>활성</th>
                  <th className={cn(TH, COL_CREATED, 'text-center normal-case')}>가입일시</th>
                  <th className={cn(TH, COL_WITHDRAWN, 'text-center normal-case')}>탈퇴일시</th>
                  <th className={cn(TH, COL_ACTIONS, 'text-center')}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((row) => (
                  <tr key={row.member_sid} className="hover:bg-gray-50">
                    <td className={cn(COL_SID, 'py-3 align-middle text-center text-sm text-gray-600 tabular-nums')}>
                      {row.member_sid}
                    </td>
                    <td className={cn(COL_EMAIL, 'py-3 align-middle text-left text-sm')}>
                      <Link
                        href={`/admin/users/edit?id=${row.member_sid}&tab=user-info`}
                        className="block w-full truncate font-medium text-[#000] no-underline hover:text-[#000] hover:no-underline"
                        title={row.email}
                      >
                        {row.email}
                      </Link>
                    </td>
                    <td className={cn(COL_NAME, 'py-3 align-middle text-center text-sm text-gray-700')}>
                      {row.name || '—'}
                    </td>
                    <td className={cn(COL_NICK, 'py-3 align-middle text-center text-sm text-gray-700')}>
                      {row.nickname || '—'}
                    </td>
                    <td className={cn(COL_PHONE, 'py-3 align-middle text-center text-sm text-gray-700')}>
                      {row.phone || '—'}
                    </td>
                    <td className={cn(COL_JOINED, 'py-3 align-middle text-center text-sm text-gray-600')}>
                      {JOINED_VIA_LABEL[row.joined_via] ?? row.joined_via}
                    </td>
                    <td className={cn(COL_STATUS, 'py-3 align-middle text-center')}>
                      {row.status === 'WITHDRAWN' ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          탈퇴
                        </span>
                      ) : row.status === 'WITHDRAW_REQUEST' ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          탈퇴요청
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          정상
                        </span>
                      )}
                    </td>
                    <td className={cn(COL_ACTIVE, 'py-3 align-middle text-center')}>
                      {row.is_active ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Y
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          N
                        </span>
                      )}
                    </td>
                    <td className={cn(COL_CREATED, 'py-3 align-middle text-center text-xs text-gray-600 tabular-nums whitespace-nowrap')}>
                      {formatDate(row.created_at)}
                    </td>
                    <td className={cn(COL_WITHDRAWN, 'py-3 align-middle text-center text-xs text-gray-600 tabular-nums whitespace-nowrap')}>
                      {formatDate(row.withdraw_completed_at ?? null)}
                    </td>
                    <td className={cn(COL_ACTIONS, 'py-2 align-middle text-center')}>
                      <div className="flex items-center justify-center gap-0">
                        <Link href={`/admin/users/edit?id=${row.member_sid}`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 p-0" title="수정">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
                        {row.status !== 'WITHDRAWN' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 p-0 text-amber-600 hover:text-amber-700"
                            onClick={() => handleWithdrawClick(row)}
                            title="탈퇴 처리"
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(row.member_sid)}
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > 0 ? (
          <ListPagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(totalCount / 20))}
            onPageChange={(next) => load(next)}
            total={totalCount}
            disabled={loading}
          />
        ) : null}
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">회원 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              이 회원을 삭제하시겠습니까? 복구할 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WithdrawModal
        open={withdrawModalOpen}
        onOpenChange={(open) => {
          setWithdrawModalOpen(open)
          if (!open) setWithdrawingMember(null)
        }}
        member={withdrawingMember}
        onConfirm={handleWithdrawConfirm}
      />
    </div>
  )
}
