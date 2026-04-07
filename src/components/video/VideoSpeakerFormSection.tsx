'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { FieldErrors, FieldValues, Path, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { ProfileImageCropDialog } from '@/components/contentAuthor/ProfileImageCropDialog'
import { validateProfileImageFileRaw } from '@/features/contentAuthor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, User } from 'lucide-react'

export type VideoSpeakerProfileUploadState = { pendingFile: File | null; cleared: boolean }

type VideoSpeakerFormSectionProps<T extends FieldValues> = {
  register: UseFormRegister<T>
  setValue: UseFormSetValue<T>
  watch: UseFormWatch<T>
  errors: FieldErrors<T>
  onSpeakerProfileUploadStateChange: (s: VideoSpeakerProfileUploadState) => void
  /** 데이터 로드·폼 리셋 시 내부 미리보기·대기 파일 초기화 */
  resetToken: string | number
  /** 라벨·id 접두사 (한 페이지에 폼이 둘 이상일 때) */
  idPrefix?: string
}

export function VideoSpeakerFormSection<T extends FieldValues>({
  register,
  setValue,
  watch,
  errors,
  onSpeakerProfileUploadStateChange,
  resetToken,
  idPrefix = 'video_speaker',
}: VideoSpeakerFormSectionProps<T>) {
  const { toast } = useToast()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [blobPreview, setBlobPreview] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const storedUrl = (watch('speakerProfileImage' as Path<T>) as string | undefined) || ''

  useEffect(() => {
    if (blobPreview) {
      URL.revokeObjectURL(blobPreview)
      setBlobPreview(null)
    }
    setPendingFile(null)
    setCleared(false)
    setCropSourceFile(null)
    setCropOpen(false)
    onSpeakerProfileUploadStateChange({ pendingFile: null, cleared: false })
    if (fileInputRef.current) fileInputRef.current.value = ''
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetToken만 외부 동기화 트리거
  }, [resetToken])

  const pushState = (next: VideoSpeakerProfileUploadState) => {
    onSpeakerProfileUploadStateChange(next)
  }

  const onProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = validateProfileImageFileRaw(file)
    if (!result.valid) {
      toast({ title: '프로필 이미지', description: result.error, variant: 'destructive' })
      e.target.value = ''
      return
    }
    setCropSourceFile(file)
    setCropOpen(true)
    e.target.value = ''
  }

  const handleCropComplete = (file: File) => {
    if (blobPreview) URL.revokeObjectURL(blobPreview)
    setPendingFile(file)
    setBlobPreview(URL.createObjectURL(file))
    setCleared(false)
    setValue('speakerProfileImage' as Path<T>, '' as never)
    setCropSourceFile(null)
    pushState({ pendingFile: file, cleared: false })
  }

  const handleCropCancel = () => {
    setCropSourceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearProfileImage = () => {
    if (blobPreview) URL.revokeObjectURL(blobPreview)
    setPendingFile(null)
    setBlobPreview(null)
    setCleared(true)
    setValue('speakerProfileImage' as Path<T>, '' as never)
    if (fileInputRef.current) fileInputRef.current.value = ''
    pushState({ pendingFile: null, cleared: true })
  }

  const showPreview = blobPreview || (!cleared && storedUrl.trim() ? storedUrl : null)

  const speakerErr = errors.speaker as { message?: string } | undefined
  const affiliationErr = errors.speakerAffiliation as { message?: string } | undefined

  return (
    <div className="space-y-6 rounded-lg border border-border/60 bg-muted/20 p-4">
      <ProfileImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        sourceFile={cropSourceFile}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden />
        출연자/강사
      </div>

      <input type="hidden" {...register('speakerProfileImage' as Path<T>)} />

      {/* 왼쪽: 프로필 이미지 · 오른쪽: 이름·소속 (모바일은 세로, 넓은 화면에서 2열) */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0 space-y-3 sm:max-w-[220px]">
          <Label className="text-sm font-medium" htmlFor={`${idPrefix}_profile_file`}>
            프로필 이미지
          </Label>
          <p className="text-xs text-muted-foreground">
            콘텐츠 저자와 동일: 이미지 선택 후 크롭 · 500px 정사각 JPEG · 3MB 이하
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border bg-muted">
              {showPreview ? (
                <Image src={showPreview} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">없음</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id={`${idPrefix}_profile_file`}
                onChange={onProfileFileChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  이미지 선택
                </Button>
                {showPreview ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearProfileImage}>
                    <X className="mr-2 h-4 w-4" />
                    제거
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2 max-w-lg">
            <Label htmlFor={`${idPrefix}_name`}>
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${idPrefix}_name`}
              {...register('speaker' as Path<T>)}
              placeholder="출연자/강사 이름"
            />
            {speakerErr?.message ? <p className="text-sm text-destructive">{speakerErr.message}</p> : null}
          </div>

          <div className="space-y-2 max-w-lg">
            <Label htmlFor={`${idPrefix}_affiliation`}>소속</Label>
            <Input
              id={`${idPrefix}_affiliation`}
              {...register('speakerAffiliation' as Path<T>)}
              placeholder="소속(선택)"
            />
            {affiliationErr?.message ? (
              <p className="text-sm text-destructive">{affiliationErr.message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
