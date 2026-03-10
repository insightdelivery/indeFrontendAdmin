/**
 * 콘텐츠 질문 관리 API (관리자)
 */
import apiClient from '@/lib/axios'
import type {
  ContentQuestion,
  ContentTypeQuestion,
  ContentQuestionCreateRequest,
  ContentQuestionUpdateRequest,
} from '../types'

function unwrap<T>(response: { data: { IndeAPIResponse?: { ErrorCode: string; Message: string; Result: T } } }): T {
  const api = response.data.IndeAPIResponse
  if (!api || api.ErrorCode !== '00') {
    throw new Error(api?.Message || '요청 처리에 실패했습니다.')
  }
  return api.Result as T
}

/** 특정 콘텐츠의 질문 목록 조회 */
export async function getContentQuestions(
  contentType: ContentTypeQuestion,
  contentId: number
): Promise<ContentQuestion[]> {
  const response = await apiClient.get<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: ContentQuestion[] } }>(
    '/content/questions/',
    { params: { content_type: contentType, content_id: contentId } }
  )
  const result = unwrap(response)
  return Array.isArray(result) ? result : []
}

/** 질문 등록 */
export async function createContentQuestion(
  data: ContentQuestionCreateRequest
): Promise<ContentQuestion> {
  const response = await apiClient.post<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: ContentQuestion } }>(
    '/content/questions/',
    data
  )
  return unwrap(response)
}

/** 질문 수정 (답변 있으면 서버에서 400) */
export async function updateContentQuestion(
  questionId: number,
  data: ContentQuestionUpdateRequest
): Promise<ContentQuestion> {
  const response = await apiClient.put<{ IndeAPIResponse: { ErrorCode: string; Message: string; Result: ContentQuestion } }>(
    `/content/questions/${questionId}/`,
    data
  )
  return unwrap(response)
}

/** 질문 삭제 */
export async function deleteContentQuestion(questionId: number): Promise<void> {
  await apiClient.delete(`/content/questions/${questionId}/`)
}
