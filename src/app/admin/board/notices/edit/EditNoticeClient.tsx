'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getNotice, updateNotice } from '@/services/board'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function EditNoticeClient({ id }: { id: string }) {
  const router = useRouter()
  const idNum = Number(id)
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (Number.isNaN(idNum)) return
    getNotice(idNum)
      .then((data) => {
        setTitle(data.title)
        setContent(data.content)
        setIsPinned(data.is_pinned)
      })
      .catch((e: any) => {
        toast({
          title: '오류',
          description: e.message || '공지를 불러오는데 실패했습니다.',
          variant: 'destructive',
          duration: 3000,
        })
      })
      .finally(() => setLoading(false))
  }, [idNum, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number.isNaN(idNum) || !title.trim()) {
      toast({ title: '입력 오류', description: '제목을 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    try {
      setSubmitting(true)
      await updateNotice(idNum, { title: title.trim(), content: content.trim(), is_pinned: isPinned })
      toast({ title: '수정 완료', description: '공지가 수정되었습니다.', duration: 3000 })
      router.push('/admin/board/notices')
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
        <Link href="/admin/board/notices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공지 수정</h1>
          <p className="text-gray-600 text-sm">공지사항을 수정합니다.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="max-w-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용"
                rows={12}
                className="w-full max-w-2xl border rounded-md p-3 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="pin" checked={isPinned} onCheckedChange={(v) => setIsPinned(!!v)} />
              <label htmlFor="pin" className="text-sm">
                상단 고정
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
                {submitting ? '저장 중...' : '저장'}
              </Button>
              <Link href="/admin/board/notices">
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
