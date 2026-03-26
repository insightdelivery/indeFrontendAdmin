import type { Area } from 'react-easy-crop'

export const PROFILE_CROP_OUTPUT_PX = 500
export const PROFILE_IMAGE_MAX_BYTES = 3 * 1024 * 1024

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (e) => reject(e))
    image.src = url
  })
}

/** 시계 방향 90° 회전한 JPEG Blob URL 생성 (호출측에서 이전 URL revoke) */
export async function rotateImageBlobUrl90Cw(imageUrl: string): Promise<string> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d를 사용할 수 없습니다.')

  canvas.width = image.naturalHeight
  canvas.height = image.naturalWidth
  ctx.translate(canvas.width, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(image, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
  )
  if (!blob) throw new Error('이미지 회전에 실패했습니다.')
  return URL.createObjectURL(blob)
}

/** croppedAreaPixels 기준으로 잘라 JPEG Blob */
export async function cropToJpegBlob(imageUrl: string, pixelCrop: Area, quality = 0.92): Promise<Blob> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d를 사용할 수 없습니다.')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  )
  if (!blob) throw new Error('이미지 자르기에 실패했습니다.')
  return blob
}

/** 정사각 리사이즈 후 JPEG */
export async function resizeSquareJpegBlob(blob: Blob, size: number, quality = 0.92): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d를 사용할 수 없습니다.')
    canvas.width = size
    canvas.height = size
    ctx.drawImage(image, 0, 0, size, size)
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    )
    if (!out) throw new Error('이미지 리사이즈에 실패했습니다.')
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 3MB 이하가 될 때까지 품질을 낮춰 재인코딩 */
export async function ensureJpegBlobUnderMaxBytes(
  blob: Blob,
  maxBytes: number,
  minQuality = 0.5
): Promise<Blob> {
  let q = 0.92
  let current = blob
  for (let i = 0; i < 10 && current.size > maxBytes && q >= minQuality; i++) {
    q = Math.max(minQuality, q - 0.08)
    current = await resizeSquareJpegBlob(current, PROFILE_CROP_OUTPUT_PX, q)
  }
  if (current.size > maxBytes) {
    throw new Error(`이미지 용량을 ${Math.round(maxBytes / (1024 * 1024))}MB 이하로 줄이지 못했습니다. 다른 사진을 선택해 주세요.`)
  }
  return current
}

export async function buildProfileImageFileFromCrop(
  imageUrl: string,
  pixelCrop: Area
): Promise<File> {
  let blob = await cropToJpegBlob(imageUrl, pixelCrop, 0.92)
  blob = await resizeSquareJpegBlob(blob, PROFILE_CROP_OUTPUT_PX, 0.92)
  blob = await ensureJpegBlobUnderMaxBytes(blob, PROFILE_IMAGE_MAX_BYTES)
  return new File([blob], 'profile.jpg', { type: 'image/jpeg', lastModified: Date.now() })
}
