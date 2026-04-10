'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getArticleList,
  getArticle,
  deleteArticle,
  deleteArticles,
  updateArticleStatus,
  exportArticlesToExcel,
  type Article,
  type ArticleListParams,
  ARTICLE_CATEGORIES,
  VISIBILITY_OPTIONS,
  PUBLISH_STATUS,
} from '@/features/articles'
import { useToast } from '@/hooks/use-toast'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import { getSysCodeName, getSysCodeFromCache } from '@/lib/syscode'
import { Button } from '@/components/ui/button'
import { CommentsModal } from '@/components/comments/CommentsModal'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListPagination } from '@/components/admin/ListPagination'
import { formatDateTime } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Calendar,
  Filter,
  X,
  RefreshCw,
  User,
  Tag,
  MessageSquare,
  Bookmark,
  Star,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  BarChart3,
} from 'lucide-react'
import Image from 'next/image'

/**
 * 본문 HTML을 상세보기에서 에디터처럼 줄바꿈이 보이도록 변환.
 * - \r\n, \r, \n → <br />
 * - TipTap은 Enter 시 새 <p>를 만들므로, </p><p> 사이에도 <br /> 삽입
 */
function contentWithLineBreaks(html: string): string {
  if (!html || typeof html !== 'string') return html
  return html
    .replace(/\r\n|\r|\n/g, '<br />')
    .replace(/<\/p>\s*<p>/gi, '</p><br /><p>')
}

function formatListDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ArticleListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null)
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<number[]>([])
  const [newStatus, setNewStatus] = useState<string>('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [commentsModalOpen, setCommentsModalOpen] = useState(false)
  const [commentsContentId, setCommentsContentId] = useState<number | null>(null)

  // 필터 상태 (페이지당 10개, listPageRules.md)
  const [filters, setFilters] = useState<ArticleListParams>({
    page: 1,
    pageSize: 10,
  })
  const [total, setTotal] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState<string>('전체')
  const [visibility, setVisibility] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true)
      const params: ArticleListParams = {
        ...filters,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: category === '전체' ? undefined : category,
        visibility: visibility || undefined,
        status: status || undefined,
        search: searchTerm || undefined,
      }
      const result = await getArticleList(params)
      setArticles(result.articles)
      setTotal(result.total)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [filters, startDate, endDate, category, visibility, status, searchTerm, toast])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(articles.map((article) => article.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const handleDelete = (id: number) => {
    setDeleteTarget(id)
    setDeleteModalOpen(true)
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast({
        title: '알림',
        description: '삭제할 아티클을 선택해주세요.',
        duration: 3000,
      })
      return
    }
    setDeleteTarget(selectedIds)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      if (Array.isArray(deleteTarget)) {
        await deleteArticles(deleteTarget)
        toast({
          title: '성공',
          description: `${deleteTarget.length}개의 아티클이 휴지통으로 이동되었습니다.`,
          duration: 3000,
        })
      } else if (deleteTarget) {
        await deleteArticle(deleteTarget)
        toast({
          title: '성공',
          description: '아티클이 휴지통으로 이동되었습니다.',
          duration: 3000,
        })
      }
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setSelectedIds([])
      loadArticles()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleStatusChange = (ids: number[], status: string) => {
    setStatusChangeTarget(ids)
    setNewStatus(status)
    setStatusChangeModalOpen(true)
  }

  const confirmStatusChange = async () => {
    try {
      await updateArticleStatus(statusChangeTarget, newStatus)
      toast({
        title: '성공',
        description: `${statusChangeTarget.length}개의 아티클 상태가 변경되었습니다.`,
        duration: 3000,
      })
      setStatusChangeModalOpen(false)
      setStatusChangeTarget([])
      setSelectedIds([])
      loadArticles()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 상태 변경에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleExport = async () => {
    try {
      const params: ArticleListParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: category === '전체' ? undefined : category,
        visibility: visibility || undefined,
        status: status || undefined,
        search: searchTerm || undefined,
      }
      const blob = await exportArticlesToExcel(params)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `articles_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: '성공',
        description: '엑셀 파일이 다운로드되었습니다.',
        duration: 3000,
      })
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '엑셀 다운로드에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    // localStorage에서 발행 상태 시스템 코드 가져오기
    const statusCodes = getSysCodeFromCache('SYS26209B020')
    if (statusCodes) {
      const statusName = getSysCodeName(statusCodes, status)
      if (statusName !== status) {
        // 시스템 코드에서 찾은 경우
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {statusName}
          </span>
        )
      }
    }

    // fallback: 기존 하드코딩된 값
    const statusMap: Record<string, { label: string; className: string }> = {
      published: { label: '공개', className: 'bg-green-100 text-green-800' },
      private: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
      scheduled: { label: '예약 발행', className: 'bg-blue-100 text-blue-800' },
      draft: { label: '임시저장', className: 'bg-yellow-100 text-yellow-800' },
      deleted: { label: '삭제됨', className: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getVisibilityBadge = (visibility: string) => {
    // localStorage에서 공개 범위 시스템 코드 가져오기
    const visibilityCodes = getSysCodeFromCache('SYS26209B015')
    if (visibilityCodes) {
      const visibilityName = getSysCodeName(visibilityCodes, visibility)
      if (visibilityName !== visibility) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {visibilityName}
          </span>
        )
      }
    }

    // fallback: 기존 하드코딩된 값
    const visibilityMap: Record<string, string> = {
      all: '전체',
      free: '무료',
      paid: '유료',
      purchased: '구매자',
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {visibilityMap[visibility] || visibility}
      </span>
    )
  }

  const getCategoryName = (categorySid: string): string => {
    // localStorage에서 카테고리 시스템 코드 가져오기
    const categoryCodes = getSysCodeFromCache('SYS26209B002')
    if (categoryCodes) {
      const categoryName = getSysCodeName(categoryCodes, categorySid)
      if (categoryName !== categorySid) {
        return categoryName
      }
    }
    // fallback: 원본 값 반환
    return categorySid
  }

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setCategory('전체')
    setVisibility('')
    setStatus('')
    setSearchTerm('')
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">아티클 관리</h1>
          <p className="text-sm text-gray-600 mt-1">아티클을 검색·필터링하고 관리할 수 있습니다.</p>
        </div>
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <Link href="/admin/articles/trash">
            <Button type="button" variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              휴지통
            </Button>
          </Link>
          <Link href="/admin/articles/new">
            <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              새 아티클
            </Button>
          </Link>
        </div>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">검색 및 필터</h2>
          {(startDate || endDate || category !== '전체' || visibility || status || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
              <X className="h-4 w-4 mr-1" />
              필터 초기화
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 기간 검색 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">등록일 (시작일)</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">등록일 (종료일)</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">카테고리</label>
            <SysCodeSelect
              sysCodeGubn="SYS26209B002"
              value={category}
              onValueChange={setCategory}
              placeholder="전체"
              showAllOption={true}
              allOptionValue="전체"
              allOptionLabel="전체"
            />
          </div>

          {/* 공개 범위 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">공개 범위</label>
            <Select value={visibility || 'all'} onValueChange={(value) => setVisibility(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상태 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">상태</label>
            <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value={PUBLISH_STATUS.PUBLISHED}>공개</SelectItem>
                <SelectItem value={PUBLISH_STATUS.PRIVATE}>비공개</SelectItem>
                <SelectItem value={PUBLISH_STATUS.SCHEDULED}>예약 발행</SelectItem>
                <SelectItem value={PUBLISH_STATUS.DRAFT}>임시저장</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 검색어 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">검색어</label>
            <div className="flex gap-2">
              <Input
                placeholder="제목, 작성자명, 태그 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    loadArticles()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
              >
                조회
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 관리 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="bg-gray-100 rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <span className="font-medium text-black">
            {selectedIds.length}개 항목 선택됨
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(selectedIds, PUBLISH_STATUS.PUBLISHED)}
            >
              <Eye className="h-4 w-4 mr-2" />
              공개로 변경
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(selectedIds, PUBLISH_STATUS.PRIVATE)}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              비공개로 변경
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              선택 삭제
            </Button>
          </div>
        </div>
      )}

      {/* 아티클 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedIds.length === articles.length && articles.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">총 {total.toLocaleString()}건</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            엑셀 다운로드
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            로딩 중...
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchTerm || category !== '전체' || visibility || status
              ? '검색 결과가 없습니다.'
              : '등록된 아티클이 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <Checkbox
                      checked={selectedIds.length === articles.length && articles.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    썸네일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="leading-4">
                      <div>공개범위</div>
                      <div>상태</div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    별점
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    참여 데이터
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    질문
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="leading-4">
                      <div>등록일</div>
                      <div>최종수정일</div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedIds.includes(article.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(article.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {article.thumbnail ? (
                        <div className="relative w-16 h-10 rounded overflow-hidden">
                          <Image
                            src={article.thumbnail}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                          없음
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          try {
                            const articleData = await getArticle(article.id)
                            setSelectedArticle(articleData)
                            setDetailModalOpen(true)
                          } catch (error: any) {
                            toast({
                              title: '오류',
                              description: error.message || '아티클을 불러오는데 실패했습니다.',
                              variant: 'destructive',
                              duration: 3000,
                            })
                          }
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer"
                      >
                        {article.title}
                      </button>
                      {article.subtitle && (
                        <div className="text-xs text-gray-500 mt-1">{article.subtitle}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getCategoryName(article.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{article.author}</div>
                      {article.authorAffiliation && (
                        <div className="text-xs text-gray-500">{article.authorAffiliation}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>{getVisibilityBadge(article.visibility)}</div>
                        <div>{getStatusBadge(article.status)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                      {article.rating != null ? (
                        <span title="평균 별점">⭐ {article.rating.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {article.viewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-left underline underline-offset-2 hover:no-underline"
                          onClick={() => {
                            setCommentsContentId(article.id)
                            setCommentsModalOpen(true)
                          }}
                        >
                          <MessageSquare className="h-3 w-3" />
                          {article.commentCount}
                        </button>
                        <span>🔖 {article.highlightCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {article.questionCount || 0}개
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-2">
                        <p>{formatListDateTime(article.createdAt)}</p>
                        <p>{article.updatedAt ? formatListDateTime(article.updatedAt) : '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const articleData = await getArticle(article.id)
                              setSelectedArticle(articleData)
                              setDetailModalOpen(true)
                            } catch (error: any) {
                              toast({
                                title: '오류',
                                description: error.message || '아티클을 불러오는데 실패했습니다.',
                                variant: 'destructive',
                                duration: 3000,
                              })
                            }
                          }}
                          title="상세보기"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/articles/edit?id=${article.id}`}>
                          <Button variant="ghost" size="sm" title="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(article.id)}
                          title="삭제"
                          className="text-red-600 hover:text-red-700"
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

        {/* 페이지네이션 (listPageRules.md: << < 1..10 > >>, 10개씩) */}
        {total > 0 && (
          <ListPagination
            currentPage={filters.page ?? 1}
            totalPages={Math.ceil(total / (filters.pageSize ?? 10)) || 1}
            onPageChange={(page) =>
              setFilters((prev) => ({ ...prev, page }))
            }
            total={total}
            disabled={loading}
          />
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>아티클 삭제</DialogTitle>
            <DialogDescription>
              {Array.isArray(deleteTarget)
                ? `선택한 ${deleteTarget.length}개의 아티클을 휴지통으로 이동하시겠습니까? 삭제된 콘텐츠는 유저 페이지에서 즉시 노출 중단됩니다.`
                : '이 아티클을 휴지통으로 이동하시겠습니까? 삭제된 콘텐츠는 유저 페이지에서 즉시 노출 중단됩니다.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상태 변경 확인 모달 */}
      <Dialog open={statusChangeModalOpen} onOpenChange={setStatusChangeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상태 변경</DialogTitle>
            <DialogDescription>
              선택한 {statusChangeTarget.length}개의 아티클을{' '}
              {newStatus === PUBLISH_STATUS.PUBLISHED
                ? '공개'
                : newStatus === PUBLISH_STATUS.PRIVATE
                  ? '비공개'
                  : newStatus}
              로 변경하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStatusChangeModalOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800" onClick={confirmStatusChange}>
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 아티클 상세보기 모달 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    아티클 상세 정보
                  </DialogTitle>
                  {selectedArticle && (
                    <p className="text-sm text-gray-500 mt-1">ID: {selectedArticle.id}</p>
                  )}
                </div>
              </div>
              {selectedArticle && (
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedArticle.status)}
                </div>
              )}
            </div>
          </div>

          {/* 스크롤 가능한 본문 */}
          <div className="flex-1 px-6 py-4 overflow-y-auto">
            {selectedArticle && (
              <div className="space-y-6">
                {/* 제목 및 부제목 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      제목 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">제목</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedArticle.title}</p>
                    </div>
                    {selectedArticle.subtitle && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">부제목</label>
                        <p className="text-base text-gray-700 mt-1">{selectedArticle.subtitle}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 기본 정보 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      기본 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">카테고리</label>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {getCategoryName(selectedArticle.category)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">공개 범위</label>
                        <div className="mt-1">{getVisibilityBadge(selectedArticle.visibility)}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">작성자</label>
                        <div className="mt-1">
                          <p className="text-base font-medium text-gray-900">{selectedArticle.author}</p>
                          {selectedArticle.authorAffiliation && (
                            <p className="text-sm text-gray-500 mt-0.5">{selectedArticle.authorAffiliation}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">등록일</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="text-base text-gray-700">{formatDateTime(selectedArticle.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 썸네일 */}
                {selectedArticle.thumbnail && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        썸네일 이미지
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                        <Image
                          src={selectedArticle.thumbnail}
                          alt={selectedArticle.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 본문 내용 (에디터 엔터 → 줄바꿈 표시) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      본문 내용
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none min-h-[100px] p-4 bg-gray-50 rounded-lg border border-gray-200 [&_p]:block [&_p]:mb-1 [&_br]:block [&_blockquote]:border-l-[5px] [&_blockquote]:border-l-[#03c75a] [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:my-5 [&_blockquote]:bg-[#f6fff8] [&_blockquote]:text-[#222] [&_blockquote]:text-[15px]"
                      style={{ whiteSpace: 'pre-wrap' } as React.CSSProperties}
                      dangerouslySetInnerHTML={{
                        __html: contentWithLineBreaks(selectedArticle.content),
                      }}
                    />
                  </CardContent>
                </Card>

                {/* 태그 */}
                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        태그
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedArticle.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 적용 질문은 수정 페이지에서 별도 질문 API로 관리됩니다. */}

                {/* 통계 정보 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      통계 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-600 uppercase">조회수</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{selectedArticle.viewCount?.toLocaleString() || 0}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-yellow-600" />
                          <p className="text-xs font-semibold text-yellow-600 uppercase">평점</p>
                        </div>
                        <p className="text-2xl font-bold text-yellow-900">
                          {selectedArticle.rating ? selectedArticle.rating.toFixed(1) : '0.0'}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <p className="text-xs font-semibold text-green-600 uppercase">댓글 수</p>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{selectedArticle.commentCount || 0}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Bookmark className="h-4 w-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-600 uppercase">하이라이트</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{selectedArticle.highlightCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                닫기
              </Button>
              {selectedArticle && (
                <Link href={`/admin/articles/edit?id=${selectedArticle.id}`}>
                  <Button type="button" variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    수정
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {commentsContentId != null ? (
        <CommentsModal
          open={commentsModalOpen}
          onOpenChange={setCommentsModalOpen}
          contentType="ARTICLE"
          contentId={commentsContentId}
        />
      ) : null}
    </div>
  )
}

