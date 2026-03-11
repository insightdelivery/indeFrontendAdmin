'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createArticle, type ArticleCreateRequest, ARTICLE_CATEGORIES, VISIBILITY_OPTIONS, PUBLISH_STATUS } from '@/features/articles'
import { getAuthorsByContentType } from '@/features/contentAuthor'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { SysCodeSelect } from '@/components/admin/SysCodeSelect'
import { SysCodeRadioGroup } from '@/components/admin/SysCodeRadioGroup'
import {
  Save,
  Eye,
  ArrowLeft,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { RichTextEditor } from '@/components/admin/RichTextEditor'

const articleSchema = z
  .object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    subtitle: z.string().optional(),
    content: z.string().min(1, '본문 내용을 입력해주세요.'),
    category: z.string().min(1, '카테고리를 선택해주세요.'),
    author: z.string().optional(),
    author_id: z.union([z.number(), z.string()]).optional(),
    authorAffiliation: z.string().optional(),
    visibility: z.string().min(1, '공개 범위를 선택해주세요.'),
    status: z.string().min(1, '발행 상태를 선택해주세요.'),
    isEditorPick: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    previewLength: z.number().min(0).max(100).optional(),
    scheduledAt: z.string().optional(),
  })
  .refine(
    (data) => {
      const aid = data.author_id != null && data.author_id !== '' ? Number(data.author_id) : undefined
      const hasAuthorId = aid !== undefined && !Number.isNaN(aid)
      const hasAuthor = !!data.author?.trim()
      return hasAuthorId || hasAuthor
    },
    { message: '작성자(에디터)를 선택해주세요.', path: ['author_id'] }
  )

type ArticleFormData = z.infer<typeof articleSchema>

