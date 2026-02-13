'use client'

import { useState, useEffect } from 'react'
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
import { getUserInfo } from '@/services/auth'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import apiClient from '@/lib/axios'

const videoSchema = z.object({
  contentType: z.enum(['video', 'seminar'], {
    required_error: '콘텐츠 타입을 선택해주세요.',
  }),
  category: z.string().min(1, '카테고리를 선택해주세요.'),
  title: z.string().min(1, '제목을 입력해주세요.'),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  videoStreamId: z.string().optional(),
  videoUrl: z.string().optional(),
  speaker: z.string().optional(),
  speakerAffiliation: z.string().optional(),
  editor: z.string().optional(),
  director: z.string().optional(),
  visibility: z.string().min(1, '공개 범위를 선택해주세요.'),
  status: z.string().min(1, '상태를 선택해주세요.'),
  isNewBadge: z.boolean().default(false),
  isMaterialBadge: z.boolean().default(false),
  allowRating: z.boolean().default(true),
  allowComment: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
})

type VideoFormData = z.infer<typeof videoSchema>

interface AttachmentFile {
  filename: string
  url?: string
  size?: number
  file?: File
}

export default function VideoCreatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [questions, setQuestions] = useState<string[]>(['', ''])
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoStreamId, setVideoStreamId] = useState<string>('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isScheduled, setIsScheduled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
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
      contentType: 'video',
      visibility: '',
      status: 'private',
      isNewBadge: false,
      isMaterialBadge: false,
      allowRating: true,
      allowComment: true,
      tags: [],
      questions: ['', ''],
    },
  })

  const status = watch('status')
  const contentType = watch('contentType')
  const userInfo = getUserInfo()

  useEffect(() => {
    if (userInfo) {
      setValue('editor', userInfo.memberShipName || '')
    }
  }, [userInfo, setValue])

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

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
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

    // 파일 확장자 확인
    if (!file.name.toLowerCase().endsWith('.mp4')) {
      toast({
        title: '오류',
        description: 'MP4 파일만 업로드 가능합니다.',
        variant: 'destructive',
        duration: 15000, // 15초
      })
      e.target.value = '' // 파일 선택 초기화
      return
    }

    // 파일 크기 확인 (2GB 제한)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > MAX_SIZE) {
      toast({
        title: '오류',
        description: `파일 크기가 2GB를 초과합니다. (현재: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)`,
        variant: 'destructive',
        duration: 15000, // 15초
      })
      e.target.value = '' // 파일 선택 초기화
      return
    }

    // 파일만 저장하고 업로드는 등록 버튼 클릭 시 수행
    setVideoFile(file)
    setVideoStreamId('') // 기존 videoStreamId 초기화
    setValue('videoStreamId', '')
  }

  const onSubmit = async (data: VideoFormData) => {
    try {
      setSaving(true)

      // 비디오 파일이 있으면 먼저 업로드
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
            duration: 15000, // 15초
          })
          setSaving(false)
          setUploadingVideo(false)
          return
        } finally {
          setUploadingVideo(false)
          setUploadProgress(0)
        }
      }

      // videoStreamId 또는 videoUrl 검증
      if (!finalVideoStreamId && !data.videoUrl) {
        toast({
          title: '오류',
          description: '비디오 파일을 선택하거나 영상 URL을 입력해주세요.',
          variant: 'destructive',
          duration: 15000, // 15초
        })
        setSaving(false)
        return
      }

      // 썸네일 처리
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

      // scheduledAt 처리
      let scheduledAtISO = undefined
      if (data.scheduledAt) {
        const scheduledDate = new Date(data.scheduledAt)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledAtISO = scheduledDate.toISOString()
        }
      }

      // 첨부파일 업로드 (등록 버튼 클릭 시점에만 실행)
      const uploadedAttachments: Array<{ filename: string; url: string; size?: number }> = []
      if (attachments.length > 0) {
        try {
          setUploadingAttachment(true)
          for (const att of attachments) {
            if (att.file) {
              const formData = new FormData()
              formData.append('file', att.file)
              formData.append('folder', 'video/attachments/')

              const response = await apiClient.post('/files/upload/', formData, {
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

      const requestData: VideoCreateRequest = {
        ...data,
        videoStreamId: finalVideoStreamId || undefined,
        questions: questions.filter((q) => q.trim() !== ''),
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
        description: '비디오/세미나가 등록되었습니다.',
        duration: 3000,
      })

      router.push('/admin/video')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '비디오/세미나 등록에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full space-y-6 relative">
      {/* 상단 제어 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/video">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">새 비디오/세미나 등록</h1>
            <p className="text-gray-600">비디오/세미나 정보를 입력하고 등록하세요.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="bg-neon-yellow hover:bg-neon-yellow/90 text-black"
          >
            {saving ? '저장 중...' : '등록'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 콘텐츠 기본 설정 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">콘텐츠 기본 설정</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 타입 *</Label>
                <RadioGroup
                  value={contentType}
                  onValueChange={(value) => setValue('contentType', value as 'video' | 'seminar')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={CONTENT_TYPE.VIDEO} id="video" />
                    <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                      <VideoIcon className="h-4 w-4" />
                      비디오
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={CONTENT_TYPE.SEMINAR} id="seminar" />
                    <Label htmlFor="seminar" className="flex items-center gap-2 cursor-pointer">
                      <GraduationCap className="h-4 w-4" />
                      세미나
                    </Label>
                  </div>
                </RadioGroup>
                {errors.contentType && (
                  <p className="text-sm text-red-600">{errors.contentType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <SysCodeSelect
                  sysCodeGubn="SYS26209B002"
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
          </div>
        </Card>

        {/* 핵심 데이터 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">핵심 데이터</h2>
          <div className="space-y-4">
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
                    <span className="text-sm text-gray-600">업로드 중...</span>
                    <span className="text-sm text-gray-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
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
                        // 파일 input 초기화
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

        {/* 콘텐츠 정보 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">콘텐츠 정보</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">메인 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="비디오/세미나 제목을 입력하세요"
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
              <Label>대표 썸네일</Label>
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
              <Label htmlFor="body">본문 상세 설명</Label>
              <RichTextEditor
                value={watch('body') || ''}
                onChange={(value) => setValue('body', value)}
                placeholder="영상 상세 설명을 입력하세요"
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

        {/* 인물 및 연동 설정 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">인물 및 연동 설정</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="speaker">출연자/강사</Label>
                <Input
                  id="speaker"
                  {...register('speaker')}
                  placeholder="출연자 또는 강사 이름"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speakerAffiliation">출연자 소속</Label>
                <Input
                  id="speakerAffiliation"
                  {...register('speakerAffiliation')}
                  placeholder="소속 기관 또는 단체"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editor">에디터</Label>
                <Input
                  id="editor"
                  {...register('editor')}
                  placeholder="에디터 이름"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="director">디렉터</Label>
                <Input
                  id="director"
                  {...register('director')}
                  placeholder="디렉터 이름"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 상호작용 설정 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">상호작용 설정</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>적용 질문 (Q1, Q2)</Label>
              <p className="text-xs text-gray-500 mb-2">
                사용자의 인사이트 도출을 위한 질문을 입력하세요 (최대 2개)
              </p>
              {questions.map((question, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    placeholder={`Q${index + 1}: 적용 질문 입력`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('allowRating')}
                  onCheckedChange={(checked) => setValue('allowRating', checked)}
                />
                <Label>별점 허용</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('allowComment')}
                  onCheckedChange={(checked) => setValue('allowComment', checked)}
                />
                <Label>댓글 허용</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('isNewBadge')}
                  onCheckedChange={(checked) => setValue('isNewBadge', checked)}
                />
                <Label>NEW 배지 표시</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('isMaterialBadge')}
                  onCheckedChange={(checked) => setValue('isMaterialBadge', checked)}
                />
                <Label>자료 배지 표시</Label>
              </div>
            </div>
          </div>
        </Card>

        {/* 발행 및 시스템 정보 */}
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
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-neon-yellow border-t-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}

