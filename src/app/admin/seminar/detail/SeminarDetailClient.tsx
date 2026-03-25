'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { getVideo, deleteVideo, type Video } from '@/features/video'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import VideoDetailSections from '@/components/video/VideoDetailSections'

type PageError = 'bad_id' | 'load_failed' | null

export default function SeminarDetailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<PageError>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const idParam = searchParams?.get('id')
  const videoId = idParam ? Number(idParam) : NaN

  useEffect(() => {
    const loadDetail = async () => {
      if (!idParam || Number.isNaN(videoId)) {
        setPageError('bad_id')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setPageError(null)
        const data = await getVideo(videoId)
        setVideo(data)
      } catch {
        setPageError('load_failed')
        setVideo(null)
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [idParam, videoId])

  const handleDelete = async () => {
    if (!video) return
    try {
      setDeleting(true)
      await deleteVideo(video.id)
      toast({ title: '성공', description: '콘텐츠가 삭제되었습니다.' })
      router.push('/admin/seminar')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '삭제에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">로딩 중...</div>
  }

  if (pageError === 'bad_id') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="text-lg text-foreground">잘못된 접근입니다</p>
        <Button asChild variant="outline">
          <Link href="/admin/seminar">목록으로</Link>
        </Button>
      </div>
    )
  }

  if (pageError === 'load_failed') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="text-lg text-foreground">데이터를 불러올 수 없습니다</p>
        <Button asChild variant="outline">
          <Link href="/admin/seminar">목록으로</Link>
        </Button>
      </div>
    )
  }

  if (!video) return null

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/seminar">
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">세미나 상세</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/admin/seminar/edit?id=${video.id}`}>
            <Button type="button" variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
          <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <VideoDetailSections video={video} seminarSourceOnly />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>콘텐츠 삭제</DialogTitle>
            <DialogDescription>삭제 시 사용자 라이브러리에서 접근이 제한됩니다. 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button type="button" size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={handleDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-background rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}
