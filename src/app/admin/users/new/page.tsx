'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPublicMember } from '@/services/publicMembers'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

const JOINED_VIA_OPTIONS = [
  { value: 'LOCAL', label: '로컬 가입' },
  { value: 'KAKAO', label: '카카오' },
  { value: 'NAVER', label: '네이버' },
  { value: 'GOOGLE', label: '구글' },
]

export default function NewUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [joinedVia, setJoinedVia] = useState('LOCAL')
  const [isActive, setIsActive] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [newsletterAgree, setNewsletterAgree] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !name.trim() || !nickname.trim() || !phone.trim()) {
      toast({ title: '입력 오류', description: '이메일, 이름, 닉네임, 연락처를 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    if (!password || password.length < 8) {
      toast({ title: '입력 오류', description: '비밀번호는 8자 이상 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    try {
      setSubmitting(true)
      await createPublicMember({
        email: email.trim(),
        password,
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        position: position.trim() || undefined,
        joined_via: joinedVia,
        is_active: isActive,
        is_staff: isStaff,
        newsletter_agree: newsletterAgree,
        email_verified: emailVerified,
        profile_completed: true,
      })
      toast({ title: '등록 완료', description: '회원이 등록되었습니다.', duration: 3000 })
      router.push('/admin/users')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '등록에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원 등록</h1>
          <p className="text-gray-600 text-sm">새 공개 회원을 등록합니다.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>회원 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">이메일 *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">비밀번호 (8자 이상) *</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" minLength={8} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">이름 *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">닉네임 *</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">연락처 *</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">직분</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="직분" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">가입 경로</label>
                <Select value={joinedVia} onValueChange={setJoinedVia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOINED_VIA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                <span className="text-sm">활성</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={isStaff} onCheckedChange={(v) => setIsStaff(!!v)} />
                <span className="text-sm">관리자</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={emailVerified} onCheckedChange={(v) => setEmailVerified(!!v)} />
                <span className="text-sm">이메일 인증 완료</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={newsletterAgree} onCheckedChange={(v) => setNewsletterAgree(!!v)} />
                <span className="text-sm">뉴스레터 수신 동의</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
                {submitting ? '등록 중...' : '등록'}
              </Button>
              <Link href="/admin/users">
                <Button type="button" variant="outline">취소</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
