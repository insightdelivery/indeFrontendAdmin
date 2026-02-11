'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSysCode, type SysCodeItem } from '@/lib/syscode'

interface SysCodeSelectProps {
  /** 부모 코드 ID (예: 'SYS26209B002') */
  sysCodeGubn: string
  /** 선택된 값 (sysCodeSid) */
  value?: string
  /** 값 변경 핸들러 */
  onValueChange?: (value: string) => void
  /** placeholder 텍스트 */
  placeholder?: string
  /** 비활성화 여부 */
  disabled?: boolean
  /** "전체" 옵션 표시 여부 (목록 필터용) */
  showAllOption?: boolean
  /** "전체" 옵션의 값 (기본값: '전체') */
  allOptionValue?: string
  /** "전체" 옵션의 라벨 (기본값: '전체') */
  allOptionLabel?: string
  /** 추가 클래스명 */
  className?: string
}

/**
 * 시스템 코드 Select 컴포넌트
 * localStorage에서 sysCodeData를 가져와서 selectbox를 렌더링합니다.
 * 
 * @example
 * ```tsx
 * <SysCodeSelect
 *   sysCodeGubn="SYS26209B002"
 *   value={category}
 *   onValueChange={(value) => setCategory(value)}
 *   placeholder="카테고리 선택"
 * />
 * ```
 */
export function SysCodeSelect({
  sysCodeGubn,
  value,
  onValueChange,
  placeholder = '선택하세요',
  disabled = false,
  showAllOption = false,
  allOptionValue = '전체',
  allOptionLabel = '전체',
  className,
}: SysCodeSelectProps) {
  const [categories, setCategories] = useState<SysCodeItem[]>([])
  const [loading, setLoading] = useState(true)

  // localStorage에서 카테고리 데이터 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true)
        const categoryData = await getSysCode(sysCodeGubn)
        setCategories(categoryData)
      } catch (error) {
        console.error(`시스템 코드 로드 실패 (${sysCodeGubn}):`, error)
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [sysCodeGubn])

  // 사용 가능한 카테고리만 필터링 및 정렬
  const availableCategories = categories
    .filter((cat) => cat.sysCodeUseFlag === 'Y')
    .sort((a, b) => a.sysCodeSort - b.sysCodeSort)

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? '로딩 중...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value={allOptionValue}>{allOptionLabel}</SelectItem>
        )}
        {availableCategories.map((cat) => (
          <SelectItem key={cat.sysCodeSid} value={cat.sysCodeSid}>
            {cat.sysCodeName}
          </SelectItem>
        ))}
        {!loading && availableCategories.length === 0 && (
          <SelectItem value="" disabled>
            데이터가 없습니다
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}


