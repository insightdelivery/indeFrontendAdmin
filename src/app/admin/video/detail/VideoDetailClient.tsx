'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Video as VideoIcon } from 'lucide-react'
import { getVideo, deleteVideo, type Video } from '@/features/video'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSysCodeFromCache, getSysCodeName } from '@/lib/syscode'

export default function VideoDetailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const idParam = searchParams?.get('id')
  const videoId = idParam ? Number(idParam) : NaN

  useEffect(() => {
    const loadDetail = async () => {
      if (!idParam || Number.isNaN(videoId)) {
        toast({
          title: '오류',
          description: '잘못된 접근입니다. (id가 없습니다)',
          variant: 'destructive',
        })
        router.push('/admin/video')
        return
      }

      try {
        setLoading(true)
        const data = await getVideo(videoId)
        setVideo(data)
      } catch (error: any) {
        toast({
          title: '오류',
          description: error.message || '상세 정보를 불러오지 못했습니다.',
          variant: 'destructive',
        })
        router.push('/admin/video')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [idParam, videoId, router, toast])

  const handleDelete = async () => {
    if (!video) return
    try {
      setDeleting(true)
      await deleteVideo(video.id)
      toast({ title: '성공', description: '콘텐츠가 삭제되었습니다.' })
      router.push('/admin/video')
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
    return <div className="p-10 text-center text-gray-500">로딩 중...</div>
  }

  if (!video) return null

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/video">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">비디오/세미나 상세</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/video/edit?id=${video.id}`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{video.title}</h2>
          {video.subtitle && <p className="text-gray-600 mt-1">{video.subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">분류</span><div>{video.contentType}</div></div>
          <div><span className="text-gray-500">카테고리</span><div>{(() => {
            const codes = getSysCodeFromCache('SYS26209B002')
            return codes ? getSysCodeName(codes, video.category) : null
          })() || video.category}</div></div>
          <div><span className="text-gray-500">상태</span><div>{video.status}</div></div>
          <div><span className="text-gray-500">출연자</span><div>{video.speaker || '-'}</div></div>
          <div><span className="text-gray-500">작성자</span><div>{video.editor || video.director || '-'}</div></div>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><VideoIcon className="h-4 w-4" /> 영상</h3>
        {video.videoStreamInfo?.embedUrl ? (
          <iframe
            src={video.videoStreamInfo.embedUrl}
            className="w-full aspect-video rounded border"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="video-player"
          />
        ) : video.videoStreamId ? (
          <iframe
            src={`https://iframe.videodelivery.net/${video.videoStreamId}`}
            className="w-full aspect-video rounded border"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="video-player"
          />
        ) : (
          <p className="text-sm text-gray-500">영상 정보가 없습니다.</p>
        )}
      </Card>

      {video.body && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">본문</h3>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: video.body }} />
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>콘텐츠 삭제</DialogTitle>
            <DialogDescription>삭제 시 사용자 라이브러리에서 접근이 제한됩니다. 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-neon-yellow border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}


