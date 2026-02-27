'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import EditNoticeClient from './EditNoticeClient'

export default function EditNoticePage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  if (!id) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">수정할 공지를 선택해주세요.</p>
        <Link href="/admin/board/notices">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return <EditNoticeClient id={id} />
}
