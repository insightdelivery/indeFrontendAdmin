'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createFAQ } from '@/services/board'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NewFAQPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [order, setOrder] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      toast({ title: '입력 오류', description: '질문을 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    try {
      setSubmitting(true)
      await createFAQ({ question: question.trim(), answer: answer.trim(), order })
      toast({ title: '등록 완료', description: 'FAQ가 등록되었습니다.', duration: 3000 })
      router.push('/admin/board/faqs')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '등록에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">FAQ 등록</h1>
          <p className="text-gray-600 text-sm">새 FAQ를 작성합니다.</p>
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
                {submitting ? '등록 중...' : '등록'}
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
