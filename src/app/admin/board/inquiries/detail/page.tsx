'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import InquiryDetailClient from './InquiryDetailClient'

export default function InquiryDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  if (!id) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">문의를 선택해주세요.</p>
        <Link href="/admin/board/inquiries">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return <InquiryDetailClient id={id} />
}
