'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPublicMemberList, getPublicMember, deletePublicMember, withdrawPublicMember } from '@/services/publicMembers'
import type { PublicMemberListItem, PublicMemberDetail } from '@/types/publicMember'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MemberDetailModal } from '@/components/admin/users/MemberDetailModal'
import { WithdrawModal } from '@/components/admin/users/WithdrawModal'
import { Plus, Search, Edit, Trash2, UserX } from 'lucide-react'

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
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<PublicMemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  const handleWithdrawClick = (e: React.MouseEvent, row: PublicMemberListItem) => {
    e.stopPropagation()
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
    setDetailModalOpen(false)
    if (detail?.member_sid === memberSid) setDetail(null)
  }

  const handleRowClick = async (memberSid: number) => {
    setDetailModalOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await getPublicMember(memberSid)
      setDetail(data)
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '회원 상세를 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
          <p className="text-gray-600 text-sm">공개 회원(PublicMemberShip) 목록을 조회·수정·삭제할 수 있습니다.</p>
        </div>
        <Link href="/admin/users/new">
          <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
            <Plus className="h-4 w-4 mr-2" />
            새 회원
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Search className="h-5 w-5 text-gray-500 shrink-0" />
            <Input
              placeholder="이메일·이름·닉네임·연락처 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
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
            <Button variant="outline" size="sm" onClick={() => load(1)}>
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">불러오는 중...</p>
          ) : (items?.length ?? 0) === 0 ? (
            <p className="text-gray-500 py-8 text-center">등록된 회원이 없습니다.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium w-16">SID</th>
                    <th className="text-left p-3 font-medium">이메일</th>
                    <th className="text-left p-3 font-medium">이름</th>
                    <th className="text-left p-3 font-medium">닉네임</th>
                    <th className="text-left p-3 font-medium">연락처</th>
                    <th className="text-center p-3 font-medium w-20">가입경로</th>
                    <th className="text-center p-3 font-medium w-20">상태</th>
                    <th className="text-center p-3 font-medium w-16">활성</th>
                    <th className="text-right p-3 font-medium w-28 whitespace-nowrap">가입일시</th>
                    <th className="text-right p-3 font-medium w-28 whitespace-nowrap">탈퇴일시</th>
                    <th className="text-right p-3 font-medium w-[7.5rem] whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.member_sid}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(row.member_sid)}
                    >
                      <td className="p-3 text-gray-600">{row.member_sid}</td>
                      <td className="p-3 font-medium">{row.email}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.nickname}</td>
                      <td className="p-3">{row.phone}</td>
                      <td className="p-3 text-center text-gray-600">
                        {JOINED_VIA_LABEL[row.joined_via] ?? row.joined_via}
                      </td>
                      <td className="p-3 text-center">
                        {row.status === 'WITHDRAWN' ? (
                          <span className="text-red-600 font-medium">탈퇴</span>
                        ) : row.status === 'WITHDRAW_REQUEST' ? (
                          <span className="text-amber-600">탈퇴요청</span>
                        ) : (
                          <span className="text-green-600">정상</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.is_active ? (
                          <span className="text-green-600">Y</span>
                        ) : (
                          <span className="text-red-600">N</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="p-3 text-right text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(row.withdraw_completed_at ?? null)}
                      </td>
                      <td className="p-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          <Link href={`/admin/users/edit?id=${row.member_sid}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {row.status !== 'WITHDRAWN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0 text-amber-600 hover:text-amber-700"
                              onClick={(e) => handleWithdrawClick(e, row)}
                              title="탈퇴 처리"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteClick(row.member_sid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalCount > 20 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-gray-500 text-sm">총 {totalCount}건</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 삭제</DialogTitle>
            <DialogDescription>이 회원을 삭제하시겠습니까? 복구할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
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

      <MemberDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        detail={detail}
        loading={detailLoading}
      />
    </div>
  )
}
