'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  deleteVideo,
  getVideo,
  updateVideo,
  uploadVideoFile,
  uploadVideoSpeakerProfileImage,
  type Video,
  type VideoUpdateRequest,
  VIDEO_STATUS,
  VISIBILITY_OPTIONS,
  VIDEO_SOURCE_TYPE,
  VIDEO_CATEGORY_PARENT,
} from '@/features/video'
import { VideoSpeakerFormSection, type VideoSpeakerProfileUploadState } from '@/components/video/VideoSpeakerFormSection'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { ArrowLeft, Trash2, Video as VideoIcon, X, Upload, File } from 'lucide-react'
import ContentQuestionsEditor from '@/components/admin/ContentQuestionsEditor'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import apiClient from '@/lib/axios'

/** 등록 페이지(`video/new`)와 동일 — API `status`로 매핑 */
const VIDEO_PUBLISH_MODE = {
  IMMEDIATE: 'immediate',
  DRAFT: 'draft',
  PRIVATE: 'private',
  SCHEDULED: 'scheduled',
} as const

const VIDEO_PUBLISH_OPTIONS: {
  value: (typeof VIDEO_PUBLISH_MODE)[keyof typeof VIDEO_PUBLISH_MODE]
  label: string
  apiStatus: string
}[] = [
  { value: VIDEO_PUBLISH_MODE.IMMEDIATE, label: '즉시발행', apiStatus: VIDEO_STATUS.PUBLIC },
  { value: VIDEO_PUBLISH_MODE.DRAFT, label: '임시저장', apiStatus: VIDEO_STATUS.PRIVATE },
  { value: VIDEO_PUBLISH_MODE.PRIVATE, label: '비공개', apiStatus: VIDEO_STATUS.PRIVATE },
  { value: VIDEO_PUBLISH_MODE.SCHEDULED, label: '예약발행', apiStatus: VIDEO_STATUS.SCHEDULED },
]

function statusToPublishMode(status: string): (typeof VIDEO_PUBLISH_MODE)[keyof typeof VIDEO_PUBLISH_MODE] {
  if (status === VIDEO_STATUS.PUBLIC) return VIDEO_PUBLISH_MODE.IMMEDIATE
  if (status === VIDEO_STATUS.SCHEDULED) return VIDEO_PUBLISH_MODE.SCHEDULED
  return VIDEO_PUBLISH_MODE.PRIVATE
}

function publishModeToApiStatus(
  mode: (typeof VIDEO_PUBLISH_MODE)[keyof typeof VIDEO_PUBLISH_MODE],
): string {
  const opt = VIDEO_PUBLISH_OPTIONS.find((o) => o.value === mode)
  return opt?.apiStatus ?? VIDEO_STATUS.PRIVATE
}

const schema = z
  .object({
    contentType: z.enum(['video', 'seminar']),
    category: z.string().min(1, '카테고리를 선택해주세요.'),
    title: z.string().min(1, '제목을 입력해주세요.'),
    subtitle: z.string().optional(),
    body: z.string().optional(),
    sourceType: z.enum([
      VIDEO_SOURCE_TYPE.FILE_UPLOAD,
      VIDEO_SOURCE_TYPE.VIMEO,
      VIDEO_SOURCE_TYPE.YOUTUBE,
    ]),
    videoUrl: z.string().optional(),
    visibility: z.string().min(1, '공개 범위를 선택해주세요.'),
    publishMode: z.enum([
      VIDEO_PUBLISH_MODE.IMMEDIATE,
      VIDEO_PUBLISH_MODE.DRAFT,
      VIDEO_PUBLISH_MODE.PRIVATE,
      VIDEO_PUBLISH_MODE.SCHEDULED,
    ]),
    speaker: z.string().min(1, '출연자/강사 이름을 입력해주세요.'),
    speakerAffiliation: z.string().optional(),
    speakerProfileImage: z.string().optional(),
    allowComment: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.publishMode === VIDEO_PUBLISH_MODE.SCHEDULED) {
      const t = data.scheduledAt?.trim()
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '예약 일시를 입력해주세요.',
          path: ['scheduledAt'],
        })
      }
    }
  })

type FormData = z.infer<typeof schema>

interface AttachmentFile {
  filename: string
  url?: string
  size?: number
  file?: File
}

