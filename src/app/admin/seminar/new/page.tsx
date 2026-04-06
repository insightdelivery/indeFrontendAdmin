'use client'

import { useState, useEffect } from 'react'
import { getAuthorsByContentType } from '@/features/contentAuthor'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  createVideo,
  uploadVideoFile,
  type VideoCreateRequest,
  CONTENT_TYPE,
  VIDEO_STATUS,
  VISIBILITY_OPTIONS,
  SEMINAR_CATEGORY_PARENT,
} from '@/features/video'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import {
  Save,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Upload,
  File,
  Video as VideoIcon,
  GraduationCap,
} from 'lucide-react'
import Link from 'next/link'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import apiClient from '@/lib/axios'

const videoSchema = z
  .object({
    contentType: z.enum(['video', 'seminar'], {
      required_error: '콘텐츠 타입을 선택해주세요.',
    }),
    category: z.string().min(1, '카테고리를 선택해주세요.'),
    title: z.string().min(1, '제목을 입력해주세요.'),
    subtitle: z.string().optional(),
    body: z.string().optional(),
    videoStreamId: z.string().optional(),
    speaker: z.string().optional(),
    speaker_id: z.union([z.number(), z.string()]).optional(),
    visibility: z.string().min(1, '공개 범위를 선택해주세요.'),
    status: z.string().min(1, '상태를 선택해주세요.'),
    allowComment: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
  })
  .refine(
    (d) => {
      const sid =
        d.speaker_id != null && d.speaker_id !== '' ? Number(d.speaker_id) : undefined
      const hasId = sid !== undefined && !Number.isNaN(sid)
      const hasName = !!d.speaker?.trim()
      return hasId || hasName
    },
    { message: '출연자/강사를 선택해주세요.', path: ['speaker_id'] },
  )

type VideoFormData = z.infer<typeof videoSchema>

interface AttachmentFile {
  filename: string
  url?: string
  size?: number
  file?: File
}

