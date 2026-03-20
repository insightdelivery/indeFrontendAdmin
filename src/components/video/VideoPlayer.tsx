'use client'

import type { VideoSourceType } from '@/features/video'

export interface VideoPlayerProps {
  sourceType: VideoSourceType | string | undefined | null
  videoStreamId?: string | null
  videoUrl?: string | null
}

/** API·DB에서 소문자 등이 섞여 올 수 있음 */
function canonicalSourceType(st: VideoPlayerProps['sourceType']): VideoSourceType | null {
  const s = (st || '').toString().trim().toUpperCase()
  if (s === 'VIMEO' || s === 'YOUTUBE' || s === 'FILE_UPLOAD') {
    return s as VideoSourceType
  }
  return null
}

function extractYouTubeVideoId(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  try {
    const url = u.startsWith('http') ? new URL(u) : new URL(`https://${u}`)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0]
      if (id && /^[\w-]+$/.test(id) && id.length >= 6) return id
      return null
    }
    if (host.includes('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]+$/.test(v) && v.length >= 6) return v
      const paths = ['embed', 'shorts', 'live']
      for (const p of paths) {
        const m = url.pathname.match(new RegExp(`/${p}/([\\w-]+)`))
        if (m?.[1] && m[1].length >= 6) return m[1]
      }
    }
  } catch {
    /* ignore */
  }
  const watch = u.match(/[?&]v=([\w-]+)/)
  if (watch?.[1] && watch[1].length >= 6) return watch[1]
  const short = u.match(/youtu\.be\/([\w-]+)/)
  if (short?.[1] && short[1].length >= 6) return short[1]
  return null
}

function extractVimeoId(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  const m = u.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
  return m ? m[1] : null
}

function inferExternalFromUrl(url: string): 'YOUTUBE' | 'VIMEO' | null {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YOUTUBE'
  if (lower.includes('vimeo.com')) return 'VIMEO'
  return null
}

/**
 * FILE_UPLOAD 이지만 Stream ID 없이 YouTube/Vimeo URL만 있는 레거시·불일치 행 대응
 */
function effectivePlayerMode(
  st: VideoSourceType | null,
  sid: string,
  url: string
): 'CLOUDFLARE' | 'YOUTUBE' | 'VIMEO' | 'NONE' {
  if (st === 'FILE_UPLOAD' && sid) return 'CLOUDFLARE'
  if (st === 'YOUTUBE' && url) return 'YOUTUBE'
  if (st === 'VIMEO' && url) return 'VIMEO'
  if (st === 'FILE_UPLOAD' && !sid && url) {
    const inferred = inferExternalFromUrl(url)
    if (inferred === 'YOUTUBE' && extractYouTubeVideoId(url)) return 'YOUTUBE'
    if (inferred === 'VIMEO' && extractVimeoId(url)) return 'VIMEO'
  }
  return 'NONE'
}

export default function VideoPlayer({ sourceType, videoStreamId, videoUrl }: VideoPlayerProps) {
  const sid = (videoStreamId || '').trim()
  const url = (videoUrl || '').trim()
  const st = canonicalSourceType(sourceType) ?? 'FILE_UPLOAD'
  const mode = effectivePlayerMode(st, sid, url)

  if (mode === 'CLOUDFLARE') {
    return (
      <div className="w-full aspect-video overflow-hidden rounded-md border bg-black">
        <iframe
          src={`https://iframe.videodelivery.net/${sid}`}
          className="h-full w-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Cloudflare Stream"
        />
      </div>
    )
  }

  if (mode === 'YOUTUBE') {
    const id = extractYouTubeVideoId(url)
    if (!id) {
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 text-center text-sm text-muted-foreground px-4">
          유효한 YouTube 주소가 아닙니다
        </div>
      )
    }
    const embedSrc = `https://www.youtube.com/embed/${id}?rel=0`
    return (
      <div className="w-full aspect-video overflow-hidden rounded-md border bg-black">
        <iframe
          src={embedSrc}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
    )
  }

  if (mode === 'VIMEO') {
    const vid = extractVimeoId(url)
    if (!vid) {
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 text-center text-sm text-muted-foreground px-4">
          유효한 Vimeo 주소가 아닙니다
        </div>
      )
    }
    return (
      <div className="w-full aspect-video overflow-hidden rounded-md border bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vid}`}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video player"
        />
      </div>
    )
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 text-center text-sm text-muted-foreground">
      영상이 준비되지 않았습니다
    </div>
  )
}
