'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getVideoList,
  getVideo,
  deleteVideo,
  deleteVideos,
  updateVideoStatus,
  type Video,
  type VideoListParams,
  CONTENT_TYPE,
  VIDEO_STATUS,
  SEARCH_TYPE,
  SORT_OPTIONS,
} from '@/features/video'
import { useToast } from '@/hooks/use-toast'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import { getSysCodeName, getSysCodeFromCache } from '@/lib/syscode'
import { Button } from '@/components/ui/button'
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
import { formatDateTime } from '@/lib/utils'
import Cookies from 'js-cookie'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  X,
  RefreshCw,
  User,
  Tag,
  MessageSquare,
  Star,
  Video as VideoIcon,
  FileVideo,
  GraduationCap,
} from 'lucide-react'
import Image from 'next/image'

export default function VideoListPage() {
  const router = useRouter()
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

  // 필터 상태
  const [filters, setFilters] = useState<VideoListParams>({
    page: 1,
    pageSize: 20,
  })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contentType, setContentType] = useState<string>('')
  const [category, setCategory] = useState<string>('전체')
  const [visibility, setVisibility] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<string>('all')
  const [sort, setSort] = useState<string>('createdAt')

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true)
      const params: VideoListParams = {
        ...filters,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contentType: (contentType === 'video' || contentType === 'seminar') ? contentType as 'video' | 'seminar' : undefined,
        category: category === '전체' ? undefined : category,
        visibility: visibility || undefined,
        status: status || undefined,
        search: searchTerm || undefined,
        searchType: searchType as any,
        sort: sort as any,
      }
      const result = await getVideoList(params)
      setVideos(result.videos)
    } catch (error: any) {
      // 401/403 에러인 경우 토큰 무효화로 간주하고 로그인 페이지로 리다이렉트
      if (error.response?.status === 401 || error.response?.status === 403) {
        // axios 인터셉터가 이미 처리했지만, 추가로 확인
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // 쿠키 삭제
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          Cookies.remove('userInfo')
          
          // 로그인 페이지로 리다이렉트
          window.location.href = '/login'
          return
        }
      }
      
      toast({
        title: '오류',
        description: error.message || '비디오/세미나 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [filters, startDate, endDate, contentType, category, visibility, status, searchTerm, searchType, sort, toast])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

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
        description: '삭제할 비디오/세미나를 선택해주세요.',
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
          description: `${deleteTarget.length}개의 비디오/세미나가 삭제되었습니다.`,
          duration: 3000,
        })
      } else if (deleteTarget) {
        await deleteVideo(deleteTarget)
        toast({
          title: '성공',
          description: '비디오/세미나가 삭제되었습니다.',
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
        description: error.message || '비디오/세미나 삭제에 실패했습니다.',
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
        description: `${statusChangeTarget.length}개의 비디오/세미나 상태가 변경되었습니다.`,
        duration: 3000,
      })
      setStatusChangeModalOpen(false)
      setStatusChangeTarget([])
      setSelectedIds([])
      loadVideos()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '비디오/세미나 상태 변경에 실패했습니다.',
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
    const statusMap: Record<string, { label: string; className: string }> = {
      public: { label: '공개', className: 'bg-green-100 text-green-800' },
      private: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
      scheduled: { label: '예약', className: 'bg-blue-100 text-blue-800' },
      deleted: { label: '삭제대기', className: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getContentTypeBadge = (contentType: string) => {
    return contentType === 'video' ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
        <FileVideo className="h-3 w-3" />
        비디오
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
        <GraduationCap className="h-3 w-3" />
        세미나
      </span>
    )
  }

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setContentType('')
    setCategory('전체')
    setVisibility('')
    setStatus('')
    setSearchTerm('')
    setSearchType('all')
    setSort('createdAt')
  }

  return (
    <div className="h-full space-y-6 relative">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">비디오/세미나 관리</h1>
          <p className="text-gray-600">비디오 및 세미나 콘텐츠를 검색, 필터링하고 관리할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/video/new">
            <Button className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
              <Plus className="h-4 w-4 mr-2" />
              새 콘텐츠
            </Button>
          </Link>
        </div>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">검색 및 필터</h2>
          {(startDate || endDate || contentType || category !== '전체' || visibility || status || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
              <X className="h-4 w-4 mr-1" />
              필터 초기화
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 검색어 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">검색어</label>
            <div className="flex gap-2">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="title">제목</SelectItem>
                  <SelectItem value="speaker">출연자</SelectItem>
                  <SelectItem value="keyword">키워드</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="검색어 입력"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    loadVideos()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={loadVideos}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 분류 필터 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">분류</label>
            <Select value={contentType || 'all'} onValueChange={(value) => setContentType(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value={CONTENT_TYPE.VIDEO}>비디오</SelectItem>
                <SelectItem value={CONTENT_TYPE.SEMINAR}>세미나</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 카테고리 필터 */}
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

          {/* 노출 상태 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">노출 상태</label>
            <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value={VIDEO_STATUS.PUBLIC}>공개</SelectItem>
                <SelectItem value={VIDEO_STATUS.PRIVATE}>비공개</SelectItem>
                <SelectItem value={VIDEO_STATUS.SCHEDULED}>예약</SelectItem>
                <SelectItem value={VIDEO_STATUS.DELETED}>삭제대기</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {/* 정렬 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">정렬</label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SORT_OPTIONS.CREATED_AT}>최신순</SelectItem>
                <SelectItem value={SORT_OPTIONS.VIEW_COUNT}>조회수순</SelectItem>
                <SelectItem value={SORT_OPTIONS.RATING}>인기순(별점)</SelectItem>
                <SelectItem value={SORT_OPTIONS.SHARE_COUNT}>공유순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 일괄 관리 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="bg-neon-yellow rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <span className="font-medium text-black">
            {selectedIds.length}개 항목 선택됨
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(selectedIds, VIDEO_STATUS.PRIVATE)}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              비공개 전환
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              선택 삭제
            </Button>
          </div>
        </div>
      )}

      {/* 비디오/세미나 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedIds.length === videos.length && videos.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              전체 {videos.length}개
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow mx-auto mb-4"></div>
            로딩 중...
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchTerm || contentType || category !== '전체' || visibility || status
              ? '검색 결과가 없습니다.'
              : '등록된 비디오/세미나가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <Checkbox
                      checked={selectedIds.length === videos.length && videos.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    썸네일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    분류
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    콘텐츠 제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출연자/강사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    별점/댓글
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedIds.includes(video.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(video.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {video.thumbnail ? (
                        <div className="relative w-16 h-10 rounded overflow-hidden">
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getContentTypeBadge(video.contentType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {(() => {
                          const codes = getSysCodeFromCache('SYS26209B002')
                          return codes ? getSysCodeName(codes, video.category) : null
                        })() || video.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="text-sm font-medium text-gray-900 hover:underline text-left"
                        onClick={() => handleOpenDetail(video.id)}
                      >
                        {video.title}
                      </button>
                      {video.subtitle && (
                        <div className="text-xs text-gray-500 mt-1">{video.subtitle}</div>
                      )}
                      <div className="flex gap-1 mt-1">
                        {video.isNewBadge && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            NEW
                          </span>
                        )}
                        {video.isMaterialBadge && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            자료
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{video.speaker || '-'}</div>
                      {video.speakerAffiliation && (
                        <div className="text-xs text-gray-500">{video.speakerAffiliation}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {video.editor || video.director || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(video.createdAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {video.viewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                        {video.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {video.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {video.commentCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(video.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" title="상세" onClick={() => handleOpenDetail(video.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/video/edit?id=${video.id}`}>
                          <Button variant="ghost" size="sm" title="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(video.id)}
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
      </div>

      {/* 삭제 확인 모달 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비디오/세미나 삭제</DialogTitle>
            <DialogDescription>
              {Array.isArray(deleteTarget)
                ? `선택한 ${deleteTarget.length}개의 비디오/세미나를 삭제하시겠습니까? 삭제 시 사용자의 북마크 및 관련 라이브러리에서 접근이 제한됩니다.`
                : '이 비디오/세미나를 삭제하시겠습니까? 삭제 시 사용자의 북마크 및 관련 라이브러리에서 접근이 제한됩니다.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
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
              선택한 {statusChangeTarget.length}개의 비디오/세미나를{' '}
              {newStatus === VIDEO_STATUS.PUBLIC
                ? '공개'
                : newStatus === VIDEO_STATUS.PRIVATE
                  ? '비공개'
                  : newStatus}
              로 변경하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeModalOpen(false)}>
              취소
            </Button>
            <Button onClick={confirmStatusChange}>변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 미리보기 모달 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>상세 미리보기</DialogTitle>
            <DialogDescription>
              {selectedVideo?.title || '비디오/세미나 상세 정보'}
            </DialogDescription>
          </DialogHeader>

          {selectedVideo && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {(selectedVideo.videoStreamInfo?.embedUrl || selectedVideo.videoStreamId) && (
                <div className="rounded border overflow-hidden">
                  <iframe
                    src={selectedVideo.videoStreamInfo?.embedUrl || `https://iframe.videodelivery.net/${selectedVideo.videoStreamId}`}
                    className="w-full aspect-video"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title="video-preview"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">상태</span><div>{getStatusBadge(selectedVideo.status)}</div></div>
                <div><span className="text-gray-500">분류</span><div>{selectedVideo.contentType}</div></div>
                <div><span className="text-gray-500">카테고리</span><div>{(() => {
                  const codes = getSysCodeFromCache('SYS26209B002')
                  return codes ? getSysCodeName(codes, selectedVideo.category) : null
                })() || selectedVideo.category}</div></div>
                <div><span className="text-gray-500">출연자</span><div>{selectedVideo.speaker || '-'}</div></div>
                <div><span className="text-gray-500">작성자</span><div>{selectedVideo.editor || selectedVideo.director || '-'}</div></div>
              </div>

              {selectedVideo.body && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">본문</div>
                  <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedVideo.body }} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedVideo && (
              <Link href={`/admin/video/edit?id=${selectedVideo.id}`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-neon-yellow border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}

