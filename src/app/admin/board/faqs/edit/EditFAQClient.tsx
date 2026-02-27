'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getFAQ, updateFAQ } from '@/services/board'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function EditFAQClient({ id }: { id: string }) {
  const router = useRouter()
  const idNum = Number(id)
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [order, setOrder] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (Number.isNaN(idNum)) return
    getFAQ(idNum)
      .then((data) => {
        setQuestion(data.question)
        setAnswer(data.answer)
        setOrder(data.order)
      })
      .catch((e: any) => {
        toast({
          title: '오류',
          description: e.message || 'FAQ를 불러오는데 실패했습니다.',
          variant: 'destructive',
          duration: 3000,
        })
      })
      .finally(() => setLoading(false))
  }, [idNum, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number.isNaN(idNum) || !question.trim()) {
      toast({ title: '입력 오류', description: '질문을 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    try {
      setSubmitting(true)
      await updateFAQ(idNum, { question: question.trim(), answer: answer.trim(), order })
      toast({ title: '수정 완료', description: 'FAQ가 수정되었습니다.', duration: 3000 })
      router.push('/admin/board/faqs')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '수정에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/board/faqs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ 수정</h1>
          <p className="text-gray-600 text-sm">FAQ를 수정합니다.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">순서 (숫자, 작을수록 먼저)</label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
                className="max-w-[120px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">질문</label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="질문"
                className="max-w-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">답변</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변"
                rows={8}
                className="w-full max-w-2xl border rounded-md p-3 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
                {submitting ? '저장 중...' : '저장'}
              </Button>
              <Link href="/admin/board/faqs">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
