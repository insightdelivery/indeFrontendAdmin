'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getVideoList,
  getVideo,
  deleteVideo,
  deleteVideos,
  updateVideoStatus,
  exportVideosToExcel,
  type Video,
  type VideoListParams,
  type VideoListSortBy,
  VIDEO_STATUS,
  VIDEO_CATEGORY_PARENT,
  VISIBILITY_OPTIONS,
} from '@/features/video'
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
  ADMIN_CONTENT_TABLE_HEAD_TH,
  splitPublishedAtListParts,
  VIDEO_LIST_COL_ACTIONS,
  VIDEO_LIST_COL_BOOKMARK,
  VIDEO_LIST_COL_CAT,
  VIDEO_LIST_COL_CHK,
  VIDEO_LIST_COL_COMMENT,
  VIDEO_LIST_COL_PUBL,
  VIDEO_LIST_COL_QA,
  VIDEO_LIST_COL_SPEAKER,
  VIDEO_LIST_COL_STAR,
  VIDEO_LIST_COL_THUMB,
  VIDEO_LIST_COL_TITLE,
  VIDEO_LIST_COL_VIEW,
  VIDEO_LIST_COL_VIS,
} from '@/lib/adminContentListTable'
import VideoDetailSections from '@/components/video/VideoDetailSections'
import { clearClientAdminSession } from '@/lib/adminClientSession'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  MessageSquare,
  Star,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import Image from 'next/image'