type PersistedAttachment = { filename: string; url: string; size?: number }

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export default function VideoEditClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const idParam = searchParams?.get('id')
  const videoId = idParam ? Number(idParam) : NaN

  const [video, setVideo] = useState<Video | null>(null)
  const [thumbnail, setThumbnail] = useState<string>('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoStreamId, setVideoStreamId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [speakerProfileUpload, setSpeakerProfileUpload] = useState<VideoSpeakerProfileUploadState>({
    pendingFile: null,
    cleared: false,
  })
  const [speakerSectionResetToken, setSpeakerSectionResetToken] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [newAttachments, setNewAttachments] = useState<AttachmentFile[]>([])
  const [existingAttachments, setExistingAttachments] = useState<PersistedAttachment[]>([])
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const showCenterLoader = saving || deleting || uploadingVideo || uploadingAttachment
  const skipSourceEffectOnce = useRef(true)

  useEffect(() => {
    skipSourceEffectOnce.current = true
  }, [idParam])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contentType: 'video',
      sourceType: VIDEO_SOURCE_TYPE.FILE_UPLOAD,
      publishMode: VIDEO_PUBLISH_MODE.PRIVATE,
      allowComment: true,
      tags: [],
      speaker: '',
      speakerAffiliation: '',
      speakerProfileImage: '',
    },
  })

  useEffect(() => {
    const load = async () => {
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
        const data = await getVideo(videoId)
        setVideo(data)
        setThumbnail(data.thumbnail || '')
        setVideoStreamId(data.videoStreamId || '')
        setExistingAttachments(
          (data.attachments || []).map((a) => ({
            filename: a.filename,
            url: a.url,
            size: a.size,
          })),
        )
        setNewAttachments([])
        const inferredSource =
          data.sourceType ||
          (data.videoStreamId
            ? VIDEO_SOURCE_TYPE.FILE_UPLOAD
            : data.videoUrl && data.videoUrl.toLowerCase().includes('vimeo')
              ? VIDEO_SOURCE_TYPE.VIMEO
              : data.videoUrl
                ? VIDEO_SOURCE_TYPE.YOUTUBE
                : VIDEO_SOURCE_TYPE.FILE_UPLOAD)
        reset({
          contentType: data.contentType,
          category: data.category || '',
          title: data.title || '',
          subtitle: data.subtitle || '',
          body: data.body || '',
          sourceType: inferredSource,
          videoUrl: data.videoUrl || '',
          visibility: data.visibility || '',
          publishMode: statusToPublishMode(data.status || 'private'),
          speaker: data.speaker || '',
          speakerAffiliation: data.speakerAffiliation ?? '',
          speakerProfileImage: data.speakerProfileImage || '',
          allowComment: data.allowComment !== false,
          tags: Array.isArray(data.tags) ? [...data.tags] : [],
          scheduledAt: toDatetimeLocalValue(data.scheduledAt),
        })
        setSpeakerSectionResetToken((k) => k + 1)
      } catch (error: any) {
        toast({
          title: '오류',
          description: error.message || '데이터를 불러오지 못했습니다.',
          variant: 'destructive',
        })
        router.push('/admin/video')
      }
    }
    load()
  }, [idParam, videoId, reset, router, toast])

  const publishMode = watch('publishMode')
  const isScheduled = useMemo(
    () => publishMode === VIDEO_PUBLISH_MODE.SCHEDULED,
    [publishMode],
  )
  const sourceType = watch('sourceType')

  const clearVideoFileSelection = useCallback(() => {
    setVideoFile(null)
    setVideoStreamId('')
    const fileInput = document.getElementById('video-upload-edit') as HTMLInputElement | null
    if (fileInput) fileInput.value = ''
  }, [])

  useEffect(() => {
    if (skipSourceEffectOnce.current) {
      skipSourceEffectOnce.current = false
      return
    }
    if (sourceType === VIDEO_SOURCE_TYPE.FILE_UPLOAD) {
      setValue('videoUrl', '')
      return
    }
    clearVideoFileSelection()
  }, [sourceType, setValue, clearVideoFileSelection])

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = getValues('tags') || []
      setValue('tags', [...currentTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (index: number) => {
    const currentTags = getValues('tags') || []
    setValue('tags', currentTags.filter((_, i) => i !== index))
  }

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewAttachments((prev) => [...prev, { filename: file.name, size: file.size, file }])
    e.target.value = ''
  }

  const handleRemoveNewAttachment = (index: number) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.mp4')) {
      toast({ title: '오류', description: 'MP4 파일만 업로드 가능합니다.', variant: 'destructive', duration: 15000 })
      e.target.value = ''
      return
    }

    const MAX_SIZE = 2 * 1024 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast({
        title: '오류',
        description: `파일 크기가 2GB를 초과합니다. (현재: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`,
        variant: 'destructive',
        duration: 15000,
      })
      e.target.value = ''
      return
    }

    setVideoFile(file)
    setVideoStreamId('')
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setThumbnail(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = async (data: FormData) => {
    if (!video) return
    try {
      setSaving(true)

      const st = data.sourceType
      let finalVideoStreamId = videoStreamId

      if (st === VIDEO_SOURCE_TYPE.FILE_UPLOAD) {
        if (videoFile && !videoStreamId) {
          try {
            setUploadingVideo(true)
            setUploadProgress(0)
            const result = await uploadVideoFile(videoFile, (p) => setUploadProgress(p))
            finalVideoStreamId = result.videoStreamId
            setVideoStreamId(finalVideoStreamId)
          } catch (error: any) {
            toast({
              title: '오류',
              description: error.message || '비디오 업로드에 실패했습니다.',
              variant: 'destructive',
              duration: 15000,
            })
            setSaving(false)
            setUploadingVideo(false)
            return
          } finally {
            setUploadingVideo(false)
            setUploadProgress(0)
          }
        }
        if (!finalVideoStreamId) {
          toast({
            title: '오류',
            description: '파일을 업로드하거나 기존 Stream 영상이 있어야 합니다.',
            variant: 'destructive',
            duration: 15000,
          })
          setSaving(false)
          return
        }
      } else {
        const url = data.videoUrl?.trim()
        if (!url) {
          toast({
            title: '오류',
            description: 'Vimeo 또는 YouTube 영상 URL을 입력해주세요.',
            variant: 'destructive',
            duration: 15000,
          })
          setSaving(false)
          return
        }
      }

      const mergedAttachments: Array<{ filename: string; url: string; size?: number }> = [
        ...existingAttachments.map((a) => ({
          filename: a.filename,
          url: a.url,
          size: a.size,
        })),
      ]

      if (newAttachments.length > 0) {
        try {
          setUploadingAttachment(true)
          for (const att of newAttachments) {
            if (att.file) {
              const formData = new FormData()
              formData.append('file', att.file)
              formData.append('folder', 'video/attachments/')
              const response = await apiClient.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
              if (response.data.IndeAPIResponse?.ErrorCode !== '00') {
                throw new Error(response.data.IndeAPIResponse?.Message || '첨부파일 업로드 실패')
              }
              const result = response.data.IndeAPIResponse.Result
              mergedAttachments.push({
                filename: result.original_filename || att.filename,
                url: result.url,
                size: result.size || att.size,
              })
            }
          }
        } catch (error: any) {
          toast({
            title: '오류',
            description: error.message || '첨부파일 업로드에 실패했습니다.',
            variant: 'destructive',
            duration: 3000,
          })
          setSaving(false)
          setUploadingAttachment(false)
          return
        } finally {
          setUploadingAttachment(false)
        }
      }

      let speakerProfileImage = (getValues('speakerProfileImage') || '').trim()
      if (speakerProfileUpload.pendingFile) {
        speakerProfileImage = await uploadVideoSpeakerProfileImage(speakerProfileUpload.pendingFile)
      } else if (speakerProfileUpload.cleared) {
        speakerProfileImage = ''
      }

      const { publishMode: mode, tags, ...formRest } = data
      const apiStatus = publishModeToApiStatus(mode)

      let scheduledAtISO: string | undefined
      if (data.scheduledAt) {
        const d = new Date(data.scheduledAt)
        if (!Number.isNaN(d.getTime())) scheduledAtISO = d.toISOString()
      }

      const payload: VideoUpdateRequest = {
        ...formRest,
        id: video.id,
        speakerAffiliation: (formRest.speakerAffiliation || '').trim() || undefined,
        speakerProfileImage,
        status: apiStatus,
        sourceType: st,
        videoStreamId: st === VIDEO_SOURCE_TYPE.FILE_UPLOAD ? finalVideoStreamId : null,
        videoUrl:
          st === VIDEO_SOURCE_TYPE.FILE_UPLOAD ? null : (data.videoUrl || '').trim() || null,
        thumbnail: thumbnail || undefined,
        tags: tags?.filter((tag) => tag.trim() !== ''),
        attachments: mergedAttachments,
        scheduledAt: scheduledAtISO,
      }

      await updateVideo(payload)
      toast({ title: '성공', description: '저장되었습니다.' })
      router.push(`/admin/video/detail?id=${video.id}`)
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '저장에 실패했습니다.',
        variant: 'destructive',
        duration: 15000,
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
      toast({
        title: '오류',
        description: error.message || '삭제에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!video) {
    return <div className="p-10 text-center text-gray-500">로딩 중...</div>
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={`/admin/video/detail?id=${video.id}`}>
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              상세로
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">비디오 수정</h1>
            <p className="text-sm text-gray-600 mt-1">비디오 정보를 수정하세요.</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-black text-white hover:bg-gray-800"
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">콘텐츠 기본 설정</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 타입</Label>
                <p className="text-sm text-gray-600 flex items-center gap-2 py-2">
                  <VideoIcon className="h-4 w-4" />
                  비디오
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <SysCodeSelect
                  sysCodeGubn={VIDEO_CATEGORY_PARENT}
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value)}
                  placeholder="카테고리 선택"
                />
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">공개 범위 *</Label>
              <Select value={watch('visibility')} onValueChange={(v) => setValue('visibility', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="공개 범위 선택" />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.visibility && (
                <p className="text-sm text-red-600">{errors.visibility.message}</p>
              )}
            </div>

            <VideoSpeakerFormSection<FormData>
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
              onSpeakerProfileUploadStateChange={setSpeakerProfileUpload}
              resetToken={speakerSectionResetToken}
              idPrefix="video_edit_speaker"
            />

            <div className="space-y-2">
              <Label htmlFor="title">메인 제목 *</Label>
              <Input id="title" {...register('title')} placeholder="비디오 제목을 입력하세요" />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">서브 타이틀</Label>
              <Input id="subtitle" {...register('subtitle')} placeholder="부제목을 입력하세요" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">본문 상세 설명</Label>
              <RichTextEditor
                value={watch('body') || ''}
                onChange={(v) => setValue('body', v)}
                placeholder="영상 상세 설명을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label>키워드/태그</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="태그 입력 후 Enter"
                />
                <Button type="button" onClick={handleAddTag}>
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(watch('tags') || []).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">비디오 데이터</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>대표 썸네일 이미지</Label>
              <div className="flex items-center gap-4">
                {thumbnail && (
                  <div className="relative w-48 h-32 rounded overflow-hidden border">
                    <img src={thumbnail} alt="썸네일 미리보기" className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <Input type="file" accept="image/*" onChange={handleThumbnailChange} className="cursor-pointer" />
                  <p className="text-xs text-gray-500 mt-1">권장 사이즈: 1200x630px (16:9 비율)</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>영상 제공 방식 *</Label>
              <RadioGroup
                value={sourceType}
                onValueChange={(v) =>
                  setValue('sourceType', v as FormData['sourceType'], { shouldValidate: true })
                }
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={VIDEO_SOURCE_TYPE.FILE_UPLOAD} id="edit-src-upload" />
                  <Label htmlFor="edit-src-upload" className="font-normal cursor-pointer">
                    파일 업로드 (Cloudflare Stream)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={VIDEO_SOURCE_TYPE.VIMEO} id="edit-src-vimeo" />
                  <Label htmlFor="edit-src-vimeo" className="font-normal cursor-pointer">
                    Vimeo URL
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={VIDEO_SOURCE_TYPE.YOUTUBE} id="edit-src-youtube" />
                  <Label htmlFor="edit-src-youtube" className="font-normal cursor-pointer">
                    YouTube URL
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {sourceType === VIDEO_SOURCE_TYPE.FILE_UPLOAD && (
              <div className="space-y-2">
                <Label htmlFor="video-upload-edit">영상 파일 업로드 *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <VideoIcon className="h-8 w-8 text-gray-400" />
                    <div className="text-center">
                      <Label htmlFor="video-upload-edit" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700">파일을 선택하거나 드래그 앤 드롭</span>
                      </Label>
                      <Input
                        id="video-upload-edit"
                        type="file"
                        accept="video/mp4"
                        className="hidden"
                        onChange={handleVideoFileChange}
                        disabled={uploadingVideo}
                      />
                      <p className="text-xs text-gray-500 mt-2">MP4 파일만 업로드 가능합니다. (최대 2GB)</p>
                    </div>
                  </div>
                </div>
                {uploadingVideo && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        업로드 중...{' '}
                        {uploadProgress > 0 ? `(${uploadProgress.toFixed(2)}%)` : '(서버로 전송 중...)'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(uploadProgress, 1)}%` }}
                      />
                    </div>
                  </div>
                )}
                {videoStreamId && (
                  <p className="text-sm text-green-600">현재 Stream ID: {videoStreamId}</p>
                )}
                {videoFile && (
                  <div
                    className={`mt-4 p-4 border rounded-lg ${
                      videoStreamId ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <VideoIcon className={`h-5 w-5 ${videoStreamId ? 'text-green-600' : 'text-yellow-600'}`} />
                        <div>
                          <p className={`text-sm font-medium ${videoStreamId ? 'text-green-900' : 'text-yellow-900'}`}>
                            {videoFile.name}
                          </p>
                          <p className={`text-xs ${videoStreamId ? 'text-green-700' : 'text-yellow-700'}`}>
                            크기: {(videoFile.size / (1024 * 1024)).toFixed(2)}MB
                            {!videoStreamId && ' (저장 시 업로드됩니다)'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVideoFile(null)
                          const el = document.getElementById('video-upload-edit') as HTMLInputElement
                          if (el) el.value = ''
                          setVideoStreamId(video.videoStreamId || '')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {!videoFile && !uploadingVideo && !videoStreamId && (
                  <p className="text-sm text-gray-500 mt-2">MP4를 선택하거나 기존 Stream이 있어야 합니다.</p>
                )}
              </div>
            )}

            {sourceType !== VIDEO_SOURCE_TYPE.FILE_UPLOAD && (
              <div className="space-y-2">
                <Label htmlFor="edit-videoUrl">
                  {sourceType === VIDEO_SOURCE_TYPE.VIMEO ? 'Vimeo' : 'YouTube'} 영상 URL *
                </Label>
                <Input
                  id="edit-videoUrl"
                  {...register('videoUrl')}
                  placeholder={
                    sourceType === VIDEO_SOURCE_TYPE.VIMEO
                      ? 'https://vimeo.com/...'
                      : 'https://www.youtube.com/watch?v=... 또는 https://youtu.be/...'
                  }
                />
                <p className="text-xs text-gray-500">해당 플랫폼의 시청 페이지 또는 공유 URL을 붙여넣으세요.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>강의 자료 (첨부파일)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-center">
                    <Label htmlFor="attachment-upload-edit" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">파일을 선택하거나 드래그 앤 드롭</span>
                    </Label>
                    <Input
                      id="attachment-upload-edit"
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachment}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, DOC, XLS, PPT 등 (저장 시 신규 파일만 업로드)
                    </p>
                  </div>
                </div>
              </div>
              {existingAttachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500">기존 첨부</p>
                  {existingAttachments.map((att, index) => (
                    <div
                      key={`${att.url}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{att.filename}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {newAttachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-500">추가 예정</p>
                  {newAttachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{att.filename}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveNewAttachment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <ContentQuestionsEditor contentType="VIDEO" contentId={video.id} />

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">상호작용 설정</h2>
          <div className="flex items-center space-x-2">
            <Switch checked={watch('allowComment')} onCheckedChange={(c) => setValue('allowComment', c)} />
            <Label>댓글 허용</Label>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">발행 및 시스템 정보</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">
                발행 상태 <span className="text-red-600">*</span>
              </Label>
              <RadioGroup
                value={watch('publishMode')}
                onValueChange={(v) =>
                  setValue('publishMode', v as FormData['publishMode'], { shouldValidate: true })
                }
              >
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {VIDEO_PUBLISH_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`video-edit-publish-${opt.value}`} />
                      <Label
                        htmlFor={`video-edit-publish-${opt.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {isScheduled && (
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  예약 일시 <span className="text-red-600">*</span>
                </Label>
                <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
                {errors.scheduledAt && (
                  <p className="text-sm text-red-600">{errors.scheduledAt.message}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>콘텐츠 삭제</DialogTitle>
            <DialogDescription>삭제 시 사용자 라이브러리에서 접근이 제한됩니다. 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleDelete}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCenterLoader && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-full p-6 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-900 border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}
