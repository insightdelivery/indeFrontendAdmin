'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { HOMEPAGE_DOC_TYPES_ORDERED, type HomepageDocType } from '@/constants/homepageDoc'
import { listHomepageDocs, putHomepageDoc, type HomepageDocPayload } from '@/services/homepageDoc'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Building2, Scale, Shield, Copyright, Save, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/** adminLayoutPlan.md §16.2.1 */
const adminActionBtn = {
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200',
} as const

/** adminLayoutPlan.md §17.2.2 — URL query `tab` 값 */
const TAB_VALUES = ['company', 'terms', 'privacy', 'copyright', 'recommended'] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(v: string | null): v is TabValue {
  return v !== null && (TAB_VALUES as readonly string[]).includes(v)
}

type SingleTabKey = 'company_intro' | 'terms_of_service' | 'privacy_policy'

const TAB_SINGLE: {
  tab: TabValue
  key: SingleTabKey
  label: string
  path: string
  Icon: typeof Building2
}[] = [
  { tab: 'company', key: 'company_intro', label: '회사소개', path: '/about/companyInfo', Icon: Building2 },
  { tab: 'terms', key: 'terms_of_service', label: '이용약관', path: '/terms', Icon: Scale },
  { tab: 'privacy', key: 'privacy_policy', label: '개인정보취급방침', path: '/privacy', Icon: Shield },
]

const COPYRIGHT_TYPES: HomepageDocType[] = ['article_copyright', 'video_copyright', 'seminar_copyright']

const RECOMMENDED_SEARCH_DOC: HomepageDocType = 'recommended_search'

const COPYRIGHT_LABELS: Record<string, string> = {
  article_copyright: '아티클 저작권',
  video_copyright: '비디오 저작권',
  seminar_copyright: '세미나 저작권',
}

const DOC_LABEL: Record<string, string> = {
  company_intro: '회사소개',
  terms_of_service: '이용약관',
  privacy_policy: '개인정보취급방침',
  article_copyright: '아티클 저작권',
  video_copyright: '비디오 저작권',
  seminar_copyright: '세미나 저작권',
  recommended_search: '추천검색어',
}

type FormState = { title: string; bodyHtml: string; isPublished: boolean }

function emptyForm(): FormState {
  return { title: '', bodyHtml: '', isPublished: true }
}

function payloadToForm(d: HomepageDocPayload): FormState {
  return {
    title: d.title ?? '',
    bodyHtml: d.bodyHtml ?? '',
    isPublished: d.isPublished,
  }
}

function copyrightHtmlToPlain(html: string): string {
  const raw = html ?? ''
  if (!raw.trim()) return ''
  if (typeof document === 'undefined') {
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
  }
  const shell = document.createElement('div')
  shell.innerHTML = raw
  shell.querySelectorAll('br').forEach((br) => {
    br.replaceWith(document.createTextNode('\n'))
  })
  return (shell.textContent ?? '').replace(/\u00a0/g, ' ')
}

function copyrightPlainToHtml(text: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  if (!text) return ''
  return esc(text.replace(/\r\n/g, '\n')).replace(/\n/g, '<br />')
}

/** 저작권 3종·추천검색어 — textarea ↔ API는 `<br />` 래핑 (wwwDocEtc.md §5.3·§5.4) */
function isPlainTextBodyDocType(dt: HomepageDocType): boolean {
  return COPYRIGHT_TYPES.includes(dt) || dt === RECOMMENDED_SEARCH_DOC
}