export default function ArticleCreatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [thumbnail, setThumbnail] = useState<string>('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  /** 아티클 담당 에디터 목록(콘텐츠 유형 ARTICLE, 역할 EDITOR) */
  const [editorOptions, setEditorOptions] = useState<{ author_id: number; name: string }[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    watch,
    getValues,
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      visibility: '',
      status: '',
      isEditorPick: false,
      tags: [],
      previewLength: 50,
      author_id: undefined as number | undefined,
      author: '',
    },
  })

  const status = watch('status')

  useEffect(() => {
    getAuthorsByContentType('ARTICLE')
      .then((authors) => {
        const editors = authors.filter((a) => a.role === 'EDITOR')
        setEditorOptions(editors.map((a) => ({ author_id: a.author_id, name: a.name })))
      })
      .catch(() => setEditorOptions([]))
  }, [])

  useEffect(() => {
    // status가 sysCodeSid인 경우도 처리할 수 있도록 수정
    // TODO: 실제 sysCodeSid를 확인하여 scheduled 상태인지 판단
    setIsScheduled(false) // 임시로 false, 실제로는 sysCodeSid를 확인해야 함
  }, [status])

  // 자동 저장 (1분 간격)
  useEffect(() => {
    if (!autoSaveEnabled) return

    const interval = setInterval(() => {
      const formData = getValues()
      if (formData.title || formData.content) {
        // 로컬 스토리지에 임시 저장
        localStorage.setItem('article_draft', JSON.stringify({
          ...formData,
          thumbnail,
        }))
        console.log('자동 저장 완료')
      }
    }, 60000) // 1분

    return () => clearInterval(interval)
  }, [autoSaveEnabled, getValues, thumbnail])

  // 임시 저장 데이터 복원
  useEffect(() => {
    const draft = localStorage.getItem('article_draft')
    if (draft) {
      try {
        const draftData = JSON.parse(draft)
        Object.keys(draftData).forEach((key) => {
          if (key !== 'thumbnail') {
            setValue(key as keyof ArticleFormData, draftData[key])
          } else if (key === 'thumbnail') {
            setThumbnail(draftData.thumbnail)
          }
        })
      } catch (error) {
        console.error('임시 저장 데이터 복원 실패:', error)
      }
    }
  }, [setValue])

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

  // 본문 내용에서 모든 base64 이미지의 총 크기 계산
  const calculateImageSize = (html: string): number => {
    if (!html) return 0
    
    const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g
    let totalSize = 0
    let match

    while ((match = imgRegex.exec(html)) !== null) {
      const base64Data = match[1]
      // base64 데이터의 실제 크기 = base64 문자열 길이 * 3/4
      const size = (base64Data.length * 3) / 4
      totalSize += size
    }

    return totalSize
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const onSubmit = async (data: ArticleFormData) => {
    try {
      setSaving(true)

      // 본문 내 이미지 총 용량 체크 (8MB 제한)
      const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB
      const imageSize = calculateImageSize(data.content)
      
      if (imageSize > MAX_IMAGE_SIZE) {
        toast({
          title: '이미지 용량 초과',
          description: `본문 내 이미지 총 용량이 8MB를 초과할 수 없습니다. (현재: ${formatBytes(imageSize)})`,
          variant: 'destructive',
          duration: 5000,
        })
        setSaving(false)
        return
      }

      // 썸네일: 이미지 업로드(base64)만 전송. URL 입력 없음
      let thumbnailData: string | undefined = undefined
      if (thumbnail && thumbnail.startsWith('data:image')) {
        thumbnailData = thumbnail
      }

      // scheduledAt을 ISO 8601 형식으로 변환
      let scheduledAtISO = undefined
      if (data.scheduledAt) {
        // datetime-local 형식 (YYYY-MM-DDTHH:mm)을 ISO 형식으로 변환
        const scheduledDate = new Date(data.scheduledAt)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledAtISO = scheduledDate.toISOString()
        }
      }

      const authorId = data.author_id != null && data.author_id !== '' ? Number(data.author_id) : undefined
      const authorName = authorId ? editorOptions.find((e) => e.author_id === authorId)?.name ?? data.author : data.author

      const requestData: ArticleCreateRequest = {
        ...data,
        author_id: authorId ?? undefined,
        author: authorName ?? '',
        tags: data.tags?.filter((tag) => tag.trim() !== ''),
        scheduledAt: scheduledAtISO,
      }

      // 썸네일이 있는 경우에만 requestData에 추가
      if (thumbnailData !== undefined) {
        requestData.thumbnail = thumbnailData
      }

      const created = await createArticle(requestData)

      // API 응답에 생성된 글이 없으면 성공으로 처리하지 않음
      if (!created?.id) {
        toast({
          title: '오류',
          description: '등록 응답이 올바르지 않습니다. 다시 시도해주세요.',
          variant: 'destructive',
          duration: 5000,
        })
        setSaving(false)
        return
      }

      // 임시 저장 데이터 삭제
      localStorage.removeItem('article_draft')

      toast({
        title: '성공',
        description: '아티클이 등록되었습니다.',
        duration: 3000,
      })

      router.push('/admin/articles')
    } catch (error: any) {
      const message = error?.message || '아티클 등록에 실패했습니다.'
      const fieldErrors = (error as Error & { fieldErrors?: Record<string, string[]> })?.fieldErrors

      if (fieldErrors && typeof setError === 'function') {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          const msg = Array.isArray(messages) ? messages.join(' ') : String(messages)
          setError(field as keyof ArticleFormData, { type: 'server', message: msg })
        }
      }

      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  /** 폼 검증 실패 시 안내 (API 미호출) */
  const onInvalid = () => {
    toast({
      title: '입력 확인',
      description: '필수 항목을 입력해주세요. 오류가 표시된 필드를 확인해주세요.',
      variant: 'destructive',
      duration: 4000,
    })
  }

  const handleSaveDraft = async () => {
    const formData = getValues()
    try {
      // TODO: draft 상태의 sysCodeSid를 찾아서 설정
      // 임시로 기존 status 유지
      await onSubmit(formData)
    } catch (error) {
      console.error('임시 저장 실패:', error)
    }
  }

  return (
    <div className="h-full space-y-6">
      {/* 상단 제어 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">새 아티클 등록</h1>
            <p className="text-gray-600">아티클 정보를 입력하고 등록하세요.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            임시 저장
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // 미리보기 기능 (새 탭에서 열기)
              window.open('/articles/preview', '_blank')
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            미리보기
          </Button>
          <Button
            onClick={handleSubmit(onSubmit, onInvalid)}
            disabled={saving}
            className="bg-neon-yellow hover:bg-neon-yellow/90 text-black"
          >
            {saving ? '저장 중...' : '등록'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* 기본 정보 설정 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 분류</Label>
                <Input value="아티클" disabled className="bg-gray-100" />
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
              <Label htmlFor="visibility">공개 범위 설정 *</Label>
              <SysCodeRadioGroup
                sysCodeGubn="SYS26209B015"
                value={watch('visibility')}
                onValueChange={(value) => setValue('visibility', value)}
                orientation="horizontal"
              />
              {errors.visibility && (
                <p className="text-sm text-red-600">{errors.visibility.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_id">작성자(에디터) *</Label>
              <Select
                value={watch('author_id') != null ? String(watch('author_id')) : ''}
                onValueChange={(value) => {
                  const id = value === '' ? undefined : Number(value)
                  setValue('author_id', id)
                  const selected = editorOptions.find((e) => e.author_id === id)
                  setValue('author', selected?.name ?? '')
                }}
              >
                <SelectTrigger id="author_id">
                  <SelectValue placeholder="작성자(에디터) 선택" />
                </SelectTrigger>
                <SelectContent>
                  {editorOptions.map((e) => (
                    <SelectItem key={e.author_id} value={String(e.author_id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.author_id && (
                <p className="text-sm text-red-600">{errors.author_id.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* 메인 콘텐츠 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">본문 및 콘텐츠</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">메인 타이틀 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="아티클 제목을 입력하세요"
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
                placeholder="아티클 부제를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">본문 내용 *</Label>
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(value) => setValue('content', value)}
                placeholder="본문 내용을 입력하세요"
              />
              {errors.content && (
                <p className="text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="previewLength">미리보기 분량 설정 (%)</Label>
              <Input
                id="previewLength"
                type="number"
                min="0"
                max="100"
                {...register('previewLength', { valueAsNumber: true })}
                defaultValue={50}
              />
              <p className="text-xs text-gray-500">
                비로그인 및 무료 회원에게 노출할 본문 비율을 설정하세요 (0-100%)
              </p>
            </div>
          </div>
        </Card>

        {/* 미디어 및 첨부 파일 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">미디어 및 메타데이터</h2>
          <div className="space-y-4">
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
              <Label>검색 키워드/태그</Label>
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

            <div className="space-y-2">
              <Label>에디터 추천 설정</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch('isEditorPick')}
                  onCheckedChange={(checked) => setValue('isEditorPick', checked)}
                />
                <Label className="text-sm">
                  체크 시 메인 페이지 '에디터 추천' 섹션에 노출
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* 적용 질문 (Q&A) */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">적용 질문 (Q&A)</h2>
          <p className="text-sm text-gray-500">
            아티클 저장 후 수정 페이지에서 이 콘텐츠에 대한 적용 질문을 등록·수정할 수 있습니다.
          </p>
        </Card>

        {/* 발행 및 시스템 정보 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">발행 및 시스템 정보</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>발행 상태 *</Label>
              <SysCodeRadioGroup
                sysCodeGubn="SYS26209B020"
                value={watch('status')}
                onValueChange={(value) => setValue('status', value)}
                orientation="horizontal"
              />
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
    </div>
  )
}

