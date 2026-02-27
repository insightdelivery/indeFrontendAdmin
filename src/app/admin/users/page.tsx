'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPublicMemberList, getPublicMember, deletePublicMember } from '@/services/publicMembers'
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<PublicMemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (overridePage?: number) => {
    const p = overridePage ?? page
    try {
      setLoading(true)
      const res = await getPublicMemberList({ page: p, page_size: 20, search: search || undefined })
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
  }, [page, search, toast])

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
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
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
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-500" />
            <Input
              placeholder="이메일·이름·닉네임·연락처 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
              className="max-w-xs"
            />
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
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium w-16">SID</th>
                    <th className="text-left p-3 font-medium">이메일</th>
                    <th className="text-left p-3 font-medium">이름</th>
                    <th className="text-left p-3 font-medium">닉네임</th>
                    <th className="text-left p-3 font-medium">연락처</th>
                    <th className="text-center p-3 font-medium w-20">가입경로</th>
                    <th className="text-center p-3 font-medium w-16">활성</th>
                    <th className="text-right p-3 font-medium w-32">가입일</th>
                    <th className="text-right p-3 font-medium w-28">관리</th>
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
                        {row.is_active ? (
                          <span className="text-green-600">Y</span>
                        ) : (
                          <span className="text-red-600">N</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-600">{formatDate(row.created_at)}</td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/admin/users/edit?id=${row.member_sid}`}>
                          <Button variant="ghost" size="sm" className="mr-1">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(row.member_sid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>회원 상세</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-gray-500 py-6">불러오는 중...</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">회원 SID</span><p className="font-medium">{detail.member_sid}</p></div>
                <div><span className="text-gray-500">이메일</span><p>{detail.email}</p></div>
                <div><span className="text-gray-500">이름</span><p>{detail.name}</p></div>
                <div><span className="text-gray-500">닉네임</span><p>{detail.nickname}</p></div>
                <div><span className="text-gray-500">연락처</span><p>{detail.phone}</p></div>
                <div><span className="text-gray-500">직분</span><p>{detail.position ?? '-'}</p></div>
                <div><span className="text-gray-500">가입 경로</span><p>{JOINED_VIA_LABEL[detail.joined_via] ?? detail.joined_via}</p></div>
                <div><span className="text-gray-500">활성</span><p>{detail.is_active ? '예' : '아니오'}</p></div>
                <div><span className="text-gray-500">관리자</span><p>{detail.is_staff ? '예' : '아니오'}</p></div>
                <div><span className="text-gray-500">이메일 인증</span><p>{detail.email_verified ? '완료' : '미완료'}</p></div>
                <div><span className="text-gray-500">가입일</span><p>{formatDate(detail.created_at)}</p></div>
                <div><span className="text-gray-500">마지막 로그인</span><p>{formatDate(detail.last_login)}</p></div>
              </div>
              {(detail.region_type || detail.region_domestic || detail.region_foreign) && (
                <div>
                  <span className="text-gray-500">지역</span>
                  <p>{detail.region_type === 'DOMESTIC' ? detail.region_domestic : detail.region_foreign ?? '-'}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 py-6">내용을 불러올 수 없습니다.</p>
          )}
          <DialogFooter>
            {detail && (
              <Link href={`/admin/users/edit?id=${detail.member_sid}`}>
                <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">수정</Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
