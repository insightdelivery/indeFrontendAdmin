'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Minus, Plus, RotateCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { buildProfileImageFileFromCrop, rotateImageBlobUrl90Cw } from '@/lib/profileImageCrop'
import { validateProfileImageFile } from '@/features/contentAuthor'

type ProfileImageCropDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 선택된 원본 파일 — 열릴 때마다 새로 잡음 */
  sourceFile: File | null
  onComplete: (file: File) => void
  onCancel: () => void
}

const CROP_HEIGHT = 320
/** 1 미만이면 이미지를 축소해 드래그로 위치 잡기 여유가 생김 */
const ZOOM_MIN = 0.65
const ZOOM_MAX = 3
/** 슬라이더 중앙 부근에서 시작 */
const ZOOM_DEFAULT = (ZOOM_MIN + ZOOM_MAX) / 2
const ZOOM_STEP = 0.05
/** 화살표/키보드로 미세 이동 (px, react-easy-crop crop 좌표계) */
const PAN_STEP = 12

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

export function ProfileImageCropDialog({
  open,
  onOpenChange,
  sourceFile,
  onComplete,
  onCancel,
}: ProfileImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const srcRef = useRef<string | null>(null)

  const revokeCurrent = useCallback(() => {
    if (srcRef.current) {
      URL.revokeObjectURL(srcRef.current)
      srcRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open || !sourceFile) {
      revokeCurrent()
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(ZOOM_DEFAULT)
      setCroppedAreaPixels(null)
      setError(null)
      return
    }
    revokeCurrent()
    const url = URL.createObjectURL(sourceFile)
    srcRef.current = url
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(ZOOM_DEFAULT)
    setCroppedAreaPixels(null)
    setError(null)
    return () => {
      revokeCurrent()
      setImageSrc(null)
    }
  }, [open, sourceFile, revokeCurrent])

  const onCropComplete = useCallback((_c: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const nudgeCrop = useCallback((dx: number, dy: number) => {
    setCrop((c) => ({ x: c.x + dx, y: c.y + dy }))
  }, [])

  const handleRotate = useCallback(async () => {
    if (!imageSrc) return
    setError(null)
    try {
      const next = await rotateImageBlobUrl90Cw(imageSrc)
      revokeCurrent()
      srcRef.current = next
      setImageSrc(next)
      setCrop({ x: 0, y: 0 })
      setZoom(ZOOM_DEFAULT)
      setCroppedAreaPixels(null)
    } catch {
      setError('회전 처리에 실패했습니다.')
    }
  }, [imageSrc, revokeCurrent])

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setError('크롭 영역을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const file = await buildProfileImageFileFromCrop(imageSrc, croppedAreaPixels)
      const v = await validateProfileImageFile(file)
      if (!v.valid) {
        setError(v.error)
        return
      }
      onComplete(file)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 처리에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }, [imageSrc, croppedAreaPixels, onComplete, onOpenChange])

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      onCancel()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>프로필 이미지 자르기</DialogTitle>
          <DialogDescription>
            <span className="block">
              이미지를 <strong className="font-medium text-foreground">드래그</strong>해 원 안에 넣을 부분을 맞추고, 줌으로 크기를 조절하세요.
            </span>
            <span className="mt-1 block text-muted-foreground">
              확정 시 500px 정사각 JPEG로 저장됩니다.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black px-2 pt-2">
          {imageSrc ? (
            <div
              className="relative mx-auto overflow-hidden rounded-md bg-black"
              style={{ width: '100%', height: CROP_HEIGHT }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                minZoom={ZOOM_MIN}
                maxZoom={ZOOM_MAX}
                restrictPosition
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                classes={{
                  containerClassName:
                    'cursor-grab active:cursor-grabbing touch-none select-none',
                }}
              />
              {/* 원형 가이드 (pointer-events 없음) */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background: `radial-gradient(
                    circle at 50% 50%,
                    transparent 0,
                    transparent min(42%, 130px),
                    rgba(0, 0, 0, 0.42) min(calc(42% + 1px), 131px),
                    rgba(0, 0, 0, 0.55) 100%
                  )`,
                }}
                aria-hidden
              />
            </div>
          ) : null}
        </div>

        {/* 위치: 드래그와 동일 crop 좌표 (화살표는 미세 조절) */}
        <div className="flex flex-col items-center gap-2 border-b bg-background px-6 py-3">
          <p className="text-xs text-muted-foreground">이미지 위치 · 드래그 또는 화살표</p>
          <div className="flex flex-col items-center gap-0.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="이미지를 위로 이동"
              onClick={() => nudgeCrop(0, -PAN_STEP)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="이미지를 왼쪽으로 이동"
                onClick={() => nudgeCrop(-PAN_STEP, 0)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="이미지를 오른쪽으로 이동"
                onClick={() => nudgeCrop(PAN_STEP, 0)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="이미지를 아래로 이동"
              onClick={() => nudgeCrop(0, PAN_STEP)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-b bg-background px-6 py-4">
          <p className="text-center text-xs text-muted-foreground">줌</p>
          <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1 px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              aria-label="더 작게"
            >
              <Minus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              <span className="whitespace-nowrap">더 작게</span>
            </Button>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
              className="h-2 min-w-0 flex-1 cursor-pointer accent-primary"
              aria-valuemin={ZOOM_MIN}
              aria-valuemax={ZOOM_MAX}
              aria-valuenow={zoom}
              aria-label="줌 조절"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1 px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              aria-label="더 크게"
            >
              <span className="whitespace-nowrap">더 크게</span>
              <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleRotate}>
            <RotateCw className="mr-2 h-4 w-4" />
            90° 회전
          </Button>
        </div>

        {error ? <p className="px-6 py-2 text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={busy}>
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || !imageSrc || !croppedAreaPixels}>
            {busy ? '처리 중…' : '확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
