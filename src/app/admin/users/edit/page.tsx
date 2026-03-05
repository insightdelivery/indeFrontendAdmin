'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getPublicMember, updatePublicMember, restorePublicMember } from '@/services/publicMembers'
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
import { getSysCodeFromCache, getSysCode, createSysCodeOptions } from '@/lib/syscode'
import type { PublicMemberStatus } from '@/types/publicMember'

const JOINED_VIA_OPTIONS = [
  { value: 'LOCAL', label: '로컬 가입' },
  { value: 'KAKAO', label: '카카오' },
  { value: 'NAVER', label: '네이버' },
  { value: 'GOOGLE', label: '구글' },
]

/** localStorage sysCodeData 키: 직분 */
const POSITION_PARENT = 'SYS26127B006'
/** 지역구분 (국내/해외) */
const REGION_TYPE_PARENT = 'SYS26127B017'
/** 국내 지역 상세 */
const REGION_DOMESTIC_PARENT = 'SYS26127B018'
/** 해외 지역 상세 */
const REGION_FOREIGN_PARENT = 'SYS26127B019'

/** Select "선택" 옵션 value (Radix Select는 빈 문자열 value 미지원) */
const EMPTY_SELECT_VALUE = '__none__'

function toRegionTypeSysCode(apiValue: string | null | undefined): string {
  if (!apiValue) return ''
  if (apiValue === 'DOMESTIC') return 'SYS26127B018'
  if (apiValue === 'FOREIGN') return 'SYS26127B019'
  return apiValue
}

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
  const [regionType, setRegionType] = useState('')
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
  const [positionOptions, setPositionOptions] = useState<{ value: string; label: string }[]>([])
  const [regionTypeOptions, setRegionTypeOptions] = useState<{ value: string; label: string }[]>([])
  const [regionDomesticOptions, setRegionDomesticOptions] = useState<{ value: string; label: string }[]>([])
  const [regionForeignOptions, setRegionForeignOptions] = useState<{ value: string; label: string }[]>([])
  const [memberStatus, setMemberStatus] = useState<PublicMemberStatus | ''>('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawDetailReason, setWithdrawDetailReason] = useState('')
  const [restoring, setRestoring] = useState(false)

  const STATUS_OPTIONS: { value: PublicMemberStatus; label: string }[] = [
    { value: 'ACTIVE', label: '정상' },
    { value: 'WITHDRAW_REQUEST', label: '탈퇴 요청' },
    { value: 'WITHDRAWN', label: '탈퇴' },
  ]

  useEffect(() => {
    const load = async () => {
      const pos = getSysCodeFromCache(POSITION_PARENT) ?? await getSysCode(POSITION_PARENT)
      const rt = getSysCodeFromCache(REGION_TYPE_PARENT) ?? await getSysCode(REGION_TYPE_PARENT)
      const rd = getSysCodeFromCache(REGION_DOMESTIC_PARENT) ?? await getSysCode(REGION_DOMESTIC_PARENT)
      const rf = getSysCodeFromCache(REGION_FOREIGN_PARENT) ?? await getSysCode(REGION_FOREIGN_PARENT)
      setPositionOptions(createSysCodeOptions(pos))
      setRegionTypeOptions(createSysCodeOptions(rt))
      setRegionDomesticOptions(createSysCodeOptions(rd))
      setRegionForeignOptions(createSysCodeOptions(rf))
    }
    load()
  }, [])

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
        setRegionType(toRegionTypeSysCode(data.region_type))
        setRegionDomestic(data.region_domestic ?? '')
        setRegionForeign(data.region_foreign ?? '')
        setJoinedVia(data.joined_via)
        setIsActive(data.is_active)
        setIsStaff(data.is_staff)
        setNewsletterAgree(data.newsletter_agree)
        setEmailVerified(data.email_verified)
        setProfileCompleted(data.profile_completed)
        setMemberStatus('status' in data ? (data.status as PublicMemberStatus) : 'ACTIVE')
        setWithdrawReason(data.withdraw_reason ?? '')
        setWithdrawDetailReason(data.withdraw_detail_reason ?? '')
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
        region_type: regionType === EMPTY_SELECT_VALUE || !regionType ? undefined : regionType,
        region_domestic: regionDomestic.trim() || undefined,
        region_foreign: regionForeign.trim() || undefined,
        joined_via: joinedVia,
        is_active: isActive,
        is_staff: isStaff,
        newsletter_agree: newsletterAgree,
        email_verified: emailVerified,
        profile_completed: profileCompleted,
        status: (memberStatus || 'ACTIVE') as PublicMemberStatus,
        withdraw_reason: withdrawReason.trim() || undefined,
        withdraw_detail_reason: withdrawDetailReason.trim() || undefined,
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

  const handleRestore = async () => {
    if (Number.isNaN(memberSid) || memberStatus !== 'WITHDRAWN') return
    try {
      setRestoring(true)
      await restorePublicMember(memberSid)
      toast({ title: '복구 완료', description: '정상 회원으로 복구되었습니다.', duration: 3000 })
      setMemberStatus('ACTIVE')
      setIsActive(true)
      setWithdrawReason('')
      setWithdrawDetailReason('')
      const data = await getPublicMember(memberSid)
      setEmail(data.email)
      setName(data.name)
      setNickname(data.nickname)
      setPhone(data.phone)
      setIsActive(data.is_active)
      setMemberStatus('status' in data ? (data.status as PublicMemberStatus) : 'ACTIVE')
      setWithdrawReason(data.withdraw_reason ?? '')
      setWithdrawDetailReason(data.withdraw_detail_reason ?? '')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '복구에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setRestoring(false)
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

      {memberStatus === 'WITHDRAWN' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 mb-3">이 회원은 탈퇴 처리된 상태입니다. 정상 회원으로 복구할 수 있습니다.</p>
            <Button
              type="button"
              variant="outline"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? '복구 중...' : '정상 회원으로 복구'}
            </Button>
          </CardContent>
        </Card>
      )}

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
                <Select value={position || EMPTY_SELECT_VALUE} onValueChange={(v) => setPosition(v === EMPTY_SELECT_VALUE ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                    {positionOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <label className="text-sm font-medium text-gray-700 block mb-1">지역 구분</label>
                <Select value={regionType || EMPTY_SELECT_VALUE} onValueChange={(v) => { setRegionType(v === EMPTY_SELECT_VALUE ? '' : v); setRegionDomestic(''); setRegionForeign(''); }}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                    {regionTypeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {regionType === 'SYS26127B018' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">국내 지역</label>
                  <Select value={regionDomestic || EMPTY_SELECT_VALUE} onValueChange={(v) => setRegionDomestic(v === EMPTY_SELECT_VALUE ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                      {regionDomesticOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {regionType === 'SYS26127B019' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">해외 지역</label>
                  <Select value={regionForeign || EMPTY_SELECT_VALUE} onValueChange={(v) => setRegionForeign(v === EMPTY_SELECT_VALUE ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>선택</SelectItem>
                      {regionForeignOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            <Card className="border-amber-200/60 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">회원 상태 및 탈퇴 정보</CardTitle>
                <p className="text-sm text-gray-600 font-normal">상태와 탈퇴 사유를 수정할 수 있습니다.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">회원 상태</label>
                    <Select
                      value={memberStatus || 'ACTIVE'}
                      onValueChange={(v) => setMemberStatus(v as PublicMemberStatus)}
                    >
                      <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">정상 / 탈퇴 요청 / 탈퇴 중 선택</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">탈퇴 사유</label>
                    <Input
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      placeholder="선택 입력"
                      className="max-w-xl"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">탈퇴 상세 사유</label>
                    <Input
                      value={withdrawDetailReason}
                      onChange={(e) => setWithdrawDetailReason(e.target.value)}
                      placeholder="선택 입력"
                      className="max-w-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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
