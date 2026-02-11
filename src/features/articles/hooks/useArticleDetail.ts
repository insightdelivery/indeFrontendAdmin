/**
 * Article 상세 조회 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import { getArticle } from '../services'
import type { Article } from '../types'

export const useArticleDetail = (id: number | null) => {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchArticle = useCallback(async (articleId: number) => {
    try {
      setLoading(true)
      const data = await getArticle(articleId)
      setArticle(data)
      return data
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchArticle(id)
    }
  }, [id, fetchArticle])

  return {
    article,
    loading,
    refetch: () => id && fetchArticle(id),
  }
}

