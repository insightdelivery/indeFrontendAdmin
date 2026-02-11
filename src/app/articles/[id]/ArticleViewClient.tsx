'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getArticle, type Article } from '@/features/articles'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Star,
  MessageSquare,
  Bookmark,
  HelpCircle,
  Share2,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSysCodeName, getSysCodeFromCache } from '@/lib/syscode'
import { formatDateTime } from '@/lib/utils'

export default function ArticleViewClient() {
  const params = useParams()
  const articleId = Number(params.id)
  const { toast } = useToast()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

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
    } finally {
      setLoading(false)
    }
  }

  const getCategoryName = (categorySid: string): string => {
    const categoryCodes = getSysCodeFromCache('SYS26209B002')
    if (categoryCodes) {
      const categoryName = getSysCodeName(categoryCodes, categorySid)
      if (categoryName !== categorySid) {
        return categoryName
      }
    }
    return categorySid
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        text: article?.subtitle || article?.title,
        url: window.location.href,
      }).catch(() => {
        // 공유 실패 시 클립보드에 복사
        navigator.clipboard.writeText(window.location.href)
        toast({
          title: '링크 복사됨',
          description: '클립보드에 링크가 복사되었습니다.',
          duration: 2000,
        })
      })
    } else {
      // 공유 API가 없으면 클립보드에 복사
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: '링크 복사됨',
        description: '클립보드에 링크가 복사되었습니다.',
        duration: 2000,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">아티클을 찾을 수 없습니다.</p>
          <Link href="/">
            <Button variant="outline">홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
        </div>

        {/* 메인 콘텐츠 */}
        <article className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 썸네일 */}
          {article.thumbnail && (
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* 카테고리 */}
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {getCategoryName(article.category)}
              </span>
            </div>

            {/* 제목 */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {article.title}
            </h1>

            {/* 부제목 */}
            {article.subtitle && (
              <p className="text-xl text-gray-600 mb-6">{article.subtitle}</p>
            )}

            {/* 메타 정보 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{article.author}</span>
                {article.authorAffiliation && (
                  <span className="text-gray-400">({article.authorAffiliation})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDateTime(article.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{article.viewCount?.toLocaleString() || 0}회</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="ml-auto"
              >
                <Share2 className="h-4 w-4 mr-2" />
                공유
              </Button>
            </div>

            {/* 본문 내용 */}
            <div
              className="prose max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* 태그 */}
            {article.tags && article.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  태그
                </h3>
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
              </div>
            )}

            {/* 질문 */}
            {article.questions && article.questions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  적용 질문
                </h3>
                <div className="space-y-3">
                  {article.questions.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-700 mb-1">질문 {index + 1}</p>
                      <p className="text-gray-600">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 통계 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">평점</span>
                </div>
                <p className="text-2xl font-bold">
                  {article.rating ? article.rating.toFixed(1) : '0.0'}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">댓글</span>
                </div>
                <p className="text-2xl font-bold">{article.commentCount || 0}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <Bookmark className="h-4 w-4" />
                  <span className="text-sm">하이라이트</span>
                </div>
                <p className="text-2xl font-bold">{article.highlightCount || 0}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm">질문</span>
                </div>
                <p className="text-2xl font-bold">{article.questionCount || 0}</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

