'use client'

import { useState, useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { getSysCode, type SysCodeItem } from '@/lib/syscode'

interface SysCodeRadioGroupProps {
  /** 부모 코드 ID (예: 'SYS26209B021') */
  sysCodeGubn: string
  /** 선택된 값 (sysCodeSid) */
  value?: string
  /** 값 변경 핸들러 */
  onValueChange?: (value: string) => void
  /** 비활성화 여부 */
  disabled?: boolean
  /** 레이아웃 방향 ('horizontal' | 'vertical') */
  orientation?: 'horizontal' | 'vertical'
  /** 추가 클래스명 */
  className?: string
}

/**
 * 시스템 코드 RadioGroup 컴포넌트
 * localStorage에서 sysCodeData를 가져와서 라디오 버튼 리스트를 렌더링합니다.
 * 
 * @example
 * ```tsx
 * <SysCodeRadioGroup
 *   sysCodeGubn="SYS26209B021"
 *   value={visibility}
 *   onValueChange={(value) => setVisibility(value)}
 *   orientation="horizontal"
 * />
 * ```
 */
export function SysCodeRadioGroup({
  sysCodeGubn,
  value,
  onValueChange,
  disabled = false,
  orientation = 'horizontal',
  className,
}: SysCodeRadioGroupProps) {
  const [items, setItems] = useState<SysCodeItem[]>([])
  const [loading, setLoading] = useState(true)

  // localStorage에서 시스템 코드 데이터 로드
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true)
        const data = await getSysCode(sysCodeGubn)
        setItems(data)
      } catch (error) {
        console.error(`시스템 코드 로드 실패 (${sysCodeGubn}):`, error)
      } finally {
        setLoading(false)
      }
    }
    loadItems()
  }, [sysCodeGubn])

  // 사용 가능한 항목만 필터링 및 정렬
  const availableItems = items
    .filter((item) => item.sysCodeUseFlag === 'Y')
    .sort((a, b) => a.sysCodeSort - b.sysCodeSort)

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm text-gray-500">로딩 중...</span>
      </div>
    )
  }

  if (availableItems.length === 0) {
    return (
      <div className="text-sm text-gray-500">데이터가 없습니다</div>
    )
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
    >
      <div
        className={
          orientation === 'horizontal'
            ? 'flex flex-wrap gap-4'
            : 'flex flex-col gap-3'
        }
      >
        {availableItems.map((item) => (
          <div key={item.sysCodeSid} className="flex items-center space-x-2">
            <RadioGroupItem value={item.sysCodeSid} id={item.sysCodeSid} />
            <Label
              htmlFor={item.sysCodeSid}
              className="text-sm font-normal cursor-pointer"
            >
              {item.sysCodeName}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  )
}


