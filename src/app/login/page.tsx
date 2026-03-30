'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { login, saveSessionAfterLogin } from '@/services/auth'
import { useToast } from '@/hooks/use-toast'
import { loadSysCodeOnLogin } from '@/lib/syscode'

const loginSchema = z.object({
  memberShipId: z.string().min(1, '회원 ID를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      console.log('로그인 시도:', data)
      const response = await login(data)
      console.log('로그인 성공 응답:', response)
      
      // 토큰 및 사용자 정보 저장
      saveSessionAfterLogin(response.access_token, response.user)
      
      // 로그인 성공 시 시스템 코드 하위 레벨을 localStorage에 저장
      try {
        await loadSysCodeOnLogin('SYS26209B002')  // 아티클 카테고리
        await loadSysCodeOnLogin('SYS26325B002')  // 비디오 카테고리 (videoPlan.md)
        await loadSysCodeOnLogin('SYS26325B003')  // 세미나 카테고리 (seminarPlan.md)
        await loadSysCodeOnLogin('SYS26127B017')  //회원가입 지역
        await loadSysCodeOnLogin('SYS26127B018')  // 회원 가입 지역 국내 
        await loadSysCodeOnLogin('SYS26127B006')  // 직분 코드
        await loadSysCodeOnLogin('SYS26209B020')  // 아티클 발행정보
        await loadSysCodeOnLogin('SYS26209B015')  // 아티클 공개범위설정
      } catch (error) {
        console.error('시스템 코드 로드 실패 (로그인 후):', error)
        // 시스템 코드 로드 실패해도 로그인은 계속 진행
      }
      
      toast({
        title: '로그인 성공',
        description: response.user.memberShipName ? `${response.user.memberShipName}님, 환영합니다!` : '관리자 대시보드로 이동합니다.',
        duration: 3000, // 3초
      })
      
      // 리다이렉트
      const redirect = searchParams.get('redirect') || '/admin'
      router.push(redirect)
    } catch (error: any) {
      console.error('로그인 오류:', error)
      console.error('오류 응답:', error.response?.data)
      
      // 에러 메시지 추출
      let errorMessage = '로그인에 실패했습니다.'
      
      if (error.response?.data?.IndeAPIResponse?.Message) {
        errorMessage = error.response.data.IndeAPIResponse.Message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Toast로 오류 메시지 표시 (우측 상단, 3초)
      toast({
        title: '로그인 실패',
        description: errorMessage,
        variant: 'destructive',
        duration: 3000, // 3초
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-zinc-50/80 to-zinc-100/90 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
            인디 <span className="text-neon-yellow [text-shadow:0_0_1px_rgba(0,0,0,0.15)]">InDe</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">관리자 콘솔</p>
        </div>

        <Card className="border-zinc-200/80 bg-white shadow-xl shadow-zinc-200/60 ring-1 ring-zinc-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-zinc-900">관리자 로그인</CardTitle>
            <CardDescription className="text-zinc-500">
              관리자 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memberShipId" className="text-zinc-700">
                    회원 ID
                  </Label>
                  <Input
                    id="memberShipId"
                    type="text"
                    autoComplete="username"
                    {...register('memberShipId')}
                    className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:ring-neon-yellow/35"
                  />
                  {errors.memberShipId && (
                    <p className="text-sm text-red-600">{errors.memberShipId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-700">
                    비밀번호
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:ring-neon-yellow/35"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-neon-yellow font-semibold text-black shadow-md shadow-zinc-300/80 hover:bg-neon-yellow/90"
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-neon-yellow"
            aria-hidden
          />
          <p className="text-sm text-zinc-500">로딩 중...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

