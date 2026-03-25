'use client'

import { useCallback, useEffect, useState } from 'react'
import { HOMEPAGE_DOC_TYPES_ORDERED, type HomepageDocType } from '@/constants/homepageDoc'
import { listHomepageDocs, putHomepageDoc, type HomepageDocPayload } from '@/services/homepageDoc'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Building2, Scale, Shield, Copyright, Save, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type SingleTabKey = 'company_intro' | 'terms_of_service' | 'privacy_policy'

const TAB_SINGLE: {
  key: SingleTabKey
  label: string
  path: string
  Icon: typeof Building2
}[] = [
  { key: 'company_intro', label: '회사소개', path: '/about/companyInfo', Icon: Building2 },
  { key: 'terms_of_service', label: '이용약관', path: '/terms', Icon: Scale },
  { key: 'privacy_policy', label: '개인정보취급방침', path: '/privacy', Icon: Shield },
]

const COPYRIGHT_TYPES: HomepageDocType[] = [
  'article_copyright',
  'video_copyright',
  'seminar_copyright',
]

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

export default function HomepageDocsAdminPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SingleTabKey | 'copyright'>('company_intro')
  const [forms, setForms] = useState<Record<string, FormState>>(() => {
    const init: Record<string, FormState> = {}
    for (const dt of HOMEPAGE_DOC_TYPES_ORDERED) {
      init[dt] = emptyForm()
    }
    return init
  })

  const mergeFromServer = useCallback((docs: HomepageDocPayload[]) => {
    setForms((prev) => {
      const next = { ...prev }
      for (const dt of HOMEPAGE_DOC_TYPES_ORDERED) {
        const row = docs.find((d) => d.docType === dt)
        next[dt] = row ? payloadToForm(row) : next[dt] ?? emptyForm()
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
      const updated = await putHomepageDoc(docType, {
        title: f.title.trim() ? f.title.trim() : null,
        bodyHtml: f.bodyHtml,
        isPublished: f.isPublished,
      })
      updateForm(docType, payloadToForm(updated))
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

  const activeLabel =
    activeTab === 'copyright'
      ? '콘텐츠 저작권 (3건)'
      : TAB_SINGLE.find((t) => t.key === activeTab)?.label ?? ''

  const activePath =
    activeTab === 'copyright' ? null : TAB_SINGLE.find((t) => t.key === activeTab)?.path ?? null

  const renderSingleTab = (docType: HomepageDocType) => {
    const f = forms[docType] ?? emptyForm()
    const meta = TAB_SINGLE.find((t) => t.key === docType)!
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <meta.Icon className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
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
            <p className="text-xs text-gray-500 mt-0.5">끄면 방문자에게 페이지가 보이지 않습니다.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>본문</Label>
          <p className="text-xs text-gray-500">이미지는 저장 시 서버에서 S3로 처리됩니다.</p>
          <RichTextEditor value={f.bodyHtml} onChange={(html) => updateForm(docType, { bodyHtml: html })} />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
          <Button type="button" onClick={() => handleSave(docType)} disabled={!!saving}>
            {saving === docType ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4 mr-2" aria-hidden />
            )}
            저장
          </Button>
        </div>
      </div>
    )
  }

  const renderCopyrightBlock = (docType: HomepageDocType) => {
    const f = forms[docType] ?? emptyForm()
    return (
      <div
        key={docType}
        className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <h3 className="text-base font-semibold text-gray-900">{COPYRIGHT_LABELS[docType]}</h3>
          <span className="text-xs text-gray-500">{f.isPublished ? '공개' : '비공개'}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`title-${docType}`}>제목 (선택)</Label>
          <Input
            id={`title-${docType}`}
            value={f.title}
            onChange={(e) => updateForm(docType, { title: e.target.value })}
            className="max-w-xl"
            placeholder="비우면 www 기본 제목"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50/80 px-4 py-3">
          <Switch
            id={`pub-${docType}`}
            checked={f.isPublished}
            onCheckedChange={(c) => updateForm(docType, { isPublished: c })}
          />
          <Label htmlFor={`pub-${docType}`} className="cursor-pointer">
            www API로 공개
          </Label>
        </div>

        <RichTextEditor value={f.bodyHtml} onChange={(html) => updateForm(docType, { bodyHtml: html })} />

        <div className="border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => handleSave(docType)} disabled={!!saving}>
            {saving === docType ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4 mr-2" aria-hidden />
            )}
            이 영역만 저장
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">홈페이지 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            회사소개·약관·개인정보 및 콘텐츠 저작권 문구를 편집합니다. 저작권은 유형별로 각각 저장합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <CardTitle className="text-lg">문서 편집</CardTitle>
              <CardDescription className="mt-1">
                {activeLabel}
                {activePath ? (
                  <>
                    {' '}
                    · <span className="font-mono text-xs">{activePath}</span>
                  </>
                ) : null}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="문서 종류">
            {TAB_SINGLE.map((t) => {
              const active = activeTab === t.key
              return (
                <Button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  variant={active ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(t.key)}
                  className="gap-1.5"
                >
                  <t.Icon className="h-4 w-4 text-gray-500" aria-hidden />
                  {t.label}
                </Button>
              )
            })}
            <Button
              type="button"
              role="tab"
              aria-selected={activeTab === 'copyright'}
              variant={activeTab === 'copyright' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('copyright')}
              className="gap-1.5"
            >
              <Copyright className="h-4 w-4 text-gray-500" aria-hidden />
              콘텐츠 저작권
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">불러오는 중…</p>
          ) : activeTab === 'copyright' ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
                아티클·비디오·세미나 저작권은{' '}
                <strong className="font-medium text-gray-800">각각 저장 버튼</strong>으로 반영됩니다. 한 번에 합쳐 저장되지
                않습니다.
              </p>
              <div className="space-y-4">{COPYRIGHT_TYPES.map((dt) => renderCopyrightBlock(dt))}</div>
            </div>
          ) : (
            renderSingleTab(activeTab)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