export default function SeminarCreatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoStreamId, setVideoStreamId] = useState<string>('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isScheduled, setIsScheduled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [speakerOptions, setSpeakerOptions] = useState<{ author_id: number; name: string }[]>([])
  const showCenterLoader = saving || uploadingVideo || uploadingAttachment

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      contentType: 'seminar',
      visibility: '',
      status: 'private',
      allowComment: true,
      tags: [],
      speaker_id: undefined as number | undefined,
      speaker: '',
    },
  })

  useEffect(() => {
    getAuthorsByContentType('SEMINAR')
      .then((authors) => {
        const editors = authors.filter((a) => a.role === 'EDITOR')
        setSpeakerOptions(editors.map((a) => ({ author_id: a.author_id, name: a.name })))
      })
      .catch(() => setSpeakerOptions([]))
  }, [])

  const status = watch('status')

  useEffect(() => {
    setIsScheduled(status === VIDEO_STATUS.SCHEDULED)
  }, [status])

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnail(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
    setAttachments([
      ...attachments,
      {
        filename: file.name,
        size: file.size,
        file,
      },
    ])
    e.target.value = ''
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.mp4')) {
      toast({
        title: '오류',
        description: 'MP4 파일만 업로드 가능합니다.',
        variant: 'destructive',
        duration: 15000,
      })
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
    setValue('videoStreamId', '')
  }

  const onSubmit = async (data: VideoFormData) => {
    try {
      setSaving(true)

      let finalVideoStreamId = videoStreamId
      if (videoFile && !videoStreamId) {
        try {
          setUploadingVideo(true)
          setUploadProgress(0)

          const result = await uploadVideoFile(videoFile, (progress) => {
            setUploadProgress(progress)
          })
          finalVideoStreamId = result.videoStreamId
          setVideoStreamId(finalVideoStreamId)
          setValue('videoStreamId', finalVideoStreamId)
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
          description: '세미나 영상(MP4)을 업로드해주세요.',
          variant: 'destructive',
          duration: 15000,
        })
        setSaving(false)
        return
      }

      let thumbnailData: string | undefined = undefined
      if (thumbnail) {
        if (thumbnail.startsWith('data:image')) {
          thumbnailData = thumbnail
        } else if (thumbnail.length <= 500) {
          thumbnailData = thumbnail
        } else {
          toast({
            title: '경고',
            description: '썸네일 URL이 너무 깁니다. (최대 500자)',
            variant: 'destructive',
            duration: 3000,
          })
          setSaving(false)
          return
        }
      }

      let scheduledAtISO = undefined
      if (data.scheduledAt) {
        const scheduledDate = new Date(data.scheduledAt)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledAtISO = scheduledDate.toISOString()
        }
      }

      const uploadedAttachments: Array<{ filename: string; url: string; size?: number }> = []
      if (attachments.length > 0) {
        try {
          setUploadingAttachment(true)
          for (const att of attachments) {
            if (att.file) {
              const formData = new FormData()
              formData.append('file', att.file)
              formData.append('folder', 'video/attachments/')

              const response = await apiClient.post('/files/upload', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              })

              if (response.data.IndeAPIResponse?.ErrorCode !== '00') {
                throw new Error(response.data.IndeAPIResponse?.Message || '첨부파일 업로드 실패')
              }

              const result = response.data.IndeAPIResponse.Result
              uploadedAttachments.push({
                filename: result.original_filename || att.filename,
                url: result.url,
                size: result.size || att.size,
              })
            } else if (att.url) {
              uploadedAttachments.push({
                filename: att.filename,
                url: att.url,
                size: att.size,
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

      const sidRaw = data.speaker_id
      const speakerIdNorm =
        sidRaw != null && sidRaw !== ''
          ? typeof sidRaw === 'number'
            ? sidRaw
            : Number(sidRaw)
          : undefined
      const speaker_id =
        speakerIdNorm !== undefined && !Number.isNaN(speakerIdNorm) ? speakerIdNorm : undefined

      const requestData: VideoCreateRequest = {
        ...data,
        contentType: 'seminar',
        sourceType: 'FILE_UPLOAD',
        speaker_id,
        videoStreamId: finalVideoStreamId || undefined,
        videoUrl: null,
        tags: data.tags?.filter((tag) => tag.trim() !== ''),
        attachments: uploadedAttachments,
        scheduledAt: scheduledAtISO,
      }

      if (thumbnailData !== undefined) {
        requestData.thumbnail = thumbnailData
      }

      await createVideo(requestData)

      toast({
        title: '성공',
        description: '세미나가 등록되었습니다.',
        duration: 3000,
      })

      router.push('/admin/seminar')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '세미나 등록에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/admin/seminar">
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">새 세미나 등록</h1>
            <p className="text-sm text-gray-600 mt-1">세미나 정보를 입력하고 등록하세요.</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            size="sm"
            className="bg-black text-white hover:bg-gray-800"
          >
            {saving ? '저장 중...' : '등록'}
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
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  세미나 (고정)
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <SysCodeSelect
                  sysCodeGubn={SEMINAR_CATEGORY_PARENT}
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
              <Select
                value={watch('visibility')}
                onValueChange={(value) => setValue('visibility', value)}
              >
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

            <div className="space-y-2">
              <Label htmlFor="title">메인 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="세미나 제목을 입력하세요"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">서브 타이틀</Label>
              <Input
                id="subtitle"
                {...register('subtitle')}
                placeholder="부제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">본문 상세 설명</Label>
              <RichTextEditor
                value={watch('body') || ''}
                onChange={(value) => setValue('body', value)}
                placeholder="세미나 상세 설명을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label>키워드/태그</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
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
          <h2 className="text-xl font-semibold mb-4">비디오 / 세미나 데이터</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>대표 썸네일 이미지</Label>
              <div className="flex items-center gap-4">
                {thumbnail && (
                  <div className="relative w-48 h-32 rounded overflow-hidden border">
                    <img
                      src={thumbnail}
                      alt="썸네일 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    권장 사이즈: 1200x630px (16:9 비율)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-upload">영상 파일 업로드 *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <VideoIcon className="h-8 w-8 text-gray-400" />
                  <div className="text-center">
                    <Label htmlFor="video-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">
                        파일을 선택하거나 드래그 앤 드롭
                      </span>
                    </Label>
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/mp4"
                      className="hidden"
                      onChange={handleVideoFileChange}
                      disabled={uploadingVideo}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      MP4 파일만 업로드 가능합니다. (최대 2GB)
                    </p>
                  </div>
                </div>
              </div>
              {uploadingVideo && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      업로드 중... {uploadProgress > 0 ? `(${uploadProgress.toFixed(2)}%)` : '(서버로 전송 중...)'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {videoFile && `${((videoFile.size * uploadProgress) / 100 / (1024 * 1024)).toFixed(2)}MB / ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(uploadProgress, 1)}%` }}
                    />
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <p className="text-xs text-gray-500 mt-2">
                      큰 파일의 경우 서버로 전송하는 데 시간이 걸릴 수 있습니다. 잠시만 기다려주세요...
                    </p>
                  )}
                </div>
              )}
              {videoFile && (
                <div className={`mt-4 p-4 border rounded-lg ${
                  videoStreamId
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <VideoIcon className={`h-5 w-5 ${
                        videoStreamId ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          videoStreamId ? 'text-green-900' : 'text-yellow-900'
                        }`}>
                          {videoFile.name}
                        </p>
                        <p className={`text-xs ${
                          videoStreamId ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          크기: {(videoFile.size / (1024 * 1024)).toFixed(2)}MB
                          {!videoStreamId && ' (등록 버튼 클릭 시 업로드됩니다)'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVideoFile(null)
                        setVideoStreamId('')
                        setValue('videoStreamId', '')
                        const fileInput = document.getElementById('video-upload') as HTMLInputElement
                        if (fileInput) {
                          fileInput.value = ''
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {!videoFile && !uploadingVideo && (
                <p className="text-sm text-gray-500 mt-2">
                  MP4 파일을 선택해주세요. (등록 버튼 클릭 시 업로드됩니다)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>강의 자료 (첨부파일)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-center">
                    <Label htmlFor="attachment-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">
                        파일을 선택하거나 드래그 앤 드롭
                      </span>
                    </Label>
                    <Input
                      id="attachment-upload"
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachment}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, DOC, XLS, PPT 등 강의 자료를 선택하세요 (등록 버튼 클릭 시 업로드)
                    </p>
                  </div>
                </div>
              </div>
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{att.filename}</span>
                        {att.size && (
                          <span className="text-xs text-gray-500">
                            ({(att.size / 1024).toFixed(2)} KB)
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">인물 및 연동 설정</h2>
          <div className="space-y-4">
            <div className="space-y-2 max-w-md">
              <Label htmlFor="speaker_id">출연자/강사 *</Label>
              <Select
                value={watch('speaker_id') != null ? String(watch('speaker_id')) : ''}
                onValueChange={(value) => {
                  const id = value === '' ? undefined : Number(value)
                  setValue('speaker_id', id)
                  const selected = speakerOptions.find((e) => e.author_id === id)
                  setValue('speaker', selected?.name ?? '')
                }}
              >
                <SelectTrigger id="speaker_id">
                  <SelectValue placeholder="출연자/강사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {speakerOptions.map((e) => (
                    <SelectItem key={e.author_id} value={String(e.author_id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.speaker_id && (
                <p className="text-sm text-red-600">{errors.speaker_id.message}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">상호작용 설정</h2>
          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-dashed border-gray-200 bg-gray-50/80 p-4">
              <Label>적용 질문 (Q&A)</Label>
              <p className="text-sm text-gray-600">
                세미나 저장 후 <strong>수정</strong> 화면에서 <code className="rounded bg-white px-1 text-xs">content_question</code> API로
                적용 질문을 등록·수정할 수 있습니다. (아티클과 동일)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('allowComment')}
                onCheckedChange={(checked) => setValue('allowComment', checked)}
              />
              <Label>댓글 허용</Label>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">발행 및 시스템 정보</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">상태 *</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VIDEO_STATUS.PUBLIC}>공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.PRIVATE}>비공개</SelectItem>
                  <SelectItem value={VIDEO_STATUS.SCHEDULED}>예약</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {isScheduled && (
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">예약 일시 *</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  {...register('scheduledAt')}
                />
                {errors.scheduledAt && (
                  <p className="text-sm text-red-600">{errors.scheduledAt.message}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </form>

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
