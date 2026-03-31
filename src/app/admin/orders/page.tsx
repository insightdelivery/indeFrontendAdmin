'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { getUserInfo } from '@/services/auth'
import { canReadMenuCode, MenuCodes } from '@/lib/adminMenuCodes'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function AdminOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const user = getUserInfo()
    if (!canReadMenuCode(user, MenuCodes.PAYMENT)) {
      toast({
        title: '접근 불가',
        description: '결제 관리 메뉴 권한이 없습니다.',
        variant: 'destructive',
      })
      router.replace('/admin')
      return
    }
    setAllowed(true)
  }, [router, toast])

  if (allowed !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        권한 확인 중…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">결제 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">주문·결제 화면은 추후 연동 예정입니다.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-lg">준비 중</CardTitle>
          </div>
          <CardDescription>
            결제·주문 기능 연동 전까지 플레이스홀더 페이지입니다. 접근은 메뉴 권한(결제 관리)으로 제한됩니다.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
