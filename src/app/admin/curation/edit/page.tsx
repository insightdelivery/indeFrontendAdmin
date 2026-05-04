'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function EditCurationRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const idStr = searchParams.get('id') ?? ''
    const n = idStr ? Number.parseInt(idStr, 10) : NaN
    if (idStr && Number.isFinite(n)) {
      router.replace(`/admin/curation?edit=${n}`)
    } else {
      router.replace('/admin/curation')
    }
  }, [router, searchParams])

  return <p className="text-sm text-muted-foreground py-8 text-center">목록으로 이동 중…</p>
}
