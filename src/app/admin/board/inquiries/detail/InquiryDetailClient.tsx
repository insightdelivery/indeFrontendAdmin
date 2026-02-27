'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getInquiry, answerInquiry } from '@/services/board'
import type { InquiryDetail } from '@/types/board'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

function formatDate(s: string) {
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InquiryDetailClient({ id }: { id: string }) {
  const idNum = Number(id)
  const { toast } = useToast()
  const [detail, setDetail] = useState<InquiryDetail | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (Number.isNaN(idNum)) return
    getInquiry(idNum)
      .then((data) => {
        setDetail(data)
        setAnswer(data.answer ?? '')
      })
      .catch((e: any) => {
        toast({
          title: '오류',
          description: e.message || '문의를 불러오는데 실패했습니다.',
          variant: 'destructive',
          duration: 3000,
        })
      })
      .finally(() => setLoading(false))
  }, [idNum, toast])

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number.isNaN(idNum)) return
    try {
      setSubmitting(true)
      const updated = await answerInquiry(idNum, answer.trim())
      setDetail(updated)
      toast({ title: '답변 저장', description: '답변이 저장되었습니다.', duration: 3000 })
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '답변 저장에 실패했습니다.',
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

  if (!detail) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">문의를 찾을 수 없습니다.</p>
        <Link href="/admin/board/inquiries">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/board/inquiries">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">1:1 문의 상세</h1>
          <p className="text-gray-600 text-sm">문의 내용을 확인하고 답변을 등록합니다.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{detail.title}</CardTitle>
            <span
              className={
                detail.status === 'answered'
                  ? 'px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800'
                  : 'px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800'
              }
            >
              {detail.status === 'answered' ? '답변완료' : '접수'}
            </span>
          </div>
          <p className="text-sm text-gray-500">등록일: {formatDate(detail.created_at)}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {detail.member && (
            <div className="rounded border bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">문의자</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">아이디</span>
                <span>{detail.member.member_sid}</span>
                <span className="text-gray-500">이름</span>
                <span>{detail.member.name || '-'}</span>
                <span className="text-gray-500">이메일</span>
                <span>{detail.member.email || '-'}</span>
                <span className="text-gray-500">전화번호</span>
                <span>{detail.member.phone || '-'}</span>
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">문의 내용</h3>
            <div className="rounded border bg-gray-50 p-4 text-sm whitespace-pre-wrap">{detail.content}</div>
          </div>

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">관리자 답변</h3>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변을 입력하세요."
                rows={8}
                className="w-full max-w-2xl border rounded-md p-3 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
                {submitting ? '저장 중...' : '답변 저장'}
              </Button>
              <Link href="/admin/board/inquiries">
                <Button type="button" variant="outline">
                  목록으로
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
