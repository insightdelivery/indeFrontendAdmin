'use client'

/**
 * 작성자 관리 목록
 * @see _docsRules/frontend_admin/contentAuthor/contentAuthor.md
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getAuthorList,
  deleteAuthor,
  type ContentAuthor,
  type ContentAuthorListParams,
  type AuthorStatus,
  type ContentTypeOption,
} from '@/features/contentAuthor'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ListPagination } from '@/components/admin/ListPagination'
import { cn } from '@/lib/utils'
import { ADMIN_CONTENT_TABLE_HEAD_TH } from '@/lib/adminContentListTable'
import { Plus, Edit, Trash2, RefreshCw, Search, X } from 'lucide-react'

const TH = ADMIN_CONTENT_TABLE_HEAD_TH

const COL_ID = 'w-14 min-w-14 max-w-14 px-2'
const COL_AVATAR = 'w-[56px] min-w-[56px] max-w-[56px] px-2'
const COL_NAME = 'min-w-0 px-3'
const COL_ROLE = 'w-[88px] min-w-[88px] max-w-[88px] px-2'
const COL_STATUS = 'w-[88px] min-w-[88px] max-w-[88px] px-2'
const COL_MEMBER = 'w-[120px] min-w-[120px] max-w-[120px] px-2'
const COL_TYPES = 'w-[140px] min-w-[140px] max-w-[140px] px-2'
const COL_REG = 'w-[104px] min-w-[104px] max-w-[104px] px-2'
const COL_ACTIONS = 'w-24 min-w-24 max-w-24 px-0.5'

const CONTENT_TYPE_LABELS: Record<ContentTypeOption, string> = {
  ARTICLE: '아티클',
  VIDEO: '비디오',
  SEMINAR: '세미나',
}
const STATUS_LABELS: Record<AuthorStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
}
const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: '디렉터',
  EDITOR: '에디터',
}

export default function ContentAuthorListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [authors, setAuthors] = useState<ContentAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContentAuthor | null>(null)

  const loadAuthors = useCallback(async () => {
    try {
      setLoading(true)
      const params: ContentAuthorListParams = {
        page,
        pageSize,
        name: nameFilter || undefined,
        status: (statusFilter as AuthorStatus) || undefined,
        content_type: (contentTypeFilter as ContentTypeOption) || undefined,
      }
      const result = await getAuthorList(params)
      setAuthors(result.authors)
      setTotal(result.total)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '저자 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, nameFilter, statusFilter, contentTypeFilter, toast])

  useEffect(() => {
    loadAuthors()
  }, [loadAuthors])

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1)
    } else {
      void loadAuthors()
    }
  }

  const resetFilters = () => {
    setNameFilter('')
    setStatusFilter('')
    setContentTypeFilter('')
    setPage(1)
  }

  const filterBarActive = !!(nameFilter || statusFilter || contentTypeFilter)

  const handleDelete = (author: ContentAuthor) => {
    setDeleteTarget(author)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAuthor(deleteTarget.author_id)
      toast({ title: '성공', description: '저자가 삭제되었습니다.' })
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      loadAuthors()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '저자 삭제에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const contentTypesDisplay = (author: ContentAuthor) => {
    const types = author.content_types
    if (!types || !Array.isArray(types)) return '—'
    const list = types.map((t) => (typeof t === 'string' ? t : (t as { content_type: string }).content_type))
    return list.map((t) => CONTENT_TYPE_LABELS[t as ContentTypeOption] || t).join(', ') || '—'
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-2 relative">
      {/* 검색·필터 + 상단 액션 — 큐레이션 목록과 동일 패턴 */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-2 flex justify-between">
        <div className="flex flex-col gap-3 border-gray-100 pt-0 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">이름</label>
          <Input
            placeholder="이름 검색"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 min-w-[10rem] max-w-[220px] sm:flex-1"
          />
          <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700 sm:ml-2">상태</label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-[120px] shrink-0">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700 sm:ml-2">담당 유형</label>
          <Select value={contentTypeFilter || 'all'} onValueChange={(v) => setContentTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-[120px] shrink-0">
              <SelectValue placeholder="담당 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
            onClick={handleSearch}
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
              className="border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
            >
              <X className="mr-1 h-4 w-4" aria-hidden />
              필터 초기화
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadAuthors()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              새로고침
            </Button>
            <Link href="/admin/contentAuthor/new">
              <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                새 저자 등록
              </Button>
            </Link>
          </div>

      </div>

      {/* 목록 테이블 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : authors.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {filterBarActive ? '검색 결과가 없습니다.' : '등록된 저자가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-14" />
                <col className="w-14" />
                <col />
                <col className="w-[88px]" />
                <col className="w-[88px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-[104px]" />
                <col className="w-24" />
              </colgroup>
              <thead className="border-b h-12 border-white/15 bg-[#03213b] text-[#fff] text-sm shadow-sm bg-muted text-muted-foreground rounded-t-md">
                <tr>
                  <th className={cn(TH, COL_ID, 'text-center')}>ID</th>
                  <th className={cn(TH, COL_AVATAR, 'text-center')}>프로필</th>
                  <th className={cn(TH, COL_NAME, 'text-left normal-case')}>이름</th>
                  <th className={cn(TH, COL_ROLE, 'text-center normal-case')}>역할</th>
                  <th className={cn(TH, COL_STATUS, 'text-center')}>상태</th>
                  <th className={cn(TH, COL_MEMBER, 'text-center normal-case')}>연결 관리자</th>
                  <th className={cn(TH, COL_TYPES, 'text-center normal-case')}>담당 콘텐츠</th>
                  <th className={cn(TH, COL_REG, 'text-center')}>등록일</th>
                  <th className={cn(TH, COL_ACTIONS, 'text-center')}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {authors.map((author) => (
                  <tr key={author.author_id} className="hover:bg-gray-50">
                    <td
                      className={cn(
                        COL_ID,
                        'py-3 align-middle text-center text-sm text-gray-600 tabular-nums',
                      )}
                    >
                      {author.author_id}
                    </td>
                    <td className={cn(COL_AVATAR, 'py-3 align-middle')}>
                      <div className="mx-auto flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(author.profile_image && author.profile_image.trim()) || '/editorDefault.png'}
                          alt=""
                          className="h-full w-full object-cover"
                          width={40}
                          height={40}
                        />
                      </div>
                    </td>
                    <td className={cn(COL_NAME, 'py-3 align-middle text-left text-sm font-medium text-gray-900')}>
                      <button
                        type="button"
                        className="line-clamp-2 w-full cursor-pointer text-left font-medium text-[#000] hover:text-[#000] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded-sm"
                        title={`${author.name} — 수정`}
                        onClick={() => router.push(`/admin/contentAuthor/edit?id=${author.author_id}`)}
                      >
                        {author.name}
                      </button>
                    </td>
                    <td
                      className={cn(
                        COL_ROLE,
                        'py-3 align-middle text-center text-sm text-gray-600',
                      )}
                    >
                      {ROLE_LABELS[author.role] ?? author.role}
                    </td>
                    <td className={cn(COL_STATUS, 'py-3 align-middle text-center')}>
                      {author.status === 'ACTIVE' ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          {STATUS_LABELS[author.status]}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {STATUS_LABELS[author.status]}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        COL_MEMBER,
                        'py-3 align-middle text-center text-xs text-gray-600',
                      )}
                      title={author.member_ship_sid || undefined}
                    >
                      <span className="line-clamp-2">
                        {author.member_ship_sid ? author.member_ship_sid : '미연결'}
                      </span>
                    </td>
                    <td
                      className={cn(
                        COL_TYPES,
                        'py-3 align-middle text-center text-xs text-gray-600',
                      )}
                    >
                      <span className="line-clamp-2" title={contentTypesDisplay(author)}>
                        {contentTypesDisplay(author)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        COL_REG,
                        'py-3 align-middle text-center text-xs text-gray-600 tabular-nums whitespace-nowrap',
                      )}
                    >
                      {author.created_at?.slice(0, 10) ?? '—'}
                    </td>
                    <td className={cn(COL_ACTIONS, 'py-2 align-middle text-center')}>
                      <div className="flex items-center justify-center gap-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 p-0"
                          type="button"
                          title="수정"
                          onClick={() => router.push(`/admin/contentAuthor/edit?id=${author.author_id}`)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 p-0 text-red-600 hover:text-red-700"
                          type="button"
                          title="삭제"
                          onClick={() => handleDelete(author)}
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

        {total > 0 ? (
          <ListPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
            disabled={loading}
          />
        ) : null}
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:hover:text-white [&>button]:ring-offset-[#021a2e]">
          <DialogHeader className="shrink-0 border-b border-white/10 bg-[#021a2e] px-6 py-4 text-left text-white sm:text-left">
            <DialogTitle className="text-lg font-semibold text-white">작성자 삭제</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <DialogDescription className="text-sm text-gray-600">
              {deleteTarget?.name}(ID: {deleteTarget?.author_id}) 작성자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-gray-200 bg-slate-100 px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
