'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  getPublicMember,
  checkPublicMemberEmailDuplicate,
  updatePublicMember,
  restorePublicMember,
  getPublicMemberViews,
  getPublicMemberHighlights,
  deletePublicMemberHighlight,
  getPublicMemberAppliedQuestions,
  getPublicMemberBookmarks,
  deletePublicMemberBookmark,
  getPublicMemberRatings,
} from '@/services/publicMembers'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import type {
  PublicMemberStatus,
  PublicMemberActivityItem,
  PublicMemberHighlightItem,
  PublicMemberAppliedQuestionItem,
  PublicMemberRatingSummary,
} from '@/types/publicMember'

const JOINED_VIA_OPTIONS = [
  { value: 'LOCAL', label: '로컬 가입' },
  { value: 'KAKAO', label: '카카오' },
  { value: 'NAVER', label: '네이버' },
  { value: 'GOOGLE', label: '구글' },
]

const TAB_VALUES = ['user-info', 'library', 'highlights', 'applied-questions', 'bookmarks', 'ratings'] as const
type EditTab = (typeof TAB_VALUES)[number]

const STATUS_OPTIONS: { value: PublicMemberStatus; label: string }[] = [
  { value: 'ACTIVE', label: '정상' },
  { value: 'WITHDRAW_REQUEST', label: '탈퇴 요청' },
  { value: 'WITHDRAWN', label: '탈퇴' },
]

function isEditTab(v: string | null): v is EditTab {
  return v !== null && TAB_VALUES.includes(v as EditTab)
}

type ListState<T> = {
  list: T[]
  total: number
  page: number
  page_size: number
  loading: boolean
  error: string
}

