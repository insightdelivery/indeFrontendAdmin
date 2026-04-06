'use client'

import type { ReactNode } from 'react'
import { type Video, VIDEO_CATEGORY_PARENT, SEMINAR_CATEGORY_PARENT } from '@/features/video'
import VideoPlayer from '@/components/video/VideoPlayer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSysCodeFromCache, getSysCodeName } from '@/lib/syscode'
import { cn, formatDateTime } from '@/lib/utils'

function dashStr(v: unknown): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'string' && !v.trim()) return '-'
  return String(v)
}

function formatAttachmentSize(bytes?: number): string {
  if (bytes == null || bytes <= 0) return '-'
  const u = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`
}

function statusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    public: { label: '공개', className: 'bg-green-100 text-green-800' },
    private: { label: '비공개', className: 'bg-gray-100 text-gray-800' },
    scheduled: { label: '예약', className: 'bg-blue-100 text-blue-800' },
    deleted: { label: '삭제대기', className: 'bg-red-100 text-red-800' },
  }
  const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusInfo.className)}>
      {statusInfo.label}
    </span>
  )
}

export type VideoDetailSectionsProps = {
  video: Video
  /** 세미나: 영상 소스는 FILE_UPLOAD 고정 (`seminarPlan`) */
  seminarSourceOnly?: boolean
  /** 목록 미리보기 모달 — 제목은 Dialog 헤더에 두고 본 컴포넌트에서는 생략 */
  omitTitleSubtitle?: boolean
  compact?: boolean
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground break-words">{children}</div>
    </div>
  )
}

export default function VideoDetailSections({
  video,
  seminarSourceOnly = false,
  omitTitleSubtitle = false,
  compact = false,
}: VideoDetailSectionsProps) {
  const categoryName =
    (() => {
      const parent = seminarSourceOnly ? SEMINAR_CATEGORY_PARENT : VIDEO_CATEGORY_PARENT
      const codes = getSysCodeFromCache(parent)
      return codes ? getSysCodeName(codes, video.category) : null
    })() || video.category

  const proseClass = compact ? 'prose prose-sm max-w-none dark:prose-invert' : 'prose max-w-none dark:prose-invert'
  const bodyHtml = (video.body || '').trim()
  const tags = video.tags?.filter(Boolean) ?? []
  const attachments = video.attachments ?? []

  const st = seminarSourceOnly ? 'FILE_UPLOAD' : (video.sourceType ?? 'FILE_UPLOAD')
  const vUrl = seminarSourceOnly ? undefined : video.videoUrl

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">영상</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoPlayer sourceType={st} videoStreamId={video.videoStreamId} videoUrl={vUrl} />
        </CardContent>
      </Card>

      {!omitTitleSubtitle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl leading-snug">{dashStr(video.title) === '-' ? '—' : video.title}</CardTitle>
            {video.subtitle ? (
              <p className="text-sm text-muted-foreground font-normal">{video.subtitle}</p>
            ) : null}
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">메타 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetaCell label="상태">{statusBadge(video.status || '')}</MetaCell>
            <MetaCell label="공개 범위">{dashStr(video.visibility)}</MetaCell>
            <MetaCell label="카테고리">{dashStr(categoryName)}</MetaCell>
            <MetaCell label="콘텐츠 유형">{video.contentType === 'seminar' ? '세미나' : '비디오'}</MetaCell>
            <MetaCell label="출연자">{dashStr(video.speaker)}</MetaCell>
            <MetaCell label="조회수">{video.viewCount ?? 0}</MetaCell>
            <MetaCell label="평점">{video.rating != null ? String(video.rating) : '-'}</MetaCell>
            <MetaCell label="댓글 수">{video.commentCount ?? 0}</MetaCell>
            <MetaCell label="등록일">{formatDateTime(video.createdAt) || '-'}</MetaCell>
            <MetaCell label="수정일">{formatDateTime(video.updatedAt) || '-'}</MetaCell>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">본문</CardTitle>
        </CardHeader>
        <CardContent>
          {bodyHtml ? (
            <div className={proseClass} dangerouslySetInnerHTML={{ __html: video.body || '' }} />
          ) : (
            <p className="text-sm text-muted-foreground">본문이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">태그</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">등록된 태그가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">첨부파일</CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {attachments.map((a, i) => (
                <li key={`${a.url}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline font-medium"
                  >
                    {dashStr(a.filename) === '-' ? '파일' : a.filename}
                  </a>
                  <span className="text-muted-foreground text-xs">({formatAttachmentSize(a.size)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">첨부파일이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