function VideoSortTh({
  label,
  sortKey,
  align,
  sortBy,
  sortOrder,
  onSort,
  headerSubLines,
  thClassName,
}: {
  label: string
  sortKey: VideoListSortBy
  align: 'left' | 'center' | 'right'
  sortBy?: VideoListSortBy
  sortOrder?: 'asc' | 'desc'
  onSort: (key: VideoListSortBy) => void
  headerSubLines?: string[]
  thClassName?: string
}) {
  const active = sortBy === sortKey
  const justify =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
  const textAlign =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  const sortIcons = active ? (
    sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-[#fff]" aria-hidden />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 shrink-0 text-[#fff]" aria-hidden />
    )
  ) : (
    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#fff]/60" aria-hidden />
  )
  return (
    <th
      className={cn(
        `py-2.5 ${textAlign} text-xs font-medium uppercase tracking-wider normal-case`,
        headerSubLines?.length ? '' : 'whitespace-nowrap',
        'text-[#fff]',
        thClassName
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'w-full rounded focus:outline-none focus-visible:ring-2',
          headerSubLines?.length
            ? cn(
                `inline-flex flex-col gap-0.5 leading-tight ${justify === 'justify-end' ? 'items-end' : justify === 'justify-center' ? 'items-center' : 'items-start'}`
              )
            : cn('inline-flex items-center gap-1', justify),
          'text-[#fff] hover:bg-white/10 hover:text-[#fff] focus-visible:ring-white/40'
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

export default function VideoListPage() {
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null)
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<number[]>([])
  const [newStatus, setNewStatus] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [commentsModalOpen, setCommentsModalOpen] = useState(false)
  const [commentsContentId, setCommentsContentId] = useState<number | null>(null)

  // 필터 상태
  const [filters, setFilters] = useState<VideoListParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [total, setTotal] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState<string>('전체')
  const [visibility, setVisibility] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<string>('all')
  const [exporting, setExporting] = useState(false)

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true)
      const params: VideoListParams = {
        ...filters,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contentType: 'video',
        category: category === '전체' ? undefined : category,
        visibility: visibility || undefined,
        status: status || undefined,
        search: searchTerm || undefined,
        searchType: searchType as VideoListParams['searchType'],
      }
      const result = await getVideoList(params)
      setVideos(result.videos)
      setTotal(result.total)
    } catch (error: any) {
      // 401/403 에러인 경우 토큰 무효화로 간주하고 로그인 페이지로 리다이렉트
      if (error.response?.status === 401 || error.response?.status === 403) {
        // axios 인터셉터가 이미 처리했지만, 추가로 확인
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          clearClientAdminSession()
          window.location.href = '/login'
          return
        }
      }
      
      toast({
        title: '오류',
        description: error.message || '비디오 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [filters, startDate, endDate, category, visibility, status, searchTerm, searchType, toast])

  const handleExport = async () => {
    try {
      setExporting(true)
      const blob = await exportVideosToExcel({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contentType: 'video',
        category: category === '전체' ? undefined : category,
        visibility: visibility || undefined,
        status: status || undefined,
        search: searchTerm || undefined,
        searchType: searchType as VideoListParams['searchType'],
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `videos_${new Date().toISOString().split('T')[0]}.xlsx`
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
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const handleVideoSort = useCallback((key: VideoListSortBy) => {
    setFilters((prev) => {
      const same = prev.sortBy === key
      const nextOrder: 'asc' | 'desc' =
        same && prev.sortOrder === 'desc' ? 'asc' : 'desc'
      return { ...prev, page: 1, sortBy: key, sortOrder: nextOrder }
    })
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(videos.map((video) => video.id))
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
        description: '삭제할 비디오를 선택해주세요.',
        duration: 3000,
      })
      return
    }
    setDeleteTarget(selectedIds)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setDeleting(true)
      if (Array.isArray(deleteTarget)) {
        await deleteVideos(deleteTarget)
        toast({
          title: '성공',
          description: `${deleteTarget.length}개의 비디오가 삭제되었습니다.`,
          duration: 3000,
        })
      } else if (deleteTarget) {
        await deleteVideo(deleteTarget)
        toast({
          title: '성공',
          description: '비디오가 삭제되었습니다.',
          duration: 3000,
        })
      }
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setSelectedIds([])
      loadVideos()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '비디오 삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = (ids: number[], status: string) => {
    setStatusChangeTarget(ids)
    setNewStatus(status)
    setStatusChangeModalOpen(true)
  }

  const confirmStatusChange = async () => {
    try {
      await updateVideoStatus(statusChangeTarget, newStatus)
      toast({
        title: '성공',
        description: `${statusChangeTarget.length}개의 비디오 상태가 변경되었습니다.`,
        duration: 3000,
      })
      setStatusChangeModalOpen(false)
      setStatusChangeTarget([])
      setSelectedIds([])
      loadVideos()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '비디오 상태 변경에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleOpenDetail = async (id: number) => {
    try {
      const video = await getVideo(id)
      setSelectedVideo(video)
      setDetailModalOpen(true)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '상세 정보를 불러오지 못했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusCodes = getSysCodeFromCache('SYS26209B020')
    if (statusCodes) {
      const statusName = getSysCodeName(statusCodes, status)
      if (statusName !== status) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {statusName}
          </span>
        )
      }
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      [CONTENT_PUBLISH_STATUS.PUBLISHED]: { label: '공개', className: 'bg-green-100 text-green-800' },
      [CONTENT_PUBLISH_STATUS.PRIVATE]: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
      [CONTENT_PUBLISH_STATUS.SCHEDULED]: { label: '예약', className: 'bg-blue-100 text-blue-800' },
      [CONTENT_PUBLISH_STATUS.DELETED]: { label: '삭제대기', className: 'bg-red-100 text-red-800' },
      [CONTENT_PUBLISH_STATUS.DRAFT]: { label: '임시저장', className: 'bg-gray-100 text-gray-800' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getVisibilityBadge = (visibility: string) => {
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

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setCategory('전체')
    setVisibility('')
    setStatus('')
    setSearchTerm('')
    setSearchType('all')
    setFilters((prev) => ({
      ...prev,
      page: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }))
  }

  const filterBarActive =
    !!startDate ||
    !!endDate ||
    category !== '전체' ||
    !!visibility ||
    !!status ||
    !!searchTerm ||
    searchType !== 'all' ||
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'desc'

  const TH = ADMIN_CONTENT_TABLE_HEAD_TH

  return (
    <div className="space-y-2 relative">
      {/* 검색 및 필터 (아티클 목록과 동일 패턴) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">시작 등록일</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">종료 등록</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              <label className=" whitespace-nowrap text-sm font-medium text-gray-700 min-w-fit">카테고리</label>
              <div className="min-w-[160px]">
                <SysCodeSelect
                  sysCodeGubn={VIDEO_CATEGORY_PARENT}
                  value={category}
                  onValueChange={setCategory}
                  placeholder="전체"
                  showAllOption={true}
                  allOptionValue="전체"
                  allOptionLabel="전체"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className=" whitespace-nowrap text-sm font-medium text-gray-700">공개 범위</label>
              <Select
                value={visibility || 'all'}
                onValueChange={(value) => setVisibility(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {VISIBILITY_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
         
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">상태</label>
              <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
                <SelectTrigger  className="min-w-[160px]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value={VIDEO_STATUS.PUBLIC}>공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.PRIVATE}>비공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.SCHEDULED}>예약</SelectItem>
                  <SelectItem value={VIDEO_STATUS.DRAFT}>임시저장</SelectItem>
                  <SelectItem value={VIDEO_STATUS.DELETED}>삭제대기</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-1 flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <label className="min-w-fit whitespace-nowrap text-sm font-medium text-gray-700">검색</label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-[7.5rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="title">제목</SelectItem>
                  <SelectItem value="speaker">출연자</SelectItem>
                  <SelectItem value="keyword">키워드</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="검색어 입력"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFilters((prev) => ({ ...prev, page: 1 }))
              }}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              size="sm"
              className="w-32 shrink-0 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              조회
            </Button>
            {filterBarActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="w-32 shrink-0 border-0 bg-[#3c83cf] text-white shadow-sm hover:bg-[#3278b8] hover:text-white"
              >
                <X className="mr-1 h-4 w-4" />
                필터 초기화
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-1">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? '다운로드 중…' : '엑셀 다운로드'}
            </Button>
            <Link href="/admin/video/new">
              <Button type="button" size="sm" className="bg-black text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" />
                새 콘텐츠
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 p-4">
          <span className="font-medium text-black">{selectedIds.length}개 항목 선택됨</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleStatusChange(selectedIds, VIDEO_STATUS.PUBLIC)}>
              <Eye className="mr-2 h-4 w-4" />
              공개로 변경
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleStatusChange(selectedIds, VIDEO_STATUS.PRIVATE)}>
              <EyeOff className="mr-2 h-4 w-4" />
              비공개로 변경
            </Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={handleBatchDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              선택 삭제
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            로딩 중...
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {filterBarActive ? '검색 결과가 없습니다.' : '등록된 비디오가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-10" />
                <col className="w-[72px]" />
                <col className="w-[120px]" />
                <col />
                <col className="w-[104px]" />
                <col className="w-[120px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="border-b border-white/15 bg-[#03213b] text-[#fff]">
                <tr>
                  <th className={cn(TH, VIDEO_LIST_COL_CHK, 'text-center')}>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={selectedIds.length === videos.length && videos.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-[#fff]/70 ring-offset-[#03213b] data-[state=checked]:border-[#fff] data-[state=checked]:bg-[#fff] data-[state=checked]:text-[#03213b]"
                      />
                    </div>
                  </th>
                  <th className={cn(TH, VIDEO_LIST_COL_THUMB, 'text-center')}>썸네일</th>
                  <th className={cn(TH, VIDEO_LIST_COL_CAT, 'text-center')}>카테고리</th>
                  <th className={cn(TH, VIDEO_LIST_COL_TITLE, 'text-left normal-case')}>제목</th>
                  <th className={cn(TH, VIDEO_LIST_COL_SPEAKER, 'text-center')}>
                    <div className="whitespace-normal text-center text-xs normal-case leading-4">
                      <div>출연자</div>
                      <div>강사</div>
                    </div>
                  </th>
                  <th className={cn(TH, VIDEO_LIST_COL_VIS, 'text-center')}>
                    <div className="whitespace-normal text-center text-xs normal-case leading-4">
                      <div>공개범위</div>
                      <div>상태</div>
                    </div>
                  </th>
                  <VideoSortTh
                    label="조회수"
                    sortKey="viewCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={VIDEO_LIST_COL_VIEW}
                  />
                  <VideoSortTh
                    label="별점"
                    sortKey="rating"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={cn(VIDEO_LIST_COL_STAR, 'text-center')}
                  />
                  <VideoSortTh
                    label="댓글 수"
                    sortKey="commentCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={VIDEO_LIST_COL_COMMENT}
                  />
                  <VideoSortTh
                    label="Q&A"
                    sortKey="answeredQuestionCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={cn(VIDEO_LIST_COL_QA, 'text-center')}
                  />
                  <VideoSortTh
                    label="북마크"
                    sortKey="bookmarkCount"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={VIDEO_LIST_COL_BOOKMARK}
                  />
                  <VideoSortTh
                    label="발행일"
                    sortKey="publishedAt"
                    align="center"
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleVideoSort}
                    thClassName={VIDEO_LIST_COL_PUBL}
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {videos.map((video) => {
                  const publishedParts = video.publishedAt ? splitPublishedAtListParts(video.publishedAt) : null
                  const categoryLabel =
                    (() => {
                      const codes = getSysCodeFromCache(VIDEO_CATEGORY_PARENT)
                      return codes ? getSysCodeName(codes, video.category) : null
                    })() || video.category
                  return (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className={cn(VIDEO_LIST_COL_CHK, 'py-3 align-middle')}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={selectedIds.includes(video.id)}
                            onCheckedChange={(checked) => handleSelectItem(video.id, checked as boolean)}
                          />
                        </div>
                      </td>
                      <td className={cn(VIDEO_LIST_COL_THUMB, 'py-3 align-middle whitespace-nowrap')}>
                        <div className="flex justify-center">
                          {video.thumbnail ? (
                            <div className="relative h-10 w-14 overflow-hidden rounded">
                              <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-400">
                              없음
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={cn(VIDEO_LIST_COL_CAT, 'py-3 align-middle overflow-hidden text-center')}>
                        <div className="flex min-w-0 flex-col items-center gap-1">
                          <span
                            className="block max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-center text-[11px] font-medium text-gray-800"
                            title={categoryLabel}
                          >
                            {categoryLabel}
                          </span>
                        </div>
                      </td>
                      <td className={cn(VIDEO_LIST_COL_TITLE, 'align-top break-words text-left')}>
                        <Link
                          href={`/admin/video/edit?id=${video.id}`}
                          className="block w-full truncate text-left text-sm font-medium text-[#000] no-underline hover:text-[#000] hover:no-underline"
                          title={video.title}
                        >
                          {video.title}
                        </Link>
                        {video.subtitle ? (
                          <div className="mt-1 text-left text-xs text-gray-500">{video.subtitle}</div>
                        ) : null}
                      </td>
                      <td className={cn(VIDEO_LIST_COL_SPEAKER, 'py-3 align-middle overflow-hidden text-center')}>
                        <div
                          className="w-full truncate text-sm text-center"
                          title={video.speaker || undefined}
                        >
                          {video.speaker || '—'}
                        </div>
                      </td>
                      <td className={cn(VIDEO_LIST_COL_VIS, 'py-3 align-middle overflow-hidden text-center')}>
                        <div className="flex min-w-0 flex-col items-center gap-1">
                          <div className="flex min-w-0 max-w-full justify-center truncate [&_*]:truncate">
                            {getVisibilityBadge(video.visibility)}
                          </div>
                          <div className="flex min-w-0 max-w-full justify-center truncate">{getStatusBadge(video.status)}</div>
                        </div>
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_VIEW,
                          'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                        )}
                      >
                        {video.viewCount.toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_STAR,
                          'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-700'
                        )}
                      >
                        <div className="flex justify-center tabular-nums">
                          {video.rating != null ? (
                            <span className="inline-flex items-center gap-0.5" title="평균 별점">
                              <Star className="h-3 w-3 shrink-0 text-yellow-500" />
                              {video.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_COMMENT,
                          'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                        )}
                      >
                        <button
                          type="button"
                          className="inline-flex max-w-full items-center justify-center gap-0.5 truncate underline underline-offset-2 hover:no-underline"
                          onClick={() => {
                            setCommentsContentId(video.id)
                            setCommentsModalOpen(true)
                          }}
                        >
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          {video.commentCount}
                        </button>
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_QA,
                          'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                        )}
                        title="답변이 있는 질문 수 / 등록된 적용 질문 수"
                      >
                        {video.answeredQuestionCount ?? 0}/{video.questionCount ?? 0}
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_BOOKMARK,
                          'py-3 align-middle whitespace-nowrap text-center text-sm text-gray-600 tabular-nums'
                        )}
                        title="북마크(publicUserActivityLog BOOKMARK)"
                      >
                        {(video.bookmarkCount ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          VIDEO_LIST_COL_PUBL,
                          'py-3 align-middle overflow-hidden text-center text-sm text-gray-600 tabular-nums'
                        )}
                      >
                        {publishedParts ? (
                          <div className="flex min-w-0 flex-col items-center gap-0.5 leading-tight">
                            <span className="w-full truncate whitespace-nowrap text-center">{publishedParts.date}</span>
                            <span className="w-full truncate whitespace-nowrap text-center text-xs text-gray-500">
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

        {total > 0 ? (
          <ListPagination
            currentPage={filters.page ?? 1}
            totalPages={Math.ceil(total / (filters.pageSize ?? 10)) || 1}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            total={total}
            disabled={loading}
          />
        ) : null}
      </div>

      {/* 삭제 확인 모달 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비디오 삭제</DialogTitle>
            <DialogDescription>
              {Array.isArray(deleteTarget)
                ? `선택한 ${deleteTarget.length}개의 비디오를 삭제하시겠습니까? 삭제 시 사용자의 북마크 및 관련 라이브러리에서 접근이 제한됩니다.`
                : '이 비디오를 삭제하시겠습니까? 삭제 시 사용자의 북마크 및 관련 라이브러리에서 접근이 제한됩니다.'}
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
              선택한 {statusChangeTarget.length}개의 비디오를{' '}
              {newStatus === VIDEO_STATUS.PUBLIC
                ? '공개'
                : newStatus === VIDEO_STATUS.PRIVATE
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

      {/* 상세 미리보기 모달 — VideoPlayer 항상 렌더(플랜 §6.11·seminarPlan §4.1) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title || '상세 미리보기'}</DialogTitle>
            {selectedVideo?.subtitle ? (
              <DialogDescription>{selectedVideo.subtitle}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">비디오 상세 미리보기</DialogDescription>
            )}
          </DialogHeader>

          {selectedVideo && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
              <VideoDetailSections video={selectedVideo} compact omitTitleSubtitle />
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
            {selectedVideo && (
              <Link href={`/admin/video/edit?id=${selectedVideo.id}`}>
                <Button type="button" variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {commentsContentId != null ? (
        <CommentsModal
          open={commentsModalOpen}
          onOpenChange={setCommentsModalOpen}
          contentType="VIDEO"
          contentId={commentsContentId}
        />
      ) : null}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-900 border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}

