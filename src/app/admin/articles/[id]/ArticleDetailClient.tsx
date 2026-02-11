'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getArticle, deleteArticle, type Article } from '@/features/articles'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Tag,
  Star,
  MessageSquare,
  Bookmark,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSysCodeName, getSysCodeFromCache } from '@/lib/syscode'
import { formatDateTime } from '@/lib/utils'

export default function ArticleDetailClient() {
  const router = useRouter()
  const params = useParams()
  const articleId = Number(params.id)
  const { toast } = useToast()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    if (articleId) {
      loadArticle()
    }
  }, [articleId])

  const loadArticle = async () => {
    try {
      setLoading(true)
      const data = await getArticle(articleId)
      setArticle(data)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
      router.push('/admin/articles')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteArticle(articleId)
      toast({
        title: '성공',
        description: '아티클이 휴지통으로 이동되었습니다.',
        duration: 3000,
      })
      router.push('/admin/articles')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      published: { label: '공개', className: 'bg-green-100 text-green-800' },
      private: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
      scheduled: { label: '예약 발행', className: 'bg-blue-100 text-blue-800' },
      draft: { label: '임시저장', className: 'bg-yellow-100 text-yellow-800' },
      deleted: { label: '삭제됨', className: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
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
    return categorySid
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-4">아티클을 찾을 수 없습니다.</p>
          <Link href="/admin/articles">
            <Button variant="outline">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full space-y-6">
      {/* 상단 제어 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-4xl font-bold text-gray-900">아티클 상세</h1>
              {getStatusBadge(article.status)}
            </div>
            <p className="text-gray-600">아티클 정보를 확인하세요.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.open(`/articles/${articleId}`, '_blank')
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            미리보기
          </Button>
          <Link href={`/admin/articles/edit?id=${articleId}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">제목</label>
              <p className="text-lg font-semibold mt-1">{article.title}</p>
            </div>
            {article.subtitle && (
              <div>
                <label className="text-sm font-medium text-gray-500">부제목</label>
                <p className="text-base mt-1">{article.subtitle}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">카테고리</label>
              <div className="mt-1">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {getCategoryName(article.category)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">공개 범위</label>
              <div className="mt-1">
                {getVisibilityBadge(article.visibility)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">작성자</label>
              <p className="text-base mt-1 flex items-center gap-2">
                <User className="h-4 w-4" />
                {article.author}
                {article.authorAffiliation && (
                  <span className="text-sm text-gray-500">({article.authorAffiliation})</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">등록일</label>
              <p className="text-base mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateTime(article.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">수정일</label>
              <p className="text-base mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateTime(article.updatedAt)}
              </p>
            </div>
            {article.scheduledAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">예약 발행일</label>
                <p className="text-base mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDateTime(article.scheduledAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 썸네일 */}
      {article.thumbnail && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">썸네일</h2>
          <div className="relative w-full h-64 rounded-lg overflow-hidden border">
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              className="object-cover"
            />
          </div>
        </Card>
      )}

      {/* 본문 내용 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">본문 내용</h2>
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </Card>

      {/* 태그 */}
      {article.tags && article.tags.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            태그
          </h2>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* 질문 */}
      {article.questions && article.questions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            적용 질문
          </h2>
          <div className="space-y-3">
            {article.questions.map((question, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700">질문 {index + 1}</p>
                <p className="text-gray-600 mt-1">{question}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 통계 정보 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">통계 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              조회수
            </p>
            <p className="text-2xl font-bold">{article.viewCount?.toLocaleString() || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Star className="h-4 w-4" />
              평점
            </p>
            <p className="text-2xl font-bold">
              {article.rating ? article.rating.toFixed(1) : '0.0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              댓글 수
            </p>
            <p className="text-2xl font-bold">{article.commentCount || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              하이라이트
            </p>
            <p className="text-2xl font-bold">{article.highlightCount || 0}</p>
          </div>
        </div>
      </Card>

      {/* 추가 정보 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">추가 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">에디터 추천</label>
            <p className="text-base mt-1">
              {article.isEditorPick ? (
                <span className="text-yellow-500">★ 추천됨</span>
              ) : (
                <span className="text-gray-400">☆ 추천 안됨</span>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">미리보기 분량</label>
            <p className="text-base mt-1">{article.previewLength || 50}%</p>
          </div>
          {article.deletedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">삭제일</label>
              <p className="text-base mt-1">{formatDateTime(article.deletedAt)}</p>
            </div>
          )}
          {article.deletedBy && (
            <div>
              <label className="text-sm font-medium text-gray-500">삭제자</label>
              <p className="text-base mt-1">{article.deletedBy}</p>
            </div>
          )}
        </div>
      </Card>

      {/* 삭제 확인 모달 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>아티클 삭제</DialogTitle>
            <DialogDescription>
              이 아티클을 휴지통으로 이동하시겠습니까? 삭제된 콘텐츠는 유저 페이지에서 즉시 노출 중단됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

