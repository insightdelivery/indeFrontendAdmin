/**
 * Article Mutations Hook (생성, 수정, 삭제)
 */
import { useState, useCallback } from 'react'
import { createArticle, updateArticle, deleteArticle, deleteArticles, updateArticleStatus } from '../services'
import type { ArticleCreateRequest, ArticleUpdateRequest } from '../types'

export const useArticleMutations = () => {
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (data: ArticleCreateRequest) => {
    try {
      setLoading(true)
      return await createArticle(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (data: ArticleUpdateRequest) => {
    try {
      setLoading(true)
      return await updateArticle(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: number) => {
    try {
      setLoading(true)
      await deleteArticle(id)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeBatch = useCallback(async (ids: number[]) => {
    try {
      setLoading(true)
      await deleteArticles(ids)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (ids: number[], status: string) => {
    try {
      setLoading(true)
      await updateArticleStatus(ids, status)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    create,
    update,
    remove,
    removeBatch,
    updateStatus,
  }
}

