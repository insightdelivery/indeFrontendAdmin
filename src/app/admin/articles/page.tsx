'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getArticleList,
  deleteArticle,
  deleteArticles,
  updateArticleStatus,
  exportArticlesToExcel,
  type Article,
  type ArticleListParams,
  type ArticleListSortBy,
  ARTICLE_CATEGORIES,
  VISIBILITY_OPTIONS,
  PUBLISH_STATUS,
} from '@/features/articles'
import { CONTENT_PUBLISH_STATUS } from '@/features/content-publish-syscodes'
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
import { ListPagination } from '@/components/admin/ListPagination'
import { cn } from '@/lib/utils'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  X,
  MessageSquare,
  Bookmark,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import Image from 'next/image'

/** 목록 발행일: 첫 줄 날짜, 둘째 줄 시각 */
function splitPublishedAtListParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return {
    date: d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    time: d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

const ARTICLE_TABLE_HEAD_TH =
  'px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-[#fff] whitespace-nowrap'

/** 제목 열 외 고정 너비·줄바꿈 없음 (table-layout:fixed + colgroup과 함께 사용) */
const COL_CHK = 'w-10 min-w-10 max-w-10 px-2'
const COL_THUMB = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
const COL_TITLE = 'min-w-0 px-3 py-4'
const COL_CAT = 'w-[132px] min-w-[132px] max-w-[132px] px-2'
const COL_AUTHOR = 'w-[118px] min-w-[118px] max-w-[118px] px-2'
const COL_VIEW = 'w-[68px] min-w-[68px] max-w-[68px] px-2'
const COL_STAR = 'w-[52px] min-w-[52px] max-w-[52px] px-2'
const COL_COMMENT = 'w-[52px] min-w-[52px] max-w-[52px] px-2'
const COL_HIGHLIGHT = 'w-[52px] min-w-[52px] max-w-[52px] px-2'
const COL_QA = 'w-[68px] min-w-[68px] max-w-[68px] px-2'
const COL_BOOKMARK = 'w-[56px] min-w-[56px] max-w-[56px] px-2'
const COL_PUBLISHED = 'w-[92px] min-w-[92px] max-w-[92px] px-2'

function ArticleSortTh({
  label,
  sortKey,
  align,
  sortBy,
  sortOrder,
  onSort,
  variant = 'default',
  headerSubLines,
  thClassName,
}: {
  label: string
  sortKey: ArticleListSortBy
  align: 'left' | 'center' | 'right'
  sortBy?: ArticleListSortBy
  sortOrder?: 'asc' | 'desc'
  onSort: (key: ArticleListSortBy) => void
  variant?: 'default' | 'dark'
  /** 헤더 제목 아래 작은 글씨로 추가 줄 (예: 발행일 → 날짜 / 시간) */
  headerSubLines?: string[]
  thClassName?: string
}) {
  const active = sortBy === sortKey
  const justify =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
  const textAlign =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  const isDark = variant === 'dark'

  const sortIcons = active ? (
    sortOrder === 'asc' ? (
      <ArrowUp
        className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-[#fff]' : 'text-gray-800')}
        aria-hidden
      />
    ) : (
      <ArrowDown
        className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-[#fff]' : 'text-gray-800')}
        aria-hidden
      />
    )
  ) : (
    <ArrowUpDown
      className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-[#fff]/60' : 'text-gray-400')}
      aria-hidden
    />
  )

  return (
    <th
      className={cn(
        `py-2.5 ${textAlign} text-xs font-medium uppercase tracking-wider normal-case`,
        headerSubLines?.length ? '' : 'whitespace-nowrap',
        isDark ? 'text-[#fff]' : 'text-gray-500',
        thClassName
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          `w-full rounded focus:outline-none focus-visible:ring-2`,
          headerSubLines?.length
            ? cn(`inline-flex flex-col gap-0.5 leading-tight ${justify === 'justify-end' ? 'items-end' : justify === 'justify-center' ? 'items-center' : 'items-start'}`)
            : cn(`inline-flex items-center gap-1 ${justify}`),
          isDark
            ? 'text-[#fff] hover:bg-white/10 hover:text-[#fff] focus-visible:ring-white/40'
            : 'hover:text-gray-900 focus-visible:ring-gray-400'
        )}
        title={
          active
            ? sortOrder === 'asc'
              ? '오름차순 — 클릭 시 내림차순'
              : '내림차순 — 클릭 시 오름차순'
            : '클릭하여 정렬'
        }
      >
        <span className={cn('inline-flex items-center gap-1', justify)}>
          <span className="uppercase tracking-wider">{label}</span>
          {sortIcons}
        </span>
        {headerSubLines?.map((line) => (
          <span
            key={line}
            className="block text-[10px] font-normal normal-case leading-tight opacity-90"
          >
            {line}
          </span>
        ))}
      </button>
    </th>
  )
}

export default function ArticleListPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null)
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<number[]>([])
  const [newStatus, setNewStatus] = useState<string>('')
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
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
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

    const statusMap: Record<string, { label: string; className: string }> = {
      [CONTENT_PUBLISH_STATUS.PUBLISHED]: { label: '공개', className: 'bg-green-100 text-green-800' },
      [CONTENT_PUBLISH_STATUS.PRIVATE]: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
      [CONTENT_PUBLISH_STATUS.SCHEDULED]: { label: '예약 발행', className: 'bg-blue-100 text-blue-800' },
      [CONTENT_PUBLISH_STATUS.DRAFT]: { label: '임시저장', className: 'bg-yellow-100 text-yellow-800' },
      [CONTENT_PUBLISH_STATUS.DELETED]: { label: '삭제됨', className: 'bg-red-100 text-red-800' },
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

  const handleArticleSort = useCallback((key: ArticleListSortBy) => {
    setFilters((prev) => {
      const same = prev.sortBy === key
      const nextOrder: 'asc' | 'desc' =
        same && prev.sortOrder === 'desc' ? 'asc' : 'desc'
      return { ...prev, page: 1, sortBy: key, sortOrder: nextOrder }
    })
  }, [])

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setCategory('전체')
    setVisibility('')
    setStatus('')
    setSearchTerm('')
    setFilters((prev) => ({
      ...prev,
      page: 1,
      sortBy: undefined,
      sortOrder: undefined,
    }))
  }

  return (
    <div className="space-y-2">
      {/* 검색 및 필터 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 기간 검색 */}
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">시작 등록일</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">종료 등록</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* 카테고리 */}
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">카테고리</label>
            <SysCodeSelect
              sysCodeGubn="SYS26209B002"
              value={category}
              onValueChange={setCategory}
              placeholder="전체"
              showAllOption={true}
              allOptionValue="전체"
              allOptionLabel="전체"
            />
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">공개 범위</label>
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
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">상태</label>
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
          <div className="flex items-center col-span-2 gap-2">
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">검색어 입력</label>
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
              size="sm"
              className="w-32 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              조회
            </Button>
            <div className="flex items-center gap-2 ">
            {(startDate ||
              endDate ||
              category !== '전체' ||
              visibility ||
              status ||
              searchTerm ||
              filters.sortBy) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}  className="w-32 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white">
                <X className="h-4 w-4 mr-1" />
                필터 초기화
              </Button>
            )}
            </div>

           </div>
           <div className="flex items-center justify-end gap-2">
           <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            엑셀 다운로드
          </Button>

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
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-10" />
                <col className="w-[72px]" />
                <col />
                <col className="w-[132px]" />
                <col className="w-[118px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead className="border-b border-white/15 bg-[#03213b] text-[#fff]">
                <tr>
                  <th className={cn(ARTICLE_TABLE_HEAD_TH, COL_CHK, 'text-center')}>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={selectedIds.length === articles.length && articles.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-[#fff]/70 ring-offset-[#03213b] data-[state=checked]:border-[#fff] data-[state=checked]:bg-[#fff] data-[state=checked]:text-[#03213b]"
                      />
                    </div>
                  </th>
                  <th className={cn(ARTICLE_TABLE_HEAD_TH, COL_THUMB, 'text-center')}>썸네일</th>
                  <th className={cn(ARTICLE_TABLE_HEAD_TH, COL_TITLE, 'text-left normal-case')}>
                    제목
                  </th>
                  <th className={cn(ARTICLE_TABLE_HEAD_TH, COL_CAT, 'text-center')}>
                    <div className="leading-4 normal-case whitespace-normal text-center">
                      <div>카테고리</div>
                      <div>공개범위</div>
                    </div>
                  </th>
                  <th className={cn(ARTICLE_TABLE_HEAD_TH, COL_AUTHOR, 'text-center')}>
                    <div className="leading-4 normal-case whitespace-normal text-center">
                      <div>작성자</div>
                      <div>상태</div>
                    </div>
                  </th>
                  <ArticleSortTh
                    label="조회수"
                    sortKey="viewCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={COL_VIEW}
                  />
                  <ArticleSortTh
                    label="별점"
                    sortKey="rating"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={cn(COL_STAR, 'text-center')}
                  />
                  <ArticleSortTh
                    label="댓글 수"
                    sortKey="commentCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={COL_COMMENT}
                  />
                  <ArticleSortTh
                    label="HR 수"
                    sortKey="highlightCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={COL_HIGHLIGHT}
                  />
                  <ArticleSortTh
                    label="Q&A"
                    sortKey="answeredQuestionCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={cn(COL_QA, 'text-center')}
                  />
                  <ArticleSortTh
                    label="북마크"
                    sortKey="bookmarkCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={COL_BOOKMARK}
                  />
                  <ArticleSortTh
                    label="발행일"
                    sortKey="publishedAt"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleArticleSort}
                    variant="dark"
                    thClassName={COL_PUBLISHED}
                  />
                </tr>
              </thead>
 
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => {
                  const publishedParts = article.publishedAt
                    ? splitPublishedAtListParts(article.publishedAt)
                    : null
                  return (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className={cn(COL_CHK, 'py-3 align-middle')}>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedIds.includes(article.id)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(article.id, checked as boolean)
                          }
                        />
                      </div>
                    </td>
                    <td className={cn(COL_THUMB, 'py-3 align-middle whitespace-nowrap')}>
                      <div className="flex justify-center">
                        {article.thumbnail ? (
                          <div className="relative h-10 w-14 rounded overflow-hidden">
                            <Image
                              src={article.thumbnail}
                              alt={article.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-14 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
                            없음
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={cn(COL_TITLE, 'align-top break-words text-left')}>
                      <Link
                        href={`/admin/articles/edit?id=${article.id}`}
                        className="block w-full text-left text-sm font-medium text-[#000] no-underline hover:text-[#000] hover:no-underline"
                      >
                        {article.title}
                      </Link>
                      {article.subtitle && (
                        <div className="text-xs text-gray-500 mt-1 text-left">{article.subtitle}</div>
                      )}
                    </td>
                    <td className={cn(COL_CAT, 'py-3 align-middle overflow-hidden text-center')}>
                      <div className="flex min-w-0 flex-col items-center gap-1">
                        <span
                          className="block max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-center text-[11px] font-medium text-gray-800"
                          title={getCategoryName(article.category)}
                        >
                          {getCategoryName(article.category)}
                        </span>
                        <div
                          className="flex min-w-0 max-w-full justify-center truncate [&_*]:truncate"
                          title={String(article.visibility)}
                        >
                          {getVisibilityBadge(article.visibility)}
                        </div>
                      </div>
                    </td>
                    <td className={cn(COL_AUTHOR, 'py-3 align-middle overflow-hidden text-center')}>
                      <div className="flex min-w-0 flex-col items-center gap-1">
                        <div
                          className="w-full truncate text-[11px] text-center"
                          title={[article.author, article.authorAffiliation].filter(Boolean).join(' · ')}
                        >
                          {article.author}
                        </div>
                        <div className="flex min-w-0 max-w-full justify-center truncate">
                          {getStatusBadge(article.status)}
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        COL_VIEW,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                      )}
                    >
                      {article.viewCount.toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        COL_STAR,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-700'
                      )}
                    >
                      <div className="flex justify-center tabular-nums">
                        {article.rating != null ? (
                          <span title="평균 별점">⭐ {article.rating.toFixed(1)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td
                      className={cn(
                        COL_COMMENT,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                      )}
                    >
                      <button
                        type="button"
                        className="inline-flex max-w-full items-center justify-center gap-0.5 truncate underline underline-offset-2 hover:no-underline"
                        onClick={() => {
                          setCommentsContentId(article.id)
                          setCommentsModalOpen(true)
                        }}
                        title="댓글 보기"
                      >
                        <MessageSquare className="h-3 w-3 shrink-0" />
                        {article.commentCount}
                      </button>
                    </td>
                    <td
                      className={cn(
                        COL_HIGHLIGHT,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                      )}
                    >
                      {article.highlightCount ?? 0}
                    </td>
                    <td
                      className={cn(
                        COL_QA,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                      )}
                      title="답변이 있는 질문 수 / 등록된 적용 질문 수"
                    >
                      {article.answeredQuestionCount ?? 0}/{article.questionCount ?? 0}
                    </td>
                    <td
                      className={cn(
                        COL_BOOKMARK,
                        'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                      )}
                      title="북마크(publicUserActivityLog BOOKMARK)"
                    >
                      {(article.bookmarkCount ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        COL_PUBLISHED,
                        'py-3 align-middle text-center text-sm text-gray-600 tabular-nums overflow-hidden'
                      )}
                    >
                      {publishedParts ? (
                        <div className="flex min-w-0 flex-col items-center gap-0.5 leading-tight">
                          <span className="w-full whitespace-nowrap truncate text-center">
                            {publishedParts.date}
                          </span>
                          <span className="w-full whitespace-nowrap truncate text-center text-xs text-gray-500">
                            {publishedParts.time}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                  )
                })}
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