function createListState<T>(pageSize: number): ListState<T> {
  return {
    list: [],
    total: 0,
    page: 1,
    page_size: pageSize,
    loading: false,
    error: '',
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function contentHref(contentType: string, contentCode: string) {
  if (contentType === 'ARTICLE') return `/article/detail?id=${contentCode}`
  if (contentType === 'VIDEO') return `/video/detail?id=${contentCode}`
  if (contentType === 'SEMINAR') return `/seminar/detail?id=${contentCode}`
  return ''
}

function renderStars(value?: number | null) {
  const score = Math.max(0, Math.min(5, Math.round(value ?? 0)))
  return `${'★'.repeat(score)}${'☆'.repeat(5 - score)}`
}

function Pagination({
  total,
  page,
  pageSize,
  onChange,
}: {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
}) {
  const canPrev = page > 1
  const canNext = page * pageSize < total
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-xs text-gray-500">총 {total}건</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onChange(page - 1)}>
          이전
        </Button>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
          다음
        </Button>
      </div>
    </div>
  )
}

export function UserEditTabsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const id = searchParams.get('id') ?? ''
  const tabParam = searchParams.get('tab')
  const tab: EditTab = isEditTab(tabParam) ? tabParam : 'user-info'
  const memberSid = Number(id)

  const [email, setEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [emailCheckLoading, setEmailCheckLoading] = useState(false)
  const [emailCheckMessage, setEmailCheckMessage] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [joinedVia, setJoinedVia] = useState('LOCAL')
  const [isActive, setIsActive] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [newsletterAgree, setNewsletterAgree] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [memberStatus, setMemberStatus] = useState<PublicMemberStatus | ''>('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawDetailReason, setWithdrawDetailReason] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [library, setLibrary] = useState<ListState<PublicMemberActivityItem>>(createListState(9))
  const [highlights, setHighlights] = useState<ListState<PublicMemberHighlightItem>>(createListState(9))
  const [highlightView, setHighlightView] = useState<'date' | 'article'>('date')
  const [applied, setApplied] = useState<ListState<PublicMemberAppliedQuestionItem>>(createListState(9))
  const [bookmarks, setBookmarks] = useState<ListState<PublicMemberActivityItem>>(createListState(9))
  const [ratings, setRatings] = useState<ListState<PublicMemberActivityItem>>(createListState(7))
  const [ratingSort, setRatingSort] = useState('regDateTime_desc')
  const [ratingSummary, setRatingSummary] = useState<PublicMemberRatingSummary>({
    avgRating: 0,
    totalCount: 0,
    distribution: {},
  })
  const loadedTabsRef = useRef<Record<EditTab, boolean>>({
    'user-info': true,
    library: false,
    highlights: false,
    'applied-questions': false,
    bookmarks: false,
    ratings: false,
  })


  const setTab = useCallback(
    (nextTab: EditTab) => {
      if (nextTab === tab) return
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', nextTab)
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams, tab]
  )

  const loadMember = useCallback(async () => {
    if (Number.isNaN(memberSid)) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await getPublicMember(memberSid)
      setEmail(data.email)
      setOriginalEmail((data.email || '').trim().toLowerCase())
      setEmailCheckMessage('')
      setEmailChecked(true)
      setName(data.name)
      setNickname(data.nickname)
      setPhone(data.phone)
      setJoinedVia(data.joined_via)
      setIsActive(data.is_active)
      setIsStaff(data.is_staff)
      setNewsletterAgree(data.newsletter_agree)
      setEmailVerified(data.email_verified)
      setProfileCompleted(data.profile_completed)
      setMemberStatus('status' in data ? (data.status as PublicMemberStatus) : 'ACTIVE')
      setWithdrawReason(data.withdraw_reason ?? '')
      setWithdrawDetailReason(data.withdraw_detail_reason ?? '')
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '회원 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [memberSid, toast])

  const loadLibrary = useCallback(async (nextPage = 1) => {
    if (Number.isNaN(memberSid)) return
    const page = nextPage
    setLibrary((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await getPublicMemberViews(memberSid, { page, page_size: library.page_size })
      setLibrary((prev) => ({ ...prev, ...res, page, loading: false }))
    } catch (e: any) {
      setLibrary((prev) => ({ ...prev, loading: false, error: e.message || '라이브러리 조회 실패' }))
    }
  }, [library.page_size, memberSid])

  const loadHighlights = useCallback(async (nextPage = 1) => {
    if (Number.isNaN(memberSid)) return
    const page = nextPage
    setHighlights((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await getPublicMemberHighlights(memberSid, {
        page,
        page_size: highlights.page_size,
        view: highlightView,
      })
      setHighlights((prev) => ({ ...prev, ...res, page, loading: false }))
    } catch (e: any) {
      setHighlights((prev) => ({ ...prev, loading: false, error: e.message || '하이라이트 조회 실패' }))
    }
  }, [highlightView, highlights.page_size, memberSid])

  const loadApplied = useCallback(async (nextPage = 1) => {
    if (Number.isNaN(memberSid)) return
    const page = nextPage
    setApplied((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await getPublicMemberAppliedQuestions(memberSid, { page, page_size: applied.page_size })
      setApplied((prev) => ({ ...prev, ...res, page, loading: false }))
    } catch (e: any) {
      setApplied((prev) => ({ ...prev, loading: false, error: e.message || '적용질문 조회 실패' }))
    }
  }, [applied.page_size, memberSid])

  const loadBookmarks = useCallback(async (nextPage = 1) => {
    if (Number.isNaN(memberSid)) return
    const page = nextPage
    setBookmarks((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await getPublicMemberBookmarks(memberSid, { page, page_size: bookmarks.page_size })
      setBookmarks((prev) => ({ ...prev, ...res, page, loading: false }))
    } catch (e: any) {
      setBookmarks((prev) => ({ ...prev, loading: false, error: e.message || '북마크 조회 실패' }))
    }
  }, [bookmarks.page_size, memberSid])

  const loadRatings = useCallback(async (nextPage = 1) => {
    if (Number.isNaN(memberSid)) return
    const page = nextPage
    setRatings((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await getPublicMemberRatings(memberSid, {
        page,
        page_size: ratings.page_size,
        sort: ratingSort,
      })
      setRatingSummary(res.summary)
      setRatings((prev) => ({
        ...prev,
        list: res.list,
        total: res.total,
        page: res.page,
        page_size: res.page_size,
        loading: false,
      }))
    } catch (e: any) {
      setRatings((prev) => ({ ...prev, loading: false, error: e.message || '별점 조회 실패' }))
    }
  }, [memberSid, ratingSort, ratings.page_size])


  useEffect(() => {
    if (!isEditTab(tabParam)) {
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', 'user-info')
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    }
  }, [pathname, router, searchParams, tabParam])

  useEffect(() => {
    loadMember()
  }, [loadMember])

  useEffect(() => {
    loadedTabsRef.current = {
      'user-info': true,
      library: false,
      highlights: false,
      'applied-questions': false,
      bookmarks: false,
      ratings: false,
    }
  }, [memberSid])

  useEffect(() => {
    if (loadedTabsRef.current[tab]) return
    if (tab === 'library') void loadLibrary()
    if (tab === 'highlights') void loadHighlights()
    if (tab === 'applied-questions') void loadApplied()
    if (tab === 'bookmarks') void loadBookmarks()
    if (tab === 'ratings') void loadRatings()
    loadedTabsRef.current[tab] = true
  }, [tab, loadApplied, loadBookmarks, loadHighlights, loadLibrary, loadRatings])

  useEffect(() => {
    if (tab === 'highlights') void loadHighlights(1)
  }, [highlightView, loadHighlights, tab])

  useEffect(() => {
    if (tab === 'ratings') void loadRatings(1)
  }, [ratingSort, loadRatings, tab])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number.isNaN(memberSid) || !email.trim() || !name.trim() || !nickname.trim() || !phone.trim()) {
      toast({ title: '입력 오류', description: '이메일, 이름, 닉네임, 연락처를 입력해주세요.', variant: 'destructive' })
      return
    }
    const normalizedEmail = email.trim().toLowerCase()
    const emailChanged = normalizedEmail !== originalEmail
    if (emailChanged && !emailChecked) {
      toast({
        title: '중복 확인 필요',
        description: '이메일 변경 시 중복 확인을 먼저 진행해주세요.',
        variant: 'destructive',
      })
      return
    }
    try {
      setSubmitting(true)
      const body: Parameters<typeof updatePublicMember>[1] = {
        email: email.trim(),
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        position: '',
        birth_year: null,
        birth_month: null,
        birth_day: null,
        region_type: null,
        region_domestic: null,
        region_foreign: null,
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
      toast({ title: '수정 완료', description: '회원 정보가 수정되었습니다.' })
      setPassword('')
      setOriginalEmail(normalizedEmail)
      setEmailChecked(true)
      setEmailCheckMessage('현재 이메일이 저장되었습니다.')
      await loadMember()
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '수정에 실패했습니다.',
        variant: 'destructive',
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
      toast({ title: '복구 완료', description: '정상 회원으로 복구되었습니다.' })
      await loadMember()
    } catch (e: any) {
      toast({
        title: '오류',
        description: e.message || '복구에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500">불러오는 중...</p>
  }

  if (Number.isNaN(memberSid)) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">회원을 선택해주세요.</p>
        <Link href="/admin/users">
          <Button variant="outline">목록으로</Button>
        </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">회원 상세 관리</h1>
          <p className="text-sm text-gray-600">회원정보, 라이브러리, 하이라이트, 적용질문, 북마크, 별점을 관리합니다.</p>
        </div>
      </div>

      {memberStatus === 'WITHDRAWN' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="mb-3 text-sm text-amber-800">이 회원은 탈퇴 처리된 상태입니다. 정상 회원으로 복구할 수 있습니다.</p>
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

      <Tabs value={tab} onValueChange={(v) => isEditTab(v) && setTab(v)} className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="user-info" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">회원수정</TabsTrigger>
          <TabsTrigger value="library" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">라이브러리</TabsTrigger>
          <TabsTrigger value="highlights" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">하이라이트</TabsTrigger>
          <TabsTrigger value="applied-questions" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">적용질문</TabsTrigger>
          <TabsTrigger value="bookmarks" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">북마크</TabsTrigger>
          <TabsTrigger value="ratings" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-black">별점보기</TabsTrigger>
        </TabsList>

        <TabsContent value="user-info">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>회원 정보</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadMember()}
                  disabled={loading}
                >
                  새로고침
                </Button>
                <Link href="/admin/users">
                  <Button type="button" variant="outline" size="sm">목록</Button>
                </Link>
                <Button
                  type="submit"
                  form="user-info-form"
                  disabled={submitting}
                  size="sm"
                  className="bg-black text-white hover:bg-gray-800"
                >
                  {submitting ? '저장 중...' : '저장'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form id="user-info-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">이메일 *</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const next = e.target.value
                          const changed = next.trim().toLowerCase() !== originalEmail
                          setEmail(next)
                          if (changed) {
                            setEmailChecked(false)
                            setEmailCheckMessage('')
                          } else {
                            setEmailChecked(true)
                            setEmailCheckMessage('기존 이메일과 동일합니다.')
                          }
                        }}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={emailCheckLoading || Number.isNaN(memberSid)}
                        onClick={async () => {
                          const normalized = email.trim().toLowerCase()
                          if (!normalized) {
                            toast({ title: '입력 오류', description: '이메일을 입력해주세요.', variant: 'destructive' })
                            return
                          }
                          if (normalized === originalEmail) {
                            setEmailChecked(true)
                            setEmailCheckMessage('기존 이메일과 동일합니다.')
                            return
                          }
                          try {
                            setEmailCheckLoading(true)
                            const res = await checkPublicMemberEmailDuplicate(memberSid, normalized)
                            if (res.isDuplicate) {
                              setEmailChecked(false)
                              setEmailCheckMessage('이미 사용 중인 이메일입니다.')
                            } else {
                              setEmailChecked(true)
                              setEmailCheckMessage('사용 가능한 이메일입니다.')
                            }
                          } catch (err: any) {
                            setEmailChecked(false)
                            setEmailCheckMessage('')
                            toast({
                              title: '오류',
                              description: err.message || '이메일 중복 확인에 실패했습니다.',
                              variant: 'destructive',
                            })
                          } finally {
                            setEmailCheckLoading(false)
                          }
                        }}
                      >
                        {emailCheckLoading ? '확인중...' : '중복확인'}
                      </Button>
                    </div>
                    {emailCheckMessage ? (
                      <p className={`mt-1 text-xs ${emailChecked ? 'text-green-600' : 'text-red-600'}`}>
                        {emailCheckMessage}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">비밀번호 (변경 시에만 입력)</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" minLength={8} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">이름 *</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">닉네임 *</label>
                    <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">연락처 *</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">가입 경로</label>
                    <Select value={joinedVia} onValueChange={setJoinedVia} disabled>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOINED_VIA_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-gray-500">가입 경로는 수정할 수 없습니다.</p>
                  </div>
                </div>

                <Card className="border-amber-200/60 bg-amber-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">회원 상태 및 탈퇴 정보</CardTitle>
                    <p className="text-sm text-gray-600">상태와 탈퇴 사유를 수정할 수 있습니다.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">회원 상태</label>
                        <Select value={memberStatus || 'ACTIVE'} onValueChange={(v) => setMemberStatus(v as PublicMemberStatus)}>
                          <SelectTrigger><SelectValue placeholder="상태 선택" /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">탈퇴 사유</label>
                        <Input value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} placeholder="선택 입력" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">탈퇴 상세 사유</label>
                        <Input value={withdrawDetailReason} onChange={(e) => setWithdrawDetailReason(e.target.value)} placeholder="선택 입력" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2"><Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} /><span className="text-sm">활성</span></label>
                  <label className="flex items-center gap-2"><Checkbox checked={isStaff} onCheckedChange={(v) => setIsStaff(!!v)} /><span className="text-sm">관리자</span></label>
                  <label className="flex items-center gap-2"><Checkbox checked={emailVerified} onCheckedChange={(v) => setEmailVerified(!!v)} /><span className="text-sm">이메일 인증 완료</span></label>
                  <label className="flex items-center gap-2"><Checkbox checked={profileCompleted} onCheckedChange={(v) => setProfileCompleted(!!v)} /><span className="text-sm">프로필 완료</span></label>
                  <label className="flex items-center gap-2"><Checkbox checked={newsletterAgree} onCheckedChange={(v) => setNewsletterAgree(!!v)} /><span className="text-sm">뉴스레터 및 이벤트/혜택 정보 수신동의</span></label>
                </div>

              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          <Card>
            <CardHeader><CardTitle>라이브러리</CardTitle></CardHeader>
            <CardContent>
              {library.loading ? <p className="text-gray-500">불러오는 중...</p> : library.error ? (
                <p className="text-red-600">{library.error}</p>
              ) : library.list.length === 0 ? (
                <p className="text-gray-500">최근 본 콘텐츠가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium">타입</th>
                        <th className="px-3 py-2 text-left font-medium">콘텐츠코드</th>
                        <th className="px-3 py-2 text-left font-medium">제목</th>
                        <th className="px-3 py-2 text-left font-medium">부제</th>
                        <th className="px-3 py-2 text-left font-medium">조회일</th>
                        <th className="px-3 py-2 text-left font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {library.list.map((row, idx) => (
                        <tr key={`${row.contentType}-${row.contentCode}-${idx}`} className="border-b last:border-0">
                          <td className="px-3 py-2">{row.contentType}</td>
                          <td className="px-3 py-2">{row.contentCode}</td>
                          <td className="px-3 py-2">{row.title || '제목 없음'}</td>
                          <td className="px-3 py-2">{row.subtitle || '-'}</td>
                          <td className="px-3 py-2">{formatDateTime(row.regDateTime)}</td>
                          <td className="px-3 py-2">{row.contentMissing ? '삭제됨' : '정상'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination total={library.total} page={library.page} pageSize={library.page_size} onChange={(p) => void loadLibrary(p)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>하이라이트</CardTitle>
              <Select value={highlightView} onValueChange={(v) => setHighlightView(v as 'date' | 'article')}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">날짜별</SelectItem>
                  <SelectItem value="article">아티클별</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {highlights.loading ? <p className="text-gray-500">불러오는 중...</p> : highlights.error ? (
                <p className="text-red-600">{highlights.error}</p>
              ) : highlights.list.length === 0 ? (
                <p className="text-gray-500">하이라이트한 콘텐츠가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {highlights.list.map((row) => (
                    <div key={row.highlightGroupId} className="flex items-start justify-between rounded border p-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</div>
                        <div className="font-medium">{row.articleTitle || `아티클 #${row.articleId}`}</div>
                        <p className="text-sm text-gray-600">{row.highlightText}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await deletePublicMemberHighlight(memberSid, row.highlightGroupId)
                            toast({ title: '삭제 완료', description: '하이라이트가 삭제되었습니다.' })
                            await loadHighlights(highlights.page)
                          } catch (e: any) {
                            toast({ title: '오류', description: e.message || '삭제 실패', variant: 'destructive' })
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Pagination total={highlights.total} page={highlights.page} pageSize={highlights.page_size} onChange={(p) => void loadHighlights(p)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applied-questions">
          <Card>
            <CardHeader><CardTitle>적용질문</CardTitle></CardHeader>
            <CardContent>
              {applied.loading ? <p className="text-gray-500">불러오는 중...</p> : applied.error ? (
                <p className="text-red-600">{applied.error}</p>
              ) : applied.list.length === 0 ? (
                <p className="text-gray-500">적용질문에 답변있는 콘텐츠가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {applied.list.map((row) => (
                    <div key={`${row.contentType}-${row.contentId}`} className="rounded border p-3">
                      <div className="text-xs text-gray-500">{row.contentTypeLabel || row.contentType} · 답변 {row.answerCount ?? 0}건</div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-sm text-gray-600">{row.subtitle || '-'}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(row.lastAnsweredAt)}</div>
                      <div className="mt-2 space-y-2">
                        {(row.qaList ?? []).length === 0 ? (
                          <p className="text-xs text-gray-500">질문/답변 내역 없음</p>
                        ) : (
                          row.qaList?.map((qa) => (
                            <div key={`${qa.answerId}`} className="rounded bg-gray-50 p-2 text-xs">
                              <p><span className="font-semibold">질문:</span> {qa.questionText}</p>
                              <p className="mt-1"><span className="font-semibold">답변:</span> {qa.answerText}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination total={applied.total} page={applied.page} pageSize={applied.page_size} onChange={(p) => void loadApplied(p)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks">
          <Card>
            <CardHeader><CardTitle>북마크</CardTitle></CardHeader>
            <CardContent>
              {bookmarks.loading ? <p className="text-gray-500">불러오는 중...</p> : bookmarks.error ? (
                <p className="text-red-600">{bookmarks.error}</p>
              ) : bookmarks.list.length === 0 ? (
                <p className="text-gray-500">북마크한 콘텐츠가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium">타입</th>
                        <th className="px-3 py-2 text-left font-medium">콘텐츠코드</th>
                        <th className="px-3 py-2 text-left font-medium">제목</th>
                        <th className="px-3 py-2 text-left font-medium">부제</th>
                        <th className="px-3 py-2 text-left font-medium">북마크일</th>
                        <th className="px-3 py-2 text-left font-medium">상태</th>
                        <th className="px-3 py-2 text-left font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookmarks.list.map((row, idx) => (
                        <tr key={`${row.contentType}-${row.contentCode}-${idx}`} className="border-b last:border-0">
                          <td className="px-3 py-2">{row.contentType}</td>
                          <td className="px-3 py-2">{row.contentCode}</td>
                          <td className="px-3 py-2">{row.title || '제목 없음'}</td>
                          <td className="px-3 py-2">{row.subtitle || '-'}</td>
                          <td className="px-3 py-2">{formatDateTime(row.regDateTime)}</td>
                          <td className="px-3 py-2">{row.contentMissing ? '삭제됨' : '정상'}</td>
                          <td className="px-3 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await deletePublicMemberBookmark(memberSid, row.contentType, row.contentCode)
                                  toast({ title: '해제 완료', description: '북마크가 해제되었습니다.' })
                                  await loadBookmarks(bookmarks.page)
                                } catch (e: any) {
                                  toast({ title: '오류', description: e.message || '해제 실패', variant: 'destructive' })
                                }
                              }}
                            >
                              해제
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination total={bookmarks.total} page={bookmarks.page} pageSize={bookmarks.page_size} onChange={(p) => void loadBookmarks(p)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>별점 요약</CardTitle>
                <Select value={ratingSort} onValueChange={setRatingSort}>
                  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regDateTime_desc">최신순</SelectItem>
                    <SelectItem value="rating_desc">별점 높은순</SelectItem>
                    <SelectItem value="rating_asc">별점 낮은순</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-xs text-gray-500">평균</p><p className="text-xl font-bold">{ratingSummary.avgRating.toFixed(1)}</p></div>
                <div><p className="text-xs text-gray-500">총 개수</p><p className="text-xl font-bold">{ratingSummary.totalCount}</p></div>
                <div><p className="text-xs text-gray-500">5점</p><p className="text-xl font-bold">{ratingSummary.distribution['5'] ?? 0}</p></div>
                <div><p className="text-xs text-gray-500">1점</p><p className="text-xl font-bold">{ratingSummary.distribution['1'] ?? 0}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>별점 목록</CardTitle></CardHeader>
              <CardContent>
                {ratings.loading ? <p className="text-gray-500">불러오는 중...</p> : ratings.error ? (
                  <p className="text-red-600">{ratings.error}</p>
                ) : ratings.list.length === 0 ? (
                  <p className="text-gray-500">남긴 별점이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto rounded border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium">타입</th>
                          <th className="px-3 py-2 text-left font-medium">콘텐츠코드</th>
                          <th className="px-3 py-2 text-left font-medium">제목</th>
                          <th className="px-3 py-2 text-left font-medium">부제</th>
                          <th className="px-3 py-2 text-left font-medium">별점</th>
                          <th className="px-3 py-2 text-left font-medium">평가일</th>
                          <th className="px-3 py-2 text-left font-medium">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ratings.list.map((row, idx) => (
                          <tr key={`${row.contentType}-${row.contentCode}-${idx}`} className="border-b last:border-0">
                            <td className="px-3 py-2">{row.contentType}</td>
                            <td className="px-3 py-2">{row.contentCode}</td>
                            <td className="px-3 py-2">{row.title || '제목 없음'}</td>
                            <td className="px-3 py-2">{row.subtitle || '-'}</td>
                            <td className="px-3 py-2">{renderStars(row.ratingValue)} ({row.ratingValue ?? 0})</td>
                            <td className="px-3 py-2">{formatDateTime(row.regDateTime)}</td>
                            <td className="px-3 py-2">{row.contentMissing ? '삭제됨' : '정상'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination total={ratings.total} page={ratings.page} pageSize={ratings.page_size} onChange={(p) => void loadRatings(p)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
