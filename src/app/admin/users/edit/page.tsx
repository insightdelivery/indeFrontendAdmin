'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getPublicMember, updatePublicMember } from '@/services/publicMembers'
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

const REGION_NONE = '__none__'
const REGION_OPTIONS = [
  { value: REGION_NONE, label: '선택' },
  { value: 'DOMESTIC', label: '국내' },
  { value: 'FOREIGN', label: '해외' },
]

export default function EditUserPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const memberSid = Number(id)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [birthYear, setBirthYear] = useState<number | ''>('')
  const [birthMonth, setBirthMonth] = useState<number | ''>('')
  const [birthDay, setBirthDay] = useState<number | ''>('')
  const [regionType, setRegionType] = useState(REGION_NONE)
  const [regionDomestic, setRegionDomestic] = useState('')
  const [regionForeign, setRegionForeign] = useState('')
  const [joinedVia, setJoinedVia] = useState('LOCAL')
  const [isActive, setIsActive] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [newsletterAgree, setNewsletterAgree] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (Number.isNaN(memberSid)) {
      setLoading(false)
      return
    }
    getPublicMember(memberSid)
      .then((data) => {
        setEmail(data.email)
        setName(data.name)
        setNickname(data.nickname)
        setPhone(data.phone)
        setPosition(data.position ?? '')
        setBirthYear(data.birth_year ?? '')
        setBirthMonth(data.birth_month ?? '')
        setBirthDay(data.birth_day ?? '')
        setRegionType(data.region_type ?? REGION_NONE)
        setRegionDomestic(data.region_domestic ?? '')
        setRegionForeign(data.region_foreign ?? '')
        setJoinedVia(data.joined_via)
        setIsActive(data.is_active)
        setIsStaff(data.is_staff)
        setNewsletterAgree(data.newsletter_agree)
        setEmailVerified(data.email_verified)
        setProfileCompleted(data.profile_completed)
      })
      .catch((e: any) => {
        toast({
          title: '오류',
          description: e.message || '회원 정보를 불러오는데 실패했습니다.',
          variant: 'destructive',
          duration: 3000,
        })
      })
      .finally(() => setLoading(false))
  }, [memberSid, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number.isNaN(memberSid) || !email.trim() || !name.trim() || !nickname.trim() || !phone.trim()) {
      toast({ title: '입력 오류', description: '이메일, 이름, 닉네임, 연락처를 입력해주세요.', variant: 'destructive', duration: 3000 })
      return
    }
    try {
      setSubmitting(true)
      const body: Parameters<typeof updatePublicMember>[1] = {
        email: email.trim(),
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        position: position.trim() || undefined,
        birth_year: birthYear === '' ? null : Number(birthYear),
        birth_month: birthMonth === '' ? null : Number(birthMonth),
        birth_day: birthDay === '' ? null : Number(birthDay),
        region_type: regionType === REGION_NONE || !regionType ? undefined : regionType,
        region_domestic: regionDomestic.trim() || undefined,
        region_foreign: regionForeign.trim() || undefined,
        joined_via: joinedVia,
        is_active: isActive,
        is_staff: isStaff,
        newsletter_agree: newsletterAgree,
        email_verified: emailVerified,
        profile_completed: profileCompleted,
      }
      if (password.trim()) body.password = password.trim()
      await updatePublicMember(memberSid, body)
      toast({ title: '수정 완료', description: '회원 정보가 수정되었습니다.', duration: 3000 })
      router.push('/admin/users')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '수정에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  if (Number.isNaN(memberSid)) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">회원을 선택해주세요.</p>
        <Link href="/admin/users"><Button variant="outline">목록으로</Button></Link>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">회원 수정</h1>
          <p className="text-gray-600 text-sm">공개 회원 정보를 수정합니다.</p>
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
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">비밀번호 (변경 시에만 입력)</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" minLength={8} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">이름 *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">닉네임 *</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">연락처 *</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">직분</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">출생년도</label>
                <Input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1990" min={1900} max={2100} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">출생월</label>
                <Input type="number" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1" min={1} max={12} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">출생일</label>
                <Input type="number" value={birthDay} onChange={(e) => setBirthDay(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1" min={1} max={31} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">지역 타입</label>
                <Select value={regionType} onValueChange={setRegionType}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {regionType === 'DOMESTIC' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">국내 지역</label>
                  <Input value={regionDomestic} onChange={(e) => setRegionDomestic(e.target.value)} placeholder="서울" />
                </div>
              )}
              {regionType === 'FOREIGN' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">해외 지역</label>
                  <Input value={regionForeign} onChange={(e) => setRegionForeign(e.target.value)} placeholder="미국" />
                </div>
              )}
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
                <Checkbox checked={profileCompleted} onCheckedChange={(v) => setProfileCompleted(!!v)} />
                <span className="text-sm">프로필 완료</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={newsletterAgree} onCheckedChange={(v) => setNewsletterAgree(!!v)} />
                <span className="text-sm">뉴스레터 수신 동의</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-neon-yellow hover:bg-neon-yellow/90 text-black">
                {submitting ? '저장 중...' : '저장'}
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
