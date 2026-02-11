import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜/시간을 포맷팅하는 함수
 * @param dateString ISO 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 날짜 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error)
    return ''
  }
}

