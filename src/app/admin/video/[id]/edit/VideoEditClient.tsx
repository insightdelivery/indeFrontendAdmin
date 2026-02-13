'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  deleteVideo,
  getVideo,
  updateVideo,
  uploadVideoFile,
  type Video,
  type VideoUpdateRequest,
  VIDEO_STATUS,
  VISIBILITY_OPTIONS,
  CONTENT_TYPE,
} from '@/features/video'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ArrowLeft, Trash2, Video as VideoIcon, GraduationCap } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const schema = z.object({
  contentType: z.enum(['video', 'seminar']),
  category: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  visibility: z.string().min(1),
  status: z.string().min(1),
  speaker: z.string().optional(),
  speakerAffiliation: z.string().optional(),
  editor: z.string().optional(),
  director: z.string().optional(),
  isNewBadge: z.boolean().default(false),
  isMaterialBadge: z.boolean().default(false),
  allowRating: z.boolean().default(true),
  allowComment: z.boolean().default(true),
  scheduledAt: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export default function VideoEditClient() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [video, setVideo] = useState<Video | null>(null)
  const [thumbnail, setThumbnail] = useState<string>('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoStreamId, setVideoStreamId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const showCenterLoader = saving || deleting

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contentType: 'video',
      status: 'private',
      isNewBadge: false,
      isMaterialBadge: false,
      allowRating: true,
      allowComment: true,
    },
  })

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return
      try {
        const data = await getVideo(Number(params.id))
        setVideo(data)
        setThumbnail(data.thumbnail || '')
        setVideoStreamId(data.videoStreamId || '')
        reset({
          contentType: data.contentType,
          category: data.category || '',
          title: data.title || '',
          subtitle: data.subtitle || '',
          body: data.body || '',
          visibility: data.visibility || '',
          status: data.status || 'private',
          speaker: data.speaker || '',
          speakerAffiliation: data.speakerAffiliation || '',
          editor: data.editor || '',
          director: data.director || '',
          isNewBadge: !!data.isNewBadge,
          isMaterialBadge: !!data.isMaterialBadge,
          allowRating: !!data.allowRating,
          allowComment: !!data.allowComment,
          scheduledAt: toDatetimeLocalValue(data.scheduledAt),
        })
      } catch (error: any) {
        toast({ title: '오류', description: error.message || '데이터 로드 실패', variant: 'destructive' })
        router.push('/admin/video')
      }
    }
    load()
  }, [params?.id, reset, router, toast])

  const isScheduled = useMemo(() => watch('status') === VIDEO_STATUS.SCHEDULED, [watch('status')])
  const contentType = watch('contentType')

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setThumbnail(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      toast({ title: '오류', description: 'MP4 파일만 업로드 가능합니다.', variant: 'destructive', duration: 15000 })
      return
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast({ title: '오류', description: '파일 크기는 2GB 이하여야 합니다.', variant: 'destructive', duration: 15000 })
      return
    }
    setVideoFile(file)
    setVideoStreamId('')
  }

  const onSubmit = async (data: FormData) => {
    if (!video) return
    try {
      setSaving(true)

      let finalStreamId = videoStreamId
      if (videoFile && !videoStreamId) {
        const uploaded = await uploadVideoFile(videoFile)
        finalStreamId = uploaded.videoStreamId
        setVideoStreamId(finalStreamId)
      }

      const payload: VideoUpdateRequest = {
        id: video.id,
        ...data,
        videoStreamId: finalStreamId || undefined,
        thumbnail: thumbnail || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      }

      await updateVideo(payload)
      toast({ title: '성공', description: '비디오/세미나가 수정되었습니다.' })
      router.push(`/admin/video/${video.id}`)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '수정 실패',
        variant: 'destructive',
        duration: 15000, // 15초
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!video) return
    try {
      setDeleting(true)
      await deleteVideo(video.id)
      toast({ title: '성공', description: '콘텐츠가 삭제되었습니다.' })
      router.push('/admin/video')
    } catch (error: any) {
      toast({ title: '오류', description: error.message || '삭제 실패', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (!video) {
    return <div className="p-10 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/video/${video.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              상세로
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">비디오/세미나 수정</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>콘텐츠 타입</Label>
              <RadioGroup value={contentType} onValueChange={(v) => setValue('contentType', v as 'video' | 'seminar')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={CONTENT_TYPE.VIDEO} id="type-video" />
                  <Label htmlFor="type-video" className="flex items-center gap-1"><VideoIcon className="h-4 w-4" />비디오</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={CONTENT_TYPE.SEMINAR} id="type-seminar" />
                  <Label htmlFor="type-seminar" className="flex items-center gap-1"><GraduationCap className="h-4 w-4" />세미나</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <SysCodeSelect
                sysCodeGubn="SYS26209B002"
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
                placeholder="카테고리 선택"
              />
              {errors.category && <p className="text-xs text-red-600">카테고리를 선택하세요.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>제목</Label>
            <Input {...register('title')} />
            {errors.title && <p className="text-xs text-red-600">제목을 입력하세요.</p>}
          </div>
          <div className="space-y-2">
            <Label>부제목</Label>
            <Input {...register('subtitle')} />
          </div>
          <div className="space-y-2">
            <Label>본문</Label>
            <RichTextEditor value={watch('body') || ''} onChange={(v) => setValue('body', v)} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">영상/썸네일</h2>
          <div className="space-y-2">
            <Label>영상 파일(MP4)</Label>
            <Input type="file" accept="video/mp4" onChange={handleVideoFileChange} />
            {videoStreamId && <p className="text-xs text-green-600">현재 Stream ID: {videoStreamId}</p>}
          </div>
          <div className="space-y-2">
            <Label>썸네일</Label>
            <Input type="file" accept="image/*" onChange={handleThumbnailChange} />
            {thumbnail && <img src={thumbnail} alt="thumbnail-preview" className="w-48 h-28 object-cover rounded border" />}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">설정</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <Select value={watch('visibility')} onValueChange={(v) => setValue('visibility', v)}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={VIDEO_STATUS.PUBLIC}>공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.PRIVATE}>비공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.SCHEDULED}>예약</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isScheduled && (
            <div className="space-y-2">
              <Label>예약 일시</Label>
              <Input type="datetime-local" {...register('scheduledAt')} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>출연자</Label>
              <Input {...register('speaker')} />
            </div>
            <div className="space-y-2">
              <Label>출연자 소속</Label>
              <Input {...register('speakerAffiliation')} />
            </div>
            <div className="space-y-2">
              <Label>에디터</Label>
              <Input {...register('editor')} />
            </div>
            <div className="space-y-2">
              <Label>디렉터</Label>
              <Input {...register('director')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={watch('allowRating')} onCheckedChange={(v) => setValue('allowRating', v)} />
              <Label>별점 허용</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch('allowComment')} onCheckedChange={(v) => setValue('allowComment', v)} />
              <Label>댓글 허용</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch('isNewBadge')} onCheckedChange={(v) => setValue('isNewBadge', v)} />
              <Label>NEW 배지</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch('isMaterialBadge')} onCheckedChange={(v) => setValue('isMaterialBadge', v)} />
              <Label>자료 배지</Label>
            </div>
          </div>
        </Card>
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>콘텐츠 삭제</DialogTitle>
            <DialogDescription>해당 콘텐츠를 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCenterLoader && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-neon-yellow border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}


