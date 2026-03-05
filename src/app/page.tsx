'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once on mount
  }, [])
  
  return null
}

