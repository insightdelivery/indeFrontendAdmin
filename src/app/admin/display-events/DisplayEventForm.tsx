'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  fetchSysCodeByParent,
  createSysCodeOptions,
  DISPLAY_EVENT_TYPE_PARENT,
  DISPLAY_CONTENT_TYPE_PARENT,
} from '@/lib/syscode'
import type { SysCodeItem } from '@/lib/syscode'
import { createDisplayEvent, getDisplayEvent, updateDisplayEvent } from '@/services/displayEvent'
import { uploadEventBannerImage, validateEventBannerImageFile } from '@/services/eventBannerImageUpload'
import type { DisplayEventWritePayload } from '@/types/displayEvent'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

interface Props {
  eventId?: number
}

export default function DisplayEventForm({ eventId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(!!eventId)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [eventTypes, setEventTypes] = useState<SysCodeItem[]>([])
  const [contentTypes, setContentTypes] = useState<SysCodeItem[]>([])

  const [eventTypeCode, setEventTypeCode] = useState('')
  const [contentTypeCode, setContentTypeCode] = useState('')
  const [contentIdStr, setContentIdStr] = useState('')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [badgeText, setBadgeText] = useState('')
  /** 저장·API payload용 (S3 직링크). 비공개 버킷이라 `<img>`에는 쓰지 않음 */
  const [imageUrl, setImageUrl] = useState('')
  /** 서버에서 내려준 Presigned 또는 업로드 응답 `displayUrl` — 미리보기 전용 */
  const [imageDisplayUrl, setImageDisplayUrl] = useState<string | null>(null)
  /** 업로드 완료 전 로컬 미리보기(blob:) — 언마운트·교체 시 revoke */
  const [imagePreviewBlobUrl, setImagePreviewBlobUrl] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')

  const parsedContentId =
    contentIdStr.trim() === '' ? null : Number.parseInt(contentIdStr, 10)
  const hasValidContentId =
    contentIdStr.trim() !== '' && parsedContentId != null && Number.isFinite(parsedContentId)
  const contentIdInvalid = contentIdStr.trim() !== '' && !hasValidContentId
  const linkDisabled = hasValidContentId

  const loadCodes = useCallback(async () => {
    try {
      const [et, ct] = await Promise.all([
        fetchSysCodeByParent(DISPLAY_EVENT_TYPE_PARENT),
        fetchSysCodeByParent(DISPLAY_CONTENT_TYPE_PARENT),
      ])
      setEventTypes(et)
      setContentTypes(ct)
    } catch (e: unknown) {
      toast({
        title: '시스템 코드',
        description: e instanceof Error ? e.message : '코드 로드 실패',
        variant: 'destructive',
      })
    }
  }, [toast])

  useEffect(() => {
    void loadCodes()
  }, [loadCodes])

  useEffect(() => {
    return () => {
      if (imagePreviewBlobUrl) {
        URL.revokeObjectURL(imagePreviewBlobUrl)
      }
    }
  }, [imagePreviewBlobUrl])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const row = await getDisplayEvent(eventId)
        if (cancelled) return
        setEventTypeCode(row.eventTypeCode || '')
        setContentTypeCode(row.contentTypeCode || '')
        setContentIdStr(row.contentId != null ? String(row.contentId) : '')
        setTitle(row.title || '')
        setSubtitle(row.subtitle || '')
        setBadgeText(row.badgeText || '')
        setImageUrl(row.imageUrl || '')
        setImageDisplayUrl(null)
        setLinkUrl(row.linkUrl || '')
        setDisplayOrder(row.displayOrder ?? 0)
        setIsActive(row.isActive !== false)
        setStartLocal(toDatetimeLocal(row.startAt))
        setEndLocal(toDatetimeLocal(row.endAt))
      } catch (e: unknown) {
        toast({
          title: '오류',
          description: e instanceof Error ? e.message : '불러오기 실패',
          variant: 'destructive',
        })
        router.push('/admin/display-events')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTypeCode || !contentTypeCode) {
      toast({ title: '입력', description: '이벤트 유형·콘텐츠 유형은 필수입니다.', variant: 'destructive' })
      return
    }
    if (contentIdInvalid) {
      toast({ title: '입력', description: '콘텐츠 ID는 숫자여야 합니다.', variant: 'destructive' })
      return
    }

    const payload: DisplayEventWritePayload = {
      eventTypeCode,
      contentTypeCode,
      contentId: hasValidContentId ? parsedContentId : null,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      badgeText: badgeText.trim() || null,
      imageUrl: imageUrl.trim() || null,
      linkUrl: linkDisabled ? null : linkUrl.trim() || null,
      displayOrder,
      isActive,
      startAt: fromDatetimeLocal(startLocal),
      endAt: fromDatetimeLocal(endLocal),
    }

    try {
      setSaving(true)
      if (eventId) {
        await updateDisplayEvent(eventId, payload)
        toast({ title: '저장됨', description: '이벤트 베너가 수정되었습니다.' })
      } else {
        await createDisplayEvent(payload)
        toast({ title: '등록됨', description: '이벤트 베너가 등록되었습니다.' })
      }
      router.push('/admin/display-events')
    } catch (err: unknown) {
      toast({
        title: '오류',
        description: err instanceof Error ? err.message : '저장 실패',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const eventOpts = createSysCodeOptions(eventTypes)
  const contentOpts = createSysCodeOptions(contentTypes)

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-12 text-center">불러오는 중…</div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Button type="button" variant="outline" size="sm" asChild className="mb-2">
          <Link href="/admin/display-events" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            목록
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">
          {eventId ? '이벤트 베너 수정' : '이벤트 베너 등록'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          contentId가 있으면 링크 URL은 사용할 수 없습니다. (서버 검증)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label>이벤트 유형 (eventTypeCode)</Label>
              <Select value={eventTypeCode} onValueChange={setEventTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {eventOpts.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>콘텐츠 유형 (contentTypeCode)</Label>
              <Select value={contentTypeCode} onValueChange={setContentTypeCode}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {contentOpts.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>콘텐츠 ID (내부 링크용, 비우면 외부 링크 가능)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={contentIdStr}
                onChange={(ev) => {
                  setContentIdStr(ev.target.value)
                  if (ev.target.value.trim() !== '') setLinkUrl('')
                }}
                placeholder="예: 123"
              />
            </div>

            <div className="grid gap-2">
              <Label>외부 링크 URL (contentId 없을 때만)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={linkDisabled}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label>제목 (비우면 콘텐츠 제목 사용)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>부제</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>배지 (비우면 www 히어로에서 칩 미표시)</Label>
              <Input
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                maxLength={100}
                placeholder="예: Director's Pick"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="de-banner-image">배너 이미지</Label>
              <p className="text-xs text-muted-foreground">
                JPEG / PNG / GIF / WebP, 최대 4MB. 비우면 연결된 콘텐츠 썸네일을 사용합니다.
              </p>
              <Input
                id="de-banner-image"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                className="cursor-pointer"
                disabled={uploadingImage || saving}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  try {
                    validateEventBannerImageFile(f)
                  } catch (err: unknown) {
                    toast({
                      title: '선택한 파일을 사용할 수 없습니다',
                      description: err instanceof Error ? err.message : '이미지를 확인해 주세요.',
                      variant: 'destructive',
                    })
                    return
                  }
                  const blobUrl = URL.createObjectURL(f)
                  setImagePreviewBlobUrl(blobUrl)
                  try {
                    setUploadingImage(true)
                    const { storageUrl, displayUrl } = await uploadEventBannerImage(f)
                    setImageUrl(storageUrl)
                    setImageDisplayUrl(displayUrl)
                    setImagePreviewBlobUrl(null)
                    toast({ title: '업로드 완료', description: '배너 이미지가 반영되었습니다.' })
                  } catch (err: unknown) {
                    setImagePreviewBlobUrl(null)
                    toast({
                      title: '업로드 실패',
                      description: err instanceof Error ? err.message : '이미지를 올리지 못했습니다.',
                      variant: 'destructive',
                    })
                  } finally {
                    setUploadingImage(false)
                  }
                }}
              />
              {uploadingImage ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  업로드 중…
                </div>
              ) : null}
              {imagePreviewBlobUrl || imageDisplayUrl || imageUrl ? (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <div className="relative aspect-[16/9] max-h-40 w-full overflow-hidden rounded bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewBlobUrl || imageDisplayUrl || imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || uploadingImage}
                    onClick={() => {
                      setImageUrl('')
                      setImageDisplayUrl(null)
                      setImagePreviewBlobUrl(null)
                    }}
                  >
                    이미지 제거 (콘텐츠 썸네일 사용)
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>표시 순서</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="de-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="de-active" className="font-normal cursor-pointer">
                활성
              </Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>시작 일시 (선택)</Label>
                <Input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>종료 일시 (선택)</Label>
                <Input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving || uploadingImage}>
                {saving ? '저장 중…' : eventId ? '수정' : '등록'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/display-events">취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
