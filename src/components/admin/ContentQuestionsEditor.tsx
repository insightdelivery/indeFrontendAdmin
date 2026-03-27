'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getContentQuestions,
  createContentQuestion,
  updateContentQuestion,
  deleteContentQuestion,
  type ContentQuestion,
  type ContentTypeQuestion,
} from '@/features/contentQuestion'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

export interface ContentQuestionsEditorProps {
  contentType: ContentTypeQuestion
  contentId: number
}

/**
 * 관리자 — `content_question` API로 적용 질문 CRUD (아티클·비디오·세미나 공통)
 */
export default function ContentQuestionsEditor({ contentType, contentId }: ContentQuestionsEditorProps) {
  const { toast } = useToast()
  const [contentQuestions, setContentQuestions] = useState<ContentQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)
  const [editingQuestionText, setEditingQuestionText] = useState('')

  const loadContentQuestions = useCallback(async () => {
    if (!contentId || contentId <= 0) return
    setQuestionsLoading(true)
    try {
      const list = await getContentQuestions(contentType, contentId)
      setContentQuestions(list)
    } catch {
      setContentQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }, [contentType, contentId])

  useEffect(() => {
    void loadContentQuestions()
  }, [loadContentQuestions])

  const handleAddContentQuestion = async () => {
    if (!newQuestionText.trim()) {
      toast({ title: '알림', description: '질문 내용을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      await createContentQuestion({
        content_type: contentType,
        content_id: contentId,
        question_text: newQuestionText.trim(),
        sort_order: contentQuestions.length,
        is_required: true,
      })
      setNewQuestionText('')
      await loadContentQuestions()
      toast({ title: '성공', description: '질문이 등록되었습니다.' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '질문 등록에 실패했습니다.'
      toast({ title: '오류', description: msg, variant: 'destructive' })
    }
  }

  const handleUpdateContentQuestion = async (q: ContentQuestion) => {
    if (q.is_locked) return
    const text = editingQuestionText.trim()
    if (!text) return
    try {
      await updateContentQuestion(q.question_id, { question_text: text })
      setEditingQuestionId(null)
      setEditingQuestionText('')
      await loadContentQuestions()
      toast({ title: '성공', description: '질문이 수정되었습니다.' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '질문 수정에 실패했습니다.'
      toast({ title: '오류', description: msg, variant: 'destructive' })
    }
  }

  const handleDeleteContentQuestion = async (q: ContentQuestion) => {
    if (q.is_locked) {
      toast({ title: '알림', description: '답변이 등록된 질문은 삭제할 수 없습니다.', variant: 'destructive' })
      return
    }
    try {
      await deleteContentQuestion(q.question_id)
      await loadContentQuestions()
      toast({ title: '성공', description: '질문이 삭제되었습니다.' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '질문 삭제에 실패했습니다.'
      toast({ title: '오류', description: msg, variant: 'destructive' })
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-semibold">적용 질문 (Q&A)</h2>
      <p className="mb-4 text-xs text-gray-500">
        유저의 인사이트 도출을 위한 질문을 등록하세요. 답변이 하나라도 등록된 질문은 수정·삭제할 수 없습니다.
      </p>
      {questionsLoading ? (
        <p className="text-sm text-gray-500">질문 목록 로딩 중...</p>
      ) : (
        <>
          <ul className="mb-4 space-y-2">
            {contentQuestions.map((q) => (
              <li key={q.question_id} className="flex items-center gap-2 rounded border p-2">
                {editingQuestionId === q.question_id ? (
                  <>
                    <Input
                      value={editingQuestionText}
                      onChange={(e) => setEditingQuestionText(e.target.value)}
                      placeholder="질문 내용"
                      className="flex-1"
                    />
                    <Button type="button" size="sm" onClick={() => void handleUpdateContentQuestion(q)}>
                      저장
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingQuestionId(null)
                        setEditingQuestionText('')
                      }}
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{q.question_text}</span>
                    {q.is_locked && <span className="text-xs text-amber-600">(답변 등록됨)</span>}
                    {!q.is_locked && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestionId(q.question_id)
                            setEditingQuestionText(q.question_text)
                          }}
                        >
                          수정
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => void handleDeleteContentQuestion(q)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="새 질문 입력 후 추가 버튼 클릭"
              onKeyDown={(e) => e.key === 'Enter' && void handleAddContentQuestion()}
            />
            <Button type="button" variant="outline" onClick={() => void handleAddContentQuestion()}>
              <Plus className="mr-2 h-4 w-4" />
              질문 추가
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
