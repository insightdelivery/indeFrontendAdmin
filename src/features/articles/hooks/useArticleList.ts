/**
 * Article 목록 조회 Hook
 */
import { useState, useCallback } from 'react'
import { getArticleList } from '../services'
import type { Article, ArticleListParams } from '../types'

export const useArticleList = () => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const fetchArticles = useCallback(async (params?: ArticleListParams) => {
    try {
      setLoading(true)
      const result = await getArticleList(params)
      setArticles(result.articles)
      setTotal(result.total)
      setPage(result.page)
      setPageSize(result.pageSize)
      return result
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    articles,
    loading,
    total,
    page,
    pageSize,
    fetchArticles,
  }
}

