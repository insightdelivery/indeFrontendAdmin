'use client'

/**
 * 작성자 등록
 * - 프로필 이미지: 직접 업로드 → S3 (3MB 이하, 정사각형 500px 이하)
 * - 연결 관리자: 관리자 목록 SelectBox에서 1명 선택 또는 미연결
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  createAuthor,
  uploadProfileImage,
  validateProfileImageFile,
  type ContentAuthorCreateRequest,
  type AuthorRole,
  type AuthorStatus,
  type ContentTypeOption,
} from '@/features/contentAuthor'
import { getAdminList, type AdminMember } from '@/services/admin'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Upload, X, User, ImageIcon, Link2, LayoutGrid } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  profile_image: z.string().optional(),
  role: z.enum(['DIRECTOR', 'EDITOR']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  member_ship_sid: z.string().optional(),
  content_types: z.array(z.enum(['ARTICLE', 'VIDEO', 'SEMINAR'])).optional(),
})

type FormData = z.infer<typeof schema>

const MEMBER_SHIP_NONE = '__none__'

const ROLE_OPTIONS: { value: AuthorRole; label: string }[] = [
  { value: 'DIRECTOR', label: '디렉터' },
  { value: 'EDITOR', label: '에디터' },
]
const STATUS_OPTIONS: { value: AuthorStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]
const CONTENT_TYPE_OPTIONS: { value: ContentTypeOption; label: string }[] = [
  { value: 'ARTICLE', label: '아티클' },
  { value: 'VIDEO', label: '비디오' },
  { value: 'SEMINAR', label: '세미나' },
]

export default function ContentAuthorNewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [adminList, setAdminList] = useState<AdminMember[]>([])
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'EDITOR',
      status: 'ACTIVE',
      member_ship_sid: MEMBER_SHIP_NONE,
      content_types: [],
    },
  })

  const memberShipSid = watch('member_ship_sid')
  const contentTypes = watch('content_types') ?? []
  const role = watch('role')
  const status = watch('status')

  useEffect(() => {
    getAdminList()
      .then(setAdminList)
      .catch(() => setAdminList([]))
  }, [])

  const toggleContentType = (value: ContentTypeOption) => {
    const next = contentTypes.includes(value) ? contentTypes.filter((c) => c !== value) : [...contentTypes, value]
    setValue('content_types', next)
  }

  const onProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await validateProfileImageFile(file)
    if (!result.valid) {
      toast({ title: '프로필 이미지', description: result.error, variant: 'destructive' })
      e.target.value = ''
      return
    }
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl)
    setProfileImageFile(file)
    setProfilePreviewUrl(URL.createObjectURL(file))
    setValue('profile_image', '')
  }

  const clearProfileImage = () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl)
    setProfileImageFile(null)
    setProfilePreviewUrl(null)
    setValue('profile_image', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true)
      let profileImageUrl: string | undefined
      if (profileImageFile) {
        profileImageUrl = await uploadProfileImage(profileImageFile)
      } else if (data.profile_image) {
        profileImageUrl = data.profile_image
      }
      const payload: ContentAuthorCreateRequest = {
        name: data.name,
        profile_image: profileImageUrl,
        role: data.role,
        status: data.status,
        member_ship_sid: (data.member_ship_sid && data.member_ship_sid !== MEMBER_SHIP_NONE) ? data.member_ship_sid : null,
        content_types: data.content_types?.length ? data.content_types : [],
      }
      await createAuthor(payload)
      toast({ title: '성공', description: '저자가 등록되었습니다.' })
      router.push('/admin/contentAuthor')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '저자 등록에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* 페이지 헤더 */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Link href="/admin/contentAuthor">
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="목록으로">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">작성자 등록</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              콘텐츠 저자(에디터/디렉터)를 등록합니다. 프로필 이미지와 연결 관리자를 선택할 수 있습니다.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              기본 정보
            </CardTitle>
            <CardDescription>저자 이름과 역할, 상태를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="저자 이름을 입력하세요"
                className="max-w-md"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* 역할 / 상태 한 줄 */}
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium">역할</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setValue('role', v as AuthorRole)}
                  className="flex gap-6"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`role-${opt.value}`} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">상태</Label>
                <RadioGroup
                  value={status}
                  onValueChange={(v) => setValue('status', v as AuthorStatus)}
                  className="flex gap-6"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`status-${opt.value}`} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 담당 콘텐츠 유형 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              담당 콘텐츠 유형
            </CardTitle>
            <CardDescription>
              이 저자가 담당할 콘텐츠 유형을 하나 이상 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    checked={contentTypes.includes(opt.value)}
                    onCheckedChange={() => toggleContentType(opt.value)}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* 프로필 이미지 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              프로필 이미지
            </CardTitle>
            <CardDescription>
              정사각형 이미지, 한 변 500px 이하, 3MB 이하 (JPEG, PNG, GIF, WebP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={onProfileFileChange}
            />
            {profilePreviewUrl ? (
              <div className="flex flex-wrap items-start gap-6">
                <div className="relative shrink-0">
                  <div className="overflow-hidden rounded-lg border-2 border-border bg-muted/30 shadow-sm ring-1 ring-black/5">
                    <Image
                      src={profilePreviewUrl}
                      alt="프로필 미리보기"
                      width={160}
                      height={160}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-8 w-8 rounded-full shadow-md"
                    onClick={clearProfileImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <p className="text-sm text-muted-foreground">선택된 이미지가 표시됩니다.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    이미지 변경
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-8 py-12 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">클릭하여 이미지 선택</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">3MB 이하 · 정사각형 · 500px 이하</p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        {/* 연결 관리자 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              연결 관리자
            </CardTitle>
            <CardDescription>
              이 저자와 연결할 관리자 계정을 선택하세요. 선택하지 않으면 미연결로 등록됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-2">
              <Label htmlFor="member_ship_sid" className="text-sm font-medium">
                관리자 선택
              </Label>
              <Select value={memberShipSid ?? MEMBER_SHIP_NONE} onValueChange={(v) => setValue('member_ship_sid', v)}>
                <SelectTrigger id="member_ship_sid">
                  <SelectValue placeholder="미연결" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MEMBER_SHIP_NONE}>미연결</SelectItem>
                  {adminList.map((admin) => (
                    <SelectItem key={admin.memberShipSid} value={admin.memberShipSid}>
                      {admin.memberShipName} ({admin.memberShipId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>



        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-3 border-t pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          <Link href="/admin/contentAuthor">
            <Button type="button" variant="outline">목록으로</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
