'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, saveTokens } from '@/services/auth'
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
      saveTokens(response.access_token, response.refresh_token, response.user)
      
      // 로그인 성공 시 시스템 코드 하위 레벨을 localStorage에 저장
      try {
        await loadSysCodeOnLogin('SYS26209B002')  // 아티클 카태고리
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
    <div className="flex min-h-screen items-center justify-center bg-brand-grey">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-5xl font-bold tracking-tight text-neon-yellow mb-2">
            인디 INDE          
          </h2>
          <h3 className="text-center text-2xl font-semibold text-gray-900 mb-2">
            관리자 로그인
          </h3>
          <p className="mt-2 text-center text-sm text-gray-600">
            관리자 계정으로 로그인하세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="memberShipId">회원 ID</Label>
              <Input
                id="memberShipId"
                type="text"
                autoComplete="username"
                {...register('memberShipId')}
                className="mt-1"
              />
              {errors.memberShipId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.memberShipId.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="mt-1"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-neon-yellow text-black hover:bg-opacity-90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-brand-grey">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-yellow mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

