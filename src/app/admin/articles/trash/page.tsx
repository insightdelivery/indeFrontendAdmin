'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getArticleList,
  restoreArticle,
  hardDeleteArticle,
  type Article,
  PUBLISH_STATUS,
} from '@/features/articles'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  Trash2,
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react'
import Image from 'next/image'

export default function ArticleTrashPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [targetIds, setTargetIds] = useState<number[]>([])

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getArticleList({
        status: PUBLISH_STATUS.DELETED,
      })
      setArticles(result.articles)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '휴지통 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

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

  const handleRestore = (id?: number) => {
    if (id) {
      setTargetId(id)
      setRestoreModalOpen(true)
    } else if (selectedIds.length > 0) {
      setTargetIds(selectedIds)
      setRestoreModalOpen(true)
    } else {
      toast({
        title: '알림',
        description: '복구할 아티클을 선택해주세요.',
        duration: 3000,
      })
    }
  }

  const confirmRestore = async () => {
    try {
      const idsToRestore = targetId ? [targetId] : targetIds
      for (const id of idsToRestore) {
        await restoreArticle(id)
      }
      toast({
        title: '성공',
        description: `${idsToRestore.length}개의 아티클이 복구되었습니다.`,
        duration: 3000,
      })
      setRestoreModalOpen(false)
      setTargetId(null)
      setTargetIds([])
      setSelectedIds([])
      loadArticles()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 복구에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const handleHardDelete = (id?: number) => {
    if (id) {
      setTargetId(id)
      setDeleteModalOpen(true)
    } else if (selectedIds.length > 0) {
      setTargetIds(selectedIds)
      setDeleteModalOpen(true)
    } else {
      toast({
        title: '알림',
        description: '영구 삭제할 아티클을 선택해주세요.',
        duration: 3000,
      })
    }
  }

  const confirmHardDelete = async () => {
    try {
      const idsToDelete = targetId ? [targetId] : targetIds
      for (const id of idsToDelete) {
        await hardDeleteArticle(id)
      }
      toast({
        title: '성공',
        description: `${idsToDelete.length}개의 아티클이 영구 삭제되었습니다.`,
        duration: 3000,
      })
      setDeleteModalOpen(false)
      setTargetId(null)
      setTargetIds([])
      setSelectedIds([])
      loadArticles()
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '아티클 영구 삭제에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    }
  }

  const calculateDaysUntilAutoDelete = (deletedAt?: string) => {
    if (!deletedAt) return null
    const deleted = new Date(deletedAt)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = 30 - daysDiff
    return daysRemaining > 0 ? daysRemaining : 0
  }

  return (
    <div className="h-full space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">휴지통</h1>
            <p className="text-gray-600">삭제된 아티클을 관리하고 복구할 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* 경고 메시지 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">
            휴지통에 보관된 아티클은 30일 후 자동으로 영구 삭제됩니다.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            복구가 필요한 아티클은 30일 이내에 복구해주세요.
          </p>
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
              onClick={() => handleRestore()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              선택 복구
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleHardDelete()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              선택 영구 삭제
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
            <span className="text-sm text-gray-600">
              전체 {articles.length}개
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow mx-auto mb-4"></div>
            로딩 중...
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            휴지통이 비어있습니다.
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
                    삭제일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    삭제 실행자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    남은 보관 기간
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => {
                  const daysRemaining = calculateDaysUntilAutoDelete(article.deletedAt)
                  return (
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
                        <div className="text-sm font-medium text-gray-900">{article.title}</div>
                        {article.subtitle && (
                          <div className="text-xs text-gray-500 mt-1">{article.subtitle}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {article.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>{article.author}</div>
                        {article.authorAffiliation && (
                          <div className="text-xs text-gray-500">{article.authorAffiliation}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {article.deletedAt
                          ? new Date(article.deletedAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {article.deletedBy || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {daysRemaining !== null ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              daysRemaining <= 7
                                ? 'bg-red-100 text-red-800'
                                : daysRemaining <= 14
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            D-{daysRemaining}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(article.id)}
                            title="복구"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHardDelete(article.id)}
                            title="영구 삭제"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 복구 확인 모달 */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>아티클 복구</DialogTitle>
            <DialogDescription>
              {targetId
                ? '이 아티클을 복구하시겠습니까? 복구된 아티클은 유저 서비스에 즉시 재노출됩니다.'
                : `선택한 ${targetIds.length}개의 아티클을 복구하시겠습니까? 복구된 아티클은 유저 서비스에 즉시 재노출됩니다.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>
              취소
            </Button>
            <Button onClick={confirmRestore}>복구</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 영구 삭제 확인 모달 */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>아티클 영구 삭제</DialogTitle>
            <DialogDescription>
              {targetId
                ? '이 아티클을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 완전히 제거됩니다.'
                : `선택한 ${targetIds.length}개의 아티클을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 완전히 제거됩니다.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmHardDelete}>
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