/** adminLayoutPlan.md §17.3 TabsTrigger */
const tabsTriggerClass =
  'inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-black data-[state=active]:border-black data-[state=active]:font-semibold data-[state=active]:text-black rounded-none bg-transparent shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export default function HomepageDocsAdminPage() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabValue = isTabValue(tabParam) ? tabParam : 'company'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, FormState>>(() => {
    const init: Record<string, FormState> = {}
    for (const dt of HOMEPAGE_DOC_TYPES_ORDERED) {
      init[dt] = dt === RECOMMENDED_SEARCH_DOC ? { ...emptyForm(), title: 'search' } : emptyForm()
    }
    return init
  })

  useEffect(() => {
    if (!isTabValue(tabParam)) {
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', 'company')
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    }
  }, [tabParam, pathname, router, searchParams])

  const setTab = useCallback(
    (v: string) => {
      if (!isTabValue(v)) return
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', v)
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const mergeFromServer = useCallback((docs: HomepageDocPayload[]) => {
    setForms((prev) => {
      const next = { ...prev }
      for (const dt of HOMEPAGE_DOC_TYPES_ORDERED) {
        const row = docs.find((d) => d.docType === dt)
        if (row) {
          const base = payloadToForm(row)
          let merged = isPlainTextBodyDocType(dt)
            ? { ...base, bodyHtml: copyrightHtmlToPlain(row.bodyHtml ?? '') }
            : base
          if (dt === RECOMMENDED_SEARCH_DOC) {
            merged = { ...merged, title: 'search' }
          }
          next[dt] = merged
        } else {
          next[dt] =
            next[dt] ??
            (dt === RECOMMENDED_SEARCH_DOC ? { ...emptyForm(), title: 'search' } : emptyForm())
        }
      }
      return next
    })
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const docs = await listHomepageDocs()
      mergeFromServer(docs)
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '목록을 불러오지 못했습니다.',
      })
    } finally {
      setLoading(false)
    }
  }, [mergeFromServer, toast])

  useEffect(() => {
    load()
  }, [load])

  const updateForm = (docType: string, patch: Partial<FormState>) => {
    setForms((prev) => ({
      ...prev,
      [docType]: { ...prev[docType], ...patch },
    }))
  }

  const handleSave = async (docType: HomepageDocType) => {
    const f = forms[docType]
    if (!f) return
    try {
      setSaving(docType)
      const bodyForApi = isPlainTextBodyDocType(docType) ? copyrightPlainToHtml(f.bodyHtml) : f.bodyHtml
      const titleForApi =
        docType === RECOMMENDED_SEARCH_DOC ? 'search' : f.title.trim() ? f.title.trim() : null
      const updated = await putHomepageDoc(docType, {
        title: titleForApi,
        bodyHtml: bodyForApi,
        isPublished: f.isPublished,
      })
      let nextForm = isPlainTextBodyDocType(docType)
        ? { ...payloadToForm(updated), bodyHtml: copyrightHtmlToPlain(updated.bodyHtml ?? '') }
        : payloadToForm(updated)
      if (docType === RECOMMENDED_SEARCH_DOC) {
        nextForm = { ...nextForm, title: 'search' }
      }
      updateForm(docType, nextForm)
      toast({
        title: '저장 완료',
        description: `「${DOC_LABEL[docType] ?? docType}」이(가) 저장되었습니다.`,
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: e instanceof Error ? e.message : '저장에 실패했습니다.',
      })
    } finally {
      setSaving(null)
    }
  }

  const renderSingleDocBody = (docType: HomepageDocType) => {
    const f = forms[docType] ?? emptyForm()
    const meta = TAB_SINGLE.find((t) => t.key === docType)!
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <meta.Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="font-mono text-xs sm:text-sm">{meta.path}</span>
          <span className="text-gray-300">|</span>
          <span>{f.isPublished ? '공개 중' : '비공개'}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`title-${docType}`}>페이지 제목 (선택)</Label>
          <Input
            id={`title-${docType}`}
            value={f.title}
            onChange={(e) => updateForm(docType, { title: e.target.value })}
            placeholder="비우면 www 기본 제목 사용"
            className="max-w-xl"
          />
        </div>

        <div className="space-y-2" aria-label={`${DOC_LABEL[docType] ?? docType} 페이지 편집`}>
          <RichTextEditor value={f.bodyHtml} onChange={(html) => updateForm(docType, { bodyHtml: html })} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50/80 px-4 py-3">
          <Switch
            id={`pub-${docType}`}
            checked={f.isPublished}
            onCheckedChange={(c) => updateForm(docType, { isPublished: c })}
          />
          <div>
            <Label htmlFor={`pub-${docType}`} className="cursor-pointer">
              www에 공개
            </Label>
            <p className="mt-0.5 text-xs text-gray-500">끄면 방문자에게 페이지가 보이지 않습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  const renderCopyrightBlock = (docType: HomepageDocType) => {
    const f = forms[docType] ?? emptyForm()
    return (
      <div
        key={docType}
        className="flex h-full min-w-0 flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="min-w-0">
            <h3 id={`copyright-h-${docType}`} className="text-base font-semibold text-gray-900">
              {COPYRIGHT_LABELS[docType]}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">{f.isPublished ? '공개' : '비공개'}</p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              className={cn(adminActionBtn.green, 'gap-1')}
              onClick={() => handleSave(docType)}
              disabled={!!saving}
            >
              {saving === docType ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4 shrink-0" aria-hidden />
              )}
              저장
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`title-${docType}`}>제목 (선택)</Label>
          <Input
            id={`title-${docType}`}
            value={f.title}
            onChange={(e) => updateForm(docType, { title: e.target.value })}
            className="w-full min-w-0"
            placeholder="비우면 www 기본 제목"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-2">
          <textarea
            id={`body-${docType}`}
            rows={5}
            aria-labelledby={`copyright-h-${docType}`}
            value={f.bodyHtml}
            onChange={(e) => updateForm(docType, { bodyHtml: e.target.value })}
            className={cn(
              'min-h-[6rem] w-full min-w-0 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50/80 px-4 py-3">
          <Switch
            id={`pub-${docType}`}
            checked={f.isPublished}
            onCheckedChange={(c) => updateForm(docType, { isPublished: c })}
          />
          <Label htmlFor={`pub-${docType}`} className="cursor-pointer">
            공개여부
          </Label>
        </div>
      </div>
    )
  }

  const renderRecommendedSearchBlock = () => {
    const docType = RECOMMENDED_SEARCH_DOC
    const f = forms[docType] ?? emptyForm()
    return (
      <div className="flex h-full w-full min-w-0 flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="min-w-0">
            <h3 id="recommended-h" className="text-base font-semibold text-gray-900">
              추천검색어
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              쉼표로 구분해 입력합니다. www 검색 UI에 검색어가 없을 때 하단에 노출될 문구를 입력합니다.
            </p>
            <p className="mt-1 text-xs text-gray-500">{f.isPublished ? '공개' : '비공개'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              className={cn(adminActionBtn.blue, 'gap-1')}
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 shrink-0', loading && 'animate-spin')} aria-hidden />
              새로고침
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(adminActionBtn.green, 'gap-1')}
              onClick={() => handleSave(docType)}
              disabled={!!saving || loading}
            >
              {saving === docType ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4 shrink-0" aria-hidden />
              )}
              저장
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <textarea
            id={`body-${docType}`}
            rows={8}
            aria-labelledby="recommended-h"
            value={f.bodyHtml}
            onChange={(e) => updateForm(docType, { bodyHtml: e.target.value })}
            placeholder="예: 인공지능, 클라우드, 보안"
            className={cn(
              'min-h-[8rem] w-full min-w-0 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50/80 px-4 py-3">
          <Switch
            id={`pub-${docType}`}
            checked={f.isPublished}
            onCheckedChange={(c) => updateForm(docType, { isPublished: c })}
          />
          <Label htmlFor={`pub-${docType}`} className="cursor-pointer">
            공개여부
          </Label>
        </div>
      </div>
    )
  }

  const refreshButton = (
    <Button
      type="button"
      size="sm"
      className={cn(adminActionBtn.blue, 'gap-1')}
      onClick={() => void load()}
      disabled={loading}
    >
      <RefreshCw className={cn('h-4 w-4 shrink-0', loading && 'animate-spin')} aria-hidden />
      새로고침
    </Button>
  )

  const loadingBlock = (
    <p className="py-8 text-center text-sm text-gray-500">불러오는 중…</p>
  )

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">홈페이지 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          회사소개·약관·개인정보·콘텐츠 저작권·추천검색어를 편집합니다. 저작권은 유형별로 각각 저장하고, 추천검색어는 한 블록만
          저장합니다.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList
          className="mb-4 flex h-auto w-full flex-wrap items-center justify-start gap-0 rounded-none border-0 border-b border-gray-200 bg-transparent p-0"
          aria-label="문서 종류"
        >
          {TAB_SINGLE.map((t) => (
            <TabsTrigger key={t.tab} value={t.tab} className={tabsTriggerClass}>
              <t.Icon className="h-4 w-4 text-gray-500" aria-hidden />
              {t.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="copyright" className={tabsTriggerClass}>
            <Copyright className="h-4 w-4 text-gray-500" aria-hidden />
            콘텐츠 저작권
          </TabsTrigger>
          <TabsTrigger value="recommended" className={tabsTriggerClass}>
            <Search className="h-4 w-4 text-gray-500" aria-hidden />
            추천검색어
          </TabsTrigger>
        </TabsList>

        {TAB_SINGLE.map((t) => (
          <TabsContent key={t.tab} value={t.tab} className="mt-0">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{t.label}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="font-mono text-xs text-gray-500">{t.path}</span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {refreshButton}
                  <Button
                    type="button"
                    size="sm"
                    className={cn(adminActionBtn.green, 'gap-1')}
                    onClick={() => handleSave(t.key)}
                    disabled={!!saving || loading}
                  >
                    {saving === t.key ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    저장
                  </Button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {loading ? loadingBlock : renderSingleDocBody(t.key)}
              </div>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="copyright" className="mt-0">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="p-4 sm:p-6">
              {loading ? (
                loadingBlock
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                    {COPYRIGHT_TYPES.map((dt) => renderCopyrightBlock(dt))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommended" className="mt-0 w-full">
          {loading ? loadingBlock : renderRecommendedSearchBlock()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
