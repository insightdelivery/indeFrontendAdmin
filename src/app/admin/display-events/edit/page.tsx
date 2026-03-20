'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import DisplayEventForm from '../DisplayEventForm'

export default function EditDisplayEventPage() {
  const searchParams = useSearchParams()
  const idStr = searchParams.get('id') ?? ''
  const eventId = idStr ? Number.parseInt(idStr, 10) : NaN

  if (!idStr || !Number.isFinite(eventId)) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-red-600">잘못된 ID이거나 누락되었습니다.</p>
        <Link href="/admin/display-events">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return <DisplayEventForm eventId={eventId} />
}
