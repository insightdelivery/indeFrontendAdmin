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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'

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
    setPage(1)
    loadAuthors()
  }

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
    if (!types || !Array.isArray(types)) return '-'
    const list = types.map((t) => (typeof t === 'string' ? t : (t as { content_type: string }).content_type))
    return list.map((t) => CONTENT_TYPE_LABELS[t as ContentTypeOption] || t).join(', ') || '-'
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">작성자 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            콘텐츠 저자(에디터/디렉터)를 등록·수정·삭제합니다.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Link href="/admin/contentAuthor/new">
            <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
              <Plus className="mr-2 h-4 w-4" />
              등록
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>저자 목록</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Input
              placeholder="이름 검색"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-[200px]"
            />
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contentTypeFilter || 'all'} onValueChange={(v) => setContentTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="담당 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={handleSearch}>
              조회
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={loadAuthors} title="새로고침">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">불러오는 중...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2 w-[56px]">프로필</th>
                      <th className="text-left py-2 px-2">이름</th>
                      <th className="text-left py-2 px-2">역할</th>
                      <th className="text-left py-2 px-2">상태</th>
                      <th className="text-left py-2 px-2">연결 관리자</th>
                      <th className="text-left py-2 px-2">담당 콘텐츠</th>
                      <th className="text-left py-2 px-2">등록일</th>
                      <th className="text-right py-2 px-2">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authors.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          등록된 저자가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      authors.map((author) => (
                        <tr key={author.author_id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{author.author_id}</td>
                          <td className="py-2 px-2 align-middle">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ring-1 ring-gray-200">
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
                          <td className="py-2 px-2 font-medium">{author.name}</td>
                          <td className="py-2 px-2">{ROLE_LABELS[author.role] ?? author.role}</td>
                          <td className="py-2 px-2">
                            <span className={author.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}>
                              {STATUS_LABELS[author.status]}
                            </span>
                          </td>
                          <td className="py-2 px-2">{author.member_ship_sid ? author.member_ship_sid : '미연결'}</td>
                          <td className="py-2 px-2">{contentTypesDisplay(author)}</td>
                          <td className="py-2 px-2">{author.created_at?.slice(0, 10)}</td>
                          <td className="py-2 px-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/contentAuthor/edit?id=${author.author_id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(author)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    이전
                  </Button>
                  <span className="flex items-center px-2">
                    {page} / {totalPages} (총 {total}명)
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>저자 삭제</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name}(ID: {deleteTarget?.author_id}) 저자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>취소</Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={confirmDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
