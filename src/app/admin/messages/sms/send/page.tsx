'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleUserRound, Info, ExternalLink, X } from 'lucide-react'
import {
  createKakaoTemplate,
  createMessageBatch,
  createMessageTemplate,
  deleteKakaoTemplate,
  deleteMessageTemplate,
  getAligoRemain,
  getKakaoTemplates,
  getMessageTemplates,
  getSenderNumbers,
  updateKakaoTemplate,
  updateMessageTemplate,
  type KakaoTemplate,
  type MessageTemplate,
} from '@/services/messages'
import { getPublicMemberList, type PublicMemberRecipientScope } from '@/services/publicMembers'
import type { PublicMemberListItem } from '@/types/publicMember'
import { Input } from '@/components/ui/input'

type SendType = 'sms' | 'kakao'
type Contact = {
  id: number
  name: string
  nickname: string
  email: string
  phone: string
  status: 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN'
}

const PERSONALIZE_PLACEHOLDER = '{개인화변수추가}'

/** 회원 검색 모달: API 한 페이지당 건수 (백엔드 max_page_size 이하) */
const MEMBER_MODAL_PAGE_SIZE = 100
/** 받는 사람 칩 미리보기 최대 개수(만 단위 선택 시 DOM 과다 방지) */
const RECIPIENT_CHIP_PREVIEW = 20
/** 검색 전체 로드 시 API page_size (백엔드 max_page_size 이하) */
const MEMBER_FETCH_ALL_PAGE_SIZE = 250

function getByteLength(v: string): number {
  let n = 0
  for (const ch of v) {
    n += ch.charCodeAt(0) > 127 ? 2 : 1
  }
  return n
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function mapListItemToContact(m: PublicMemberListItem): Contact {
  return {
    id: m.member_sid,
    name: m.name || m.nickname || `회원#${m.member_sid}`,
    nickname: (m.nickname || '').trim(),
    email: m.email || '',
    phone: normalizePhone(m.phone || ''),
    status: m.status || (m.is_active ? 'ACTIVE' : 'WITHDRAWN'),
  }
}

/** `{키}` 형태 — SMS·카카오 공통, 수신자(Contact) 기준 치환 (알림톡 템플릿 본문과 동일 규칙). */
function applyPersonalizationPlaceholders(text: string, c: Contact): string {
  const idStr = String(c.id)
  const map: Record<string, string> = {
    이름: c.name,
    닉네임: (c.nickname || c.name).trim(),
    아이디: idStr,
    회원번호: idStr,
    핸드폰번호: c.phone,
    휴대폰번호: c.phone,
    이메일: c.email,
    이메일주소: c.email,
  }
  let out = text
  for (const [key, value] of Object.entries(map)) {
    out = out.split(`{${key}}`).join(value)
    out = out.split(`#{${key}}#`).join(value)
  }
  return out
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInputValue(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function hhmmToMinutes(value: string): number {
  if (!value || !value.includes(':')) return -1
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return -1
  return h * 60 + m
}

export default function SmsKakaoSendPage() {
  const [sendType, setSendType] = useState<SendType>('sms')
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false)
  const [contactKeyword, setContactKeyword] = useState('')
  /** API `search`에 넘기는 값(입력 디바운스) */
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /** 마지막으로「검색 전체」에 넣은 발송 가능 회원 id — 해제 시 이 집합만 제거 */
  const [cachedFullSearchValidIds, setCachedFullSearchValidIds] = useState<number[] | null>(null)
  const [bulkSelectLoading, setBulkSelectLoading] = useState(false)
  const [memberSearchScope, setMemberSearchScope] = useState<PublicMemberRecipientScope>('all')
  const [joinDateFrom, setJoinDateFrom] = useState('')
  const [joinDateTo, setJoinDateTo] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [memberListPage, setMemberListPage] = useState(1)
  const [memberListTotalCount, setMemberListTotalCount] = useState(0)
  const [memberListHasNext, setMemberListHasNext] = useState(false)
  /** 모달 내 선택: 페이지 이동 후에도 확정 시 상세를 잃지 않도록 id → Contact */
  const [modalRecipientById, setModalRecipientById] = useState<Record<number, Contact>>({})
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [senderPhone, setSenderPhone] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [template, setTemplate] = useState('')
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [editorTemplateId, setEditorTemplateId] = useState<number | null>(null)
  const [editorTemplateName, setEditorTemplateName] = useState('')
  const [editorTemplateContent, setEditorTemplateContent] = useState('')
  const [editorTemplateCode, setEditorTemplateCode] = useState('')
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [senderNumbers, setSenderNumbers] = useState<string[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [kakaoTemplates, setKakaoTemplates] = useState<KakaoTemplate[]>([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [remainSmsCnt, setRemainSmsCnt] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [variableValue, setVariableValue] = useState(PERSONALIZE_PLACEHOLDER)
  const minScheduleDate = new Date(currentTime.getTime() + 10 * 60 * 1000)
  const minDate = toDateInputValue(minScheduleDate)
  const minTime = scheduledDate === minDate ? toTimeInputValue(minScheduleDate) : undefined

  useEffect(() => {
    if (!isScheduled) return
    const id = window.setInterval(() => setCurrentTime(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [isScheduled])

  useEffect(() => {
    if (!isScheduled || !scheduledDate || !minTime || scheduledDate !== minDate) return
    if (scheduledTime && scheduledTime < minTime) {
      setScheduledTime(minTime)
    }
  }, [isScheduled, scheduledDate, scheduledTime, minDate, minTime])

  const messageByte = useMemo(() => getByteLength(message), [message])
  const messageClass = messageByte <= 90 ? 'SMS' : 'LMS'

  useEffect(() => {
    const loadSenderNumbers = async () => {
      try {
        const data = await getSenderNumbers()
        const values = data.map((v) => v.sender_number)
        setSenderNumbers(values)
        setSenderPhone((prev) => (prev || values[0] || ''))
      } catch {
        setSenderNumbers([])
      }
    }
    void loadSenderNumbers()
  }, [])

  useEffect(() => {
    const loadRemain = async () => {
      try {
        const data = await getAligoRemain()
        setRemainSmsCnt(data.sms_cnt)
      } catch {
        setRemainSmsCnt(null)
      }
    }
    void loadRemain()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(contactKeyword.trim()), 400)
    return () => window.clearTimeout(t)
  }, [contactKeyword])

  const buildMemberListParams = useCallback(
    (page: number, pageSize: number): Parameters<typeof getPublicMemberList>[0] | null => {
      const params: Parameters<typeof getPublicMemberList>[0] = {
        page,
        page_size: pageSize,
        recipient_scope: memberSearchScope,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (memberSearchScope === 'join_date') {
        if (!joinDateFrom.trim() || !joinDateTo.trim()) return null
        params.join_date_from = joinDateFrom.trim()
        params.join_date_to = joinDateTo.trim()
      }
      return params
    },
    [memberSearchScope, joinDateFrom, joinDateTo, debouncedSearch]
  )

  const loadContacts = useCallback(async () => {
    const params = buildMemberListParams(memberListPage, MEMBER_MODAL_PAGE_SIZE)
    if (params === null) {
      setContacts([])
      setMemberListTotalCount(0)
      setMemberListHasNext(false)
      return
    }
    try {
      setContactsLoading(true)
      const response = await getPublicMemberList(params)
      setMemberListTotalCount(typeof response.count === 'number' ? response.count : response.results.length)
      setMemberListHasNext(Boolean(response.next))
      const nextContacts: Contact[] = response.results.map(mapListItemToContact)
      setContacts(nextContacts)
    } catch {
      setContacts([])
      setMemberListTotalCount(0)
      setMemberListHasNext(false)
    } finally {
      setContactsLoading(false)
    }
  }, [buildMemberListParams, memberListPage])

  useEffect(() => {
    if (!contactModalOpen) return
    void loadContacts()
  }, [contactModalOpen, loadContacts])

  useEffect(() => {
    setMemberListPage(1)
    setCachedFullSearchValidIds(null)
  }, [memberSearchScope, joinDateFrom, joinDateTo, debouncedSearch])

  const loadChannelTemplates = async (channel: SendType) => {
    try {
      setTemplateLoading(true)
      if (channel === 'sms') {
        const data = await getMessageTemplates({ channel: 'sms' })
        setTemplates(data)
        setKakaoTemplates([])
      } else {
        const data = await getKakaoTemplates()
        setKakaoTemplates(data)
        setTemplates([])
      }
    } catch {
      setTemplates([])
      setKakaoTemplates([])
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    setTemplateId(null)
    setTemplate('')
    setMessage('')
    void loadChannelTemplates(sendType)
  }, [sendType])

  const fetchAllValidRecipientsForSearch = useCallback(async () => {
    const base = buildMemberListParams(1, MEMBER_FETCH_ALL_PAGE_SIZE)
    if (base === null) {
      return { ids: [] as number[], byId: {} as Record<number, Contact> }
    }
    const ids: number[] = []
    const byId: Record<number, Contact> = {}
    const seenPhone = new Set<string>()
    let page = 1
    while (true) {
      const res = await getPublicMemberList({ ...base, page, page_size: MEMBER_FETCH_ALL_PAGE_SIZE })
      for (const m of res.results) {
        const c = mapListItemToContact(m)
        const phone = normalizePhone(c.phone)
        if (!c.name?.trim() || !phone) continue
        if (!/^01\d{8,9}$/.test(phone)) continue
        if (seenPhone.has(phone)) continue
        seenPhone.add(phone)
        ids.push(c.id)
        byId[c.id] = c
      }
      if (!res.next) break
      page += 1
      if (page > 500) break
    }
    return { ids, byId }
  }, [buildMemberListParams])

  const previewText = useMemo(() => {
    return message.trim()
  }, [message])

  const approvedKakaoTemplates = useMemo(
    () => kakaoTemplates.filter((t) => t.status === 'approved'),
    [kakaoTemplates]
  )

  const receiverLabel = `${selectedContacts.length}명`

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    if (!el) {
      setMessage((prev) => `${prev}${text}`)
      return
    }
    const start = el.selectionStart ?? message.length
    const end = el.selectionEnd ?? start
    const next = `${message.slice(0, start)}${text}${message.slice(end)}`
    setMessage(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const applySelectedContacts = () => {
    const uniqueByPhone = new Map<string, Contact>()
    for (const id of selectedContactIds) {
      const fromCache = modalRecipientById[id]
      const fromPage = contacts.find((x) => x.id === id)
      const p = fromCache ?? fromPage
      if (!p) continue
      const phone = normalizePhone(p.phone)
      if (!p.name || !phone) continue
      if (!/^01\d{8,9}$/.test(phone)) continue
      uniqueByPhone.set(phone, { ...p, phone })
    }
    setSelectedContacts(Array.from(uniqueByPhone.values()))
    setContactModalOpen(false)
  }

  /** 현재 조건·검색어에 맞는 전체 목록(모든 페이지)에서 발송 가능 회원을 기존 선택과 합침 */
  const addEntireSearchToRecipientSelection = async () => {
    if (buildMemberListParams(1, MEMBER_MODAL_PAGE_SIZE) === null) {
      window.alert('가입일 범위를 선택해 주세요.')
      return
    }
    try {
      setBulkSelectLoading(true)
      const { ids, byId } = await fetchAllValidRecipientsForSearch()
      if (ids.length === 0) {
        window.alert('해당 검색 조건에서 발송 가능한 회원(이름·휴대폰 010 등)이 없습니다.')
        setCachedFullSearchValidIds(null)
        return
      }
      setCachedFullSearchValidIds(ids)
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...ids])))
      setModalRecipientById((prev) => ({ ...prev, ...byId }))
    } catch {
      window.alert('목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setBulkSelectLoading(false)
    }
  }

  /** 마지막「검색 전체」로 넣은 수신자만 제거(다른 방식으로 고른 수신자는 유지) */
  const removeEntireSearchFromSelection = () => {
    if (!cachedFullSearchValidIds || cachedFullSearchValidIds.length === 0) return
    const drop = new Set(cachedFullSearchValidIds)
    setSelectedContactIds((prev) => prev.filter((id) => !drop.has(id)))
    setModalRecipientById((prev) => {
      const next = { ...prev }
      for (const id of drop) {
        delete next[id]
      }
      return next
    })
    setCachedFullSearchValidIds(null)
  }

  const allSearchBulkChecked =
    cachedFullSearchValidIds !== null &&
    cachedFullSearchValidIds.length > 0 &&
    cachedFullSearchValidIds.every((id) => selectedContactIds.includes(id))

  const memberListTotalPages = Math.max(1, Math.ceil(memberListTotalCount / MEMBER_MODAL_PAGE_SIZE))

  const resetForm = () => {
    setSelectedContacts([])
    setSelectedContactIds([])
    setModalRecipientById({})
    setCachedFullSearchValidIds(null)
    setTitle('')
    setMessage('')
    setTemplate('')
    setTemplateId(null)
    setSaveTemplateName('')
    setEditorTemplateId(null)
    setEditorTemplateName('')
    setEditorTemplateContent('')
    setEditorTemplateCode('')
    setIsScheduled(false)
  }

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      window.alert('수신자를 먼저 선택해 주세요.')
      return
    }
    if (sendType === 'kakao') {
      if (templateId == null) {
        window.alert('알림톡 템플릿을 선택해 주세요.')
        return
      }
      if (!title.trim()) {
        window.alert('알림톡 제목을 입력해 주세요.')
        return
      }
    }
    if (!message.trim()) {
      window.alert(sendType === 'sms' ? '문자 내용을 입력해 주세요.' : '알림톡 본문(템플릿 내용)이 비어 있습니다.')
      return
    }
    if (!senderPhone.trim()) {
      window.alert('발신번호를 입력해 주세요.')
      return
    }
    if (isScheduled && (!scheduledDate.trim() || !scheduledTime.trim())) {
      window.alert('예약 날짜/시간을 입력해 주세요.')
      return
    }
    if (isScheduled) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)
      const minAllowed = Date.now() + 10 * 60 * 1000
      if (Number.isNaN(scheduledDateTime.getTime()) || scheduledDateTime.getTime() < minAllowed) {
        window.alert('예약 발송 시간은 현재 기준 최소 10분 이후여야 합니다.')
        return
      }
    }
    try {
      setSubmitting(true)
      const status = isScheduled ? 'scheduled' : 'processing'
      const scheduledAt = isScheduled ? `${scheduledDate}T${scheduledTime}:00+09:00` : null
      const pickedKakao = sendType === 'kakao' ? approvedKakaoTemplates.find((t) => t.id === templateId) : null
      await createMessageBatch({
        type: sendType,
        sender: senderPhone,
        title,
        content: message,
        status,
        scheduled_at: scheduledAt,
        request_snapshot: {
          template,
          templateId,
          messageClass: sendType === 'sms' ? messageClass : undefined,
          messageByte: sendType === 'sms' ? messageByte : undefined,
        },
        details: selectedContacts.map((c) => ({
          receiver_name: c.name,
          receiver_phone: c.phone,
          receiver_email: c.email,
          template_id: sendType === 'kakao' && templateId != null ? templateId : undefined,
          template_name: sendType === 'kakao' && pickedKakao ? pickedKakao.template_name : template || undefined,
          final_content: applyPersonalizationPlaceholders(message, c),
          status: 'success',
        })),
      })
      window.alert(isScheduled ? '예약 발송이 등록되었습니다.' : '발송 요청이 등록되었습니다.')
      resetForm()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '발송 요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="grid min-h-[820px] grid-cols-1 lg:grid-cols-[62%_38%]">
        <div className="border-r border-slate-200 p-6 pb-24">
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">문자 전송</h1>
            <span className="text-sm text-gray-500">잔여문자량 {remainSmsCnt !== null ? `${remainSmsCnt.toLocaleString('ko-KR')}건` : '-'}</span>
            <button
              type="button"
              onClick={() => window.open('https://www.aligo.in', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center gap-1 text-sm text-gray-700 underline underline-offset-2"
            >
              충전하기
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">전송 수단</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendType('sms')}
                  className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm ${
                    sendType === 'sms' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full border ${sendType === 'sms' ? 'border-violet-600 bg-violet-600' : 'border-slate-400'}`} />
                  문자 메시지
                </button>
                <button
                  type="button"
                  onClick={() => setSendType('kakao')}
                  className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm ${
                    sendType === 'kakao' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full border ${sendType === 'kakao' ? 'border-violet-600 bg-violet-600' : 'border-slate-400'}`} />
                  카카오 알림톡
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800">받는사람</label>
                <button
                  type="button"
                  className="text-sm font-medium text-gray-700 underline"
                  onClick={() => {
                    setMemberListPage(1)
                    setSelectedContactIds(selectedContacts.map((c) => c.id))
                    setModalRecipientById(Object.fromEntries(selectedContacts.map((c) => [c.id, c])))
                    setCachedFullSearchValidIds(null)
                    setContactModalOpen(true)
                  }}
                >
                  회원 검색
                </button>
              </div>
              <input value={receiverLabel} readOnly className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm" />
              {selectedContacts.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                  {selectedContacts.slice(0, RECIPIENT_CHIP_PREVIEW).map((c) => (
                    <span key={c.id} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] text-violet-700">
                      {c.name}({c.phone})
                    </span>
                  ))}
                  {selectedContacts.length > RECIPIENT_CHIP_PREVIEW ? (
                    <span className="text-[13px] text-slate-500">외 {selectedContacts.length - RECIPIENT_CHIP_PREVIEW}명</span>
                  ) : null}
                  <button type="button" className="ml-auto text-[13px] text-rose-500 underline" onClick={() => setSelectedContacts([])}>
                    전체 삭제
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">발신번호</label>
              <select value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                <option value="">발신번호를 선택하세요</option>
                {senderNumbers.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              {sendType === 'kakao' ? (
                <p className="mt-1.5 text-xs text-slate-500">알리고에 등록된 발신번호(숫자만)로 알림톡이 발송됩니다.</p>
              ) : null}
            </div>

            {sendType === 'sms' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">제목</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="20자 이내"
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-800">문자 내용</label>
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-sm font-medium text-gray-700 underline" onClick={() => setTemplateEditorOpen(true)}>
                        템플릿 편집
                      </button>
                      <button type="button" className="text-sm font-medium text-gray-700 underline" onClick={() => setTemplateModalOpen(true)}>
                        템플릿 가져오기
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-300">
                    <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
                      <select
                        value={variableValue}
                        onChange={(e) => {
                          const next = e.target.value
                          setVariableValue(next)
                          if (next !== PERSONALIZE_PLACEHOLDER) {
                            insertAtCursor(next)
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-[14px]"
                      >
                        <option value={PERSONALIZE_PLACEHOLDER}>{PERSONALIZE_PLACEHOLDER}</option>
                        <option value="{이름}">{'{이름}'}</option>
                        <option value="{아이디}">{'{아이디}'}</option>
                        <option value="{핸드폰번호}">{'{핸드폰번호}'}</option>
                      </select>
                      <button
                        type="button"
                        className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-[14px]"
                        onClick={() => setSaveTemplateModalOpen(true)}
                      >
                        + 작성한 내용 템플릿으로 저장
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="h-[280px] w-full resize-none rounded-b-xl px-4 py-3 text-[15px] outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">현재 타입: <span className="font-semibold text-violet-700">{messageClass}</span> ({messageByte} byte)</p>
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-slate-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    URL이나 URL 변수를 포함할 때는 앞뒤에 반드시 공백을 추가해야 합니다.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">알림톡 제목</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="알리고 subject(200자 이내)"
                    maxLength={200}
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-800">카카오 템플릿 (승인 건)</label>
                    <button type="button" className="text-sm font-medium text-gray-700 underline" onClick={() => setTemplateEditorOpen(true)}>
                      템플릿 편집
                    </button>
                  </div>
                  <select
                    className="h-11 w-full rounded-lg border border-violet-500 px-3 text-sm"
                    value={templateId ?? ''}
                    onChange={(e) => {
                      const nextId = Number(e.target.value)
                      const picked = approvedKakaoTemplates.find((t) => t.id === nextId)
                      setTemplateId(Number.isNaN(nextId) ? null : nextId)
                      setTemplate(picked?.template_name ?? '')
                      setMessage(picked?.content ?? '')
                    }}
                  >
                    <option value="">템플릿 선택</option>
                    {approvedKakaoTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.template_name} ({t.template_code})
                      </option>
                    ))}
                  </select>
                  {approvedKakaoTemplates.length === 0 && !templateLoading ? (
                    <p className="mt-2 text-xs text-amber-700">승인된 카카오 템플릿이 없습니다. 템플릿 편집에서 등록하거나 관리자 DB를 확인해 주세요.</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    본문의 개인화: {'{이름}'}, {'{닉네임}'}, {'{아이디}'}(회원번호), {'{핸드폰번호}'}, {'{이메일}'} · 카카오형 {'#{이름}#'}도 동일하게 치환됩니다.
                  </p>
                  <div className="mt-3 min-h-[500px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
                    {templateLoading
                      ? '불러오는 중...'
                      : approvedKakaoTemplates.find((t) => t.id === templateId)?.content ?? '선택된 템플릿 내용이 없습니다.'}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-gray-800">예약 전송</label>
              <button type="button" className={`h-8 w-14 rounded-full p-1 ${isScheduled ? 'bg-violet-600' : 'bg-slate-200'}`} onClick={() => setIsScheduled((v) => !v)}>
                <span className="block h-6 w-6 rounded-full bg-white shadow" />
              </button>
              {isScheduled ? (
                <div className="mt-2 w-full max-w-[560px]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      min={minDate}
                      value={scheduledDate}
                      onChange={(e) => {
                        const nextDate = e.target.value
                        setScheduledDate(nextDate)
                        if (nextDate === minDate && minTime && scheduledTime && hhmmToMinutes(scheduledTime) < hhmmToMinutes(minTime)) {
                          setScheduledTime(minTime)
                        }
                      }}
                      className="h-11 rounded-lg border-violet-500 text-sm"
                    />
                    <Input
                      type="time"
                      min={minTime}
                      value={scheduledTime}
                      onChange={(e) => {
                        const nextTime = e.target.value
                        if (scheduledDate === minDate && minTime && hhmmToMinutes(nextTime) < hhmmToMinutes(minTime)) {
                          window.alert(`예약 시간은 ${minTime} 이후로 선택해 주세요.`)
                          setScheduledTime(minTime)
                          return
                        }
                        setScheduledTime(nextTime)
                      }}
                      className="h-11 rounded-lg border-violet-500 text-sm"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    알리고 정책상 예약 시간은 현재 기준 최소 10분 이후로만 설정할 수 있습니다.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 pb-24">
          <h2 className="mb-6 text-center text-sm font-medium text-slate-500">미리보기</h2>
          <div className="mx-auto w-full max-w-[360px] rounded-[28px] border border-slate-200 bg-white p-0 shadow-sm">
            {sendType === 'sms' ? (
              <div>
                <div className="border-b border-slate-200 p-6 text-center">
                  <CircleUserRound className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-base text-slate-700">{senderPhone || '-'}</p>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-center text-xs text-slate-600">미리보기</p>
                  <div className="rounded-xl bg-slate-100 p-5 text-sm whitespace-pre-wrap text-slate-800">{previewText}</div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="overflow-hidden rounded-2xl bg-slate-100">
                  <div className="flex items-center justify-between bg-yellow-300 px-3 py-2 text-[13px] font-bold text-slate-900">
                    <span className="truncate pr-2">{title.trim() || '알림톡 제목'}</span>
                    <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-yellow-300">kakao</span>
                  </div>
                  <div className="space-y-3 px-4 py-4 text-sm leading-6 text-slate-800 whitespace-pre-wrap">{previewText}</div>
                  <div className="px-4 pb-4">
                    <button type="button" className="h-10 w-full rounded-lg bg-white text-sm font-medium text-slate-700">
                      프로그램 참여
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-slate-200 bg-white px-6 py-3">
        <button type="button" className="h-10 rounded-lg border border-slate-300 px-5 text-sm text-slate-700" onClick={resetForm}>
          초기화
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="h-10 rounded-lg bg-violet-600 px-8 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '처리중...' : isScheduled ? '예약' : '전송'}
        </button>
      </div>

      {contactModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">회원 검색</h3>
            <p className="mt-2 text-sm text-slate-600">검색 조건을 선택한 뒤 목록에서 수신자를 선택해 주세요.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={memberSearchScope}
                onChange={(e) => {
                  const v = e.target.value as PublicMemberRecipientScope
                  setMemberSearchScope(v)
                  if (v === 'join_date' && !joinDateFrom && !joinDateTo) {
                    const end = new Date()
                    const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
                    setJoinDateFrom(toDateInputValue(start))
                    setJoinDateTo(toDateInputValue(end))
                  }
                }}
                className="h-11 min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 text-sm"
              >
                <option value="marketing_agree">수신 동의 (뉴스레터·이벤트/혜택 수신 동의 회원)</option>
                <option value="all">전체 (모든 회원)</option>
                <option value="join_date">가입 일자 (가입일 범위)</option>
                <option value="inactive_90">미접속 (최종 접속 90일 이상 경과, 활성 회원)</option>
                <option value="withdrawn">탈퇴 (탈퇴 완료 회원)</option>
              </select>
              <input
                value={contactKeyword}
                onChange={(e) => setContactKeyword(e.target.value)}
                placeholder="이름, 휴대전화, 이메일로 목록 좁히기"
                className="h-11 min-w-[200px] flex-[2] rounded-lg border border-slate-300 px-3 text-sm"
              />
              <button type="button" onClick={() => void loadContacts()} className="h-11 shrink-0 rounded-lg border border-slate-300 px-4 text-sm text-slate-700">
                새로고침
              </button>
            </div>
            {memberSearchScope === 'join_date' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">가입일</span>
                <Input type="date" value={joinDateFrom} onChange={(e) => setJoinDateFrom(e.target.value)} className="h-10 w-[160px] rounded-lg border-slate-300 text-sm" />
                <span className="text-sm text-slate-500">~</span>
                <Input type="date" value={joinDateTo} onChange={(e) => setJoinDateTo(e.target.value)} className="h-10 w-[160px] rounded-lg border-slate-300 text-sm" />
                <span className="text-xs text-slate-500">범위 선택 후 목록이 자동으로 갱신됩니다.</span>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              키워드는 서버 검색(이름·이메일·휴대전화)이며, 입력 후 잠시 뒤 목록이 갱신됩니다.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {memberSearchScope === 'marketing_agree' && '뉴스레터 수신 동의가 켜진 활성 회원만 표시됩니다.'}
              {memberSearchScope === 'all' && '탈퇴·탈퇴 요청 포함 전체 회원입니다.'}
              {memberSearchScope === 'join_date' && '선택한 가입일(시작~종료, 달력일 기준)에 가입한 회원입니다.'}
              {memberSearchScope === 'inactive_90' && '상태가 활성이면서, 최종 접속이 없거나 오늘 기준 90일 이전인 회원입니다.'}
              {memberSearchScope === 'withdrawn' && '탈퇴 완료(WITHDRAWN) 상태 회원만 표시됩니다.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>
                총 {memberListTotalCount.toLocaleString('ko-KR')}명 · {MEMBER_MODAL_PAGE_SIZE}명씩 · 페이지 {memberListPage} / {memberListTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={contactsLoading || memberListPage <= 1}
                  onClick={() => setMemberListPage((p) => Math.max(1, p - 1))}
                >
                  이전
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={contactsLoading || !memberListHasNext}
                  onClick={() => setMemberListPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            </div>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2"></th><th className="px-3 py-2 text-left">이름</th><th className="px-3 py-2 text-left">이메일</th><th className="px-3 py-2 text-left">휴대전화번호</th><th className="px-3 py-2 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-6 text-center text-slate-400" colSpan={5}>
                        {contactsLoading ? '회원 데이터를 불러오는 중...' : '회원 데이터가 없습니다.'}
                      </td>
                    </tr>
                  ) : null}
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(c.id)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSelectedContactIds((prev) =>
                              checked ? Array.from(new Set([...prev, c.id])) : prev.filter((id) => id !== c.id)
                            )
                            setModalRecipientById((prev) => {
                              if (checked) {
                                return { ...prev, [c.id]: c }
                              }
                              const next = { ...prev }
                              delete next[c.id]
                              return next
                            })
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">{c.email}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800"
                    title="검색 조건·키워드에 맞는 회원 전체(모든 페이지) 중 발송 가능한 회원을 선택합니다. 인원이 많으면 잠시 걸릴 수 있습니다."
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={allSearchBulkChecked}
                      disabled={contactsLoading || bulkSelectLoading || memberListTotalCount === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          void addEntireSearchToRecipientSelection()
                        } else {
                          removeEntireSearchFromSelection()
                        }
                      }}
                    />
                    <span>검색된 모든 회원</span>
                  </label>
                  {bulkSelectLoading ? (
                    <span className="text-xs text-violet-600">전체 목록 불러오는 중…</span>
                  ) : null}
                  <p className="font-semibold">받는사람 {selectedContactIds.length.toLocaleString('ko-KR')}</p>
                </div>
                <button
                  type="button"
                  className="text-rose-500 underline text-sm"
                  onClick={() => {
                    setSelectedContactIds([])
                    setModalRecipientById({})
                    setCachedFullSearchValidIds(null)
                  }}
                >
                  전체 삭제
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedContactIds.slice(0, RECIPIENT_CHIP_PREVIEW).map((id) => {
                  const c = modalRecipientById[id] ?? contacts.find((x) => x.id === id)
                  if (!c) return null
                  return (
                    <span key={id} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">
                      {c.name}({c.phone})
                    </span>
                  )
                })}
                {selectedContactIds.length > RECIPIENT_CHIP_PREVIEW ? (
                  <span className="text-xs text-slate-500">외 {selectedContactIds.length - RECIPIENT_CHIP_PREVIEW}명</span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-300 px-5"
                onClick={() => {
                  setSelectedContactIds(selectedContacts.map((c) => c.id))
                  setModalRecipientById(Object.fromEntries(selectedContacts.map((c) => [c.id, c])))
                  setCachedFullSearchValidIds(null)
                  setContactModalOpen(false)
                }}
              >
                취소
              </button>
              <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={applySelectedContacts}>확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {templateModalOpen && sendType === 'sms' ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">문자 템플릿</h3>
            <p className="mt-2 text-sm text-slate-600">문자 템플릿을 선택해 주세요.</p>
            <select
              className="mt-4 h-12 w-full rounded-lg border-2 border-violet-500 px-3"
              value={templateId ?? ''}
              onChange={(e) => {
                const nextId = Number(e.target.value)
                const picked = templates.find((t) => t.id === nextId)
                setTemplateId(Number.isNaN(nextId) ? null : nextId)
                setTemplate(picked?.template_name ?? '')
              }}
            >
              <option value="">템플릿 선택</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
            <div className="mt-4 rounded-lg border border-slate-200 p-4 whitespace-pre-wrap text-[15px]">
              {templateLoading
                ? '불러오는 중...'
                : templates.find((t) => t.id === templateId)?.content ?? '템플릿 데이터가 없습니다.'}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5" onClick={() => setTemplateModalOpen(false)}>취소</button>
              <button
                type="button"
                className="h-10 rounded-lg bg-violet-600 px-5 text-white"
                onClick={() => {
                  const content = templates.find((t) => t.id === templateId)?.content ?? ''
                  setMessage(content)
                  setTemplateModalOpen(false)
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {templateEditorOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {sendType === 'kakao' ? '카카오 알림톡 템플릿 편집' : '문자 템플릿 편집'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">등록, 수정, 삭제를 한 곳에서 처리할 수 있습니다.</p>

            <select
              className="mt-4 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              value={editorTemplateId ?? ''}
              onChange={(e) => {
                const nextId = Number(e.target.value)
                if (sendType === 'kakao') {
                  const selected = kakaoTemplates.find((t) => t.id === nextId)
                  if (Number.isNaN(nextId) || !selected) {
                    setEditorTemplateId(null)
                    setEditorTemplateName('')
                    setEditorTemplateContent('')
                    setEditorTemplateCode('')
                    return
                  }
                  setEditorTemplateId(nextId)
                  setEditorTemplateName(selected.template_name)
                  setEditorTemplateContent(selected.content)
                  setEditorTemplateCode(selected.template_code)
                  return
                }
                const selected = templates.find((t) => t.id === nextId)
                if (Number.isNaN(nextId) || !selected) {
                  setEditorTemplateId(null)
                  setEditorTemplateName('')
                  setEditorTemplateContent('')
                  setEditorTemplateCode('')
                  return
                }
                setEditorTemplateId(nextId)
                setEditorTemplateName(selected.template_name)
                setEditorTemplateContent(selected.content)
                setEditorTemplateCode('')
              }}
            >
              <option value="">새 템플릿 등록</option>
              {sendType === 'kakao'
                ? kakaoTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template_name} ({t.template_code}) — {t.status}
                    </option>
                  ))
                : templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
            </select>

            {sendType === 'kakao' ? (
              <input
                value={editorTemplateCode}
                onChange={(e) => setEditorTemplateCode(e.target.value)}
                placeholder="알리고 템플릿 코드 (tpl_code, 카카오 비즈센터와 동일)"
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            ) : null}

            <input
              value={editorTemplateName}
              onChange={(e) => setEditorTemplateName(e.target.value)}
              placeholder={sendType === 'kakao' ? '템플릿 표시 이름' : '템플릿 제목'}
              className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <textarea
              value={editorTemplateContent}
              onChange={(e) => setEditorTemplateContent(e.target.value)}
              placeholder="템플릿 본문 (변수는 카카오 승인본과 일치해야 합니다)"
              className="mt-3 h-36 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                disabled={editorSubmitting || editorTemplateId === null}
                className="h-10 rounded-lg border border-rose-300 px-4 text-sm text-rose-600 disabled:opacity-60"
                onClick={async () => {
                  if (editorTemplateId === null) return
                  if (!window.confirm('선택한 템플릿을 삭제하시겠습니까?')) return
                  try {
                    setEditorSubmitting(true)
                    if (sendType === 'kakao') {
                      await deleteKakaoTemplate(editorTemplateId)
                    } else {
                      await deleteMessageTemplate(editorTemplateId)
                    }
                    await loadChannelTemplates(sendType)
                    if (templateId === editorTemplateId) {
                      setTemplateId(null)
                      setTemplate('')
                      setMessage('')
                    }
                    setEditorTemplateId(null)
                    setEditorTemplateName('')
                    setEditorTemplateContent('')
                    setEditorTemplateCode('')
                    window.alert('템플릿이 삭제되었습니다.')
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : '템플릿 삭제에 실패했습니다.')
                  } finally {
                    setEditorSubmitting(false)
                  }
                }}
              >
                삭제
              </button>

              <div className="flex gap-2">
                <button type="button" className="h-10 rounded-lg border border-slate-300 px-4 text-sm" onClick={() => setTemplateEditorOpen(false)}>
                  닫기
                </button>
                <button
                  type="button"
                  disabled={editorSubmitting}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm text-slate-700 disabled:opacity-60"
                  onClick={async () => {
                    if (!editorTemplateName.trim() || !editorTemplateContent.trim()) {
                      window.alert('템플릿 이름과 내용을 입력해 주세요.')
                      return
                    }
                    if (sendType === 'kakao' && !editorTemplateCode.trim()) {
                      window.alert('알리고 템플릿 코드를 입력해 주세요.')
                      return
                    }
                    try {
                      setEditorSubmitting(true)
                      if (sendType === 'kakao') {
                        const created = await createKakaoTemplate({
                          template_code: editorTemplateCode.trim(),
                          template_name: editorTemplateName.trim(),
                          content: editorTemplateContent.trim(),
                        })
                        await loadChannelTemplates(sendType)
                        setEditorTemplateId(created.id)
                        setTemplateId(created.id)
                        setTemplate(created.template_name)
                        setMessage(created.content)
                        setEditorTemplateCode(created.template_code)
                      } else {
                        const created = await createMessageTemplate({
                          channel: 'sms',
                          template_name: editorTemplateName.trim(),
                          content: editorTemplateContent.trim(),
                        })
                        await loadChannelTemplates(sendType)
                        setEditorTemplateId(created.id)
                        setTemplateId(created.id)
                        setTemplate(created.template_name)
                        setMessage(created.content)
                      }
                      window.alert('템플릿이 등록되었습니다.')
                    } catch (e) {
                      window.alert(e instanceof Error ? e.message : '템플릿 등록에 실패했습니다.')
                    } finally {
                      setEditorSubmitting(false)
                    }
                  }}
                >
                  등록
                </button>
                <button
                  type="button"
                  disabled={editorSubmitting || editorTemplateId === null}
                  className="h-10 rounded-lg bg-violet-600 px-4 text-sm text-white disabled:opacity-60"
                  onClick={async () => {
                    if (editorTemplateId === null) return
                    if (!editorTemplateName.trim() || !editorTemplateContent.trim()) {
                      window.alert('템플릿 이름과 내용을 입력해 주세요.')
                      return
                    }
                    if (sendType === 'kakao' && !editorTemplateCode.trim()) {
                      window.alert('알리고 템플릿 코드를 입력해 주세요.')
                      return
                    }
                    try {
                      setEditorSubmitting(true)
                      if (sendType === 'kakao') {
                        const updated = await updateKakaoTemplate(editorTemplateId, {
                          template_code: editorTemplateCode.trim(),
                          template_name: editorTemplateName.trim(),
                          content: editorTemplateContent.trim(),
                        })
                        await loadChannelTemplates(sendType)
                        setTemplateId(updated.id)
                        setTemplate(updated.template_name)
                        setMessage(updated.content)
                        setEditorTemplateCode(updated.template_code)
                      } else {
                        const updated = await updateMessageTemplate(editorTemplateId, {
                          template_name: editorTemplateName.trim(),
                          content: editorTemplateContent.trim(),
                        })
                        await loadChannelTemplates(sendType)
                        setTemplateId(updated.id)
                        setTemplate(updated.template_name)
                        setMessage(updated.content)
                      }
                      window.alert('템플릿이 수정되었습니다.')
                    } catch (e) {
                      window.alert(e instanceof Error ? e.message : '템플릿 수정에 실패했습니다.')
                    } finally {
                      setEditorSubmitting(false)
                    }
                  }}
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {saveTemplateModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-6">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-lg font-semibold">새 문자 템플릿</h3>
              <button type="button" onClick={() => setSaveTemplateModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
            </div>
            <label className="mb-2 block text-sm font-medium text-gray-800">템플릿 이름</label>
            <input
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              placeholder="예) 안내 문자"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-300"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5 text-sm" onClick={() => setSaveTemplateModalOpen(false)}>취소</button>
              <button
                type="button"
                className="h-10 rounded-lg bg-violet-600 px-5 text-sm text-white"
                onClick={async () => {
                  if (!saveTemplateName.trim()) {
                    window.alert('템플릿 이름을 입력해 주세요.')
                    return
                  }
                  if (!message.trim()) {
                    window.alert('저장할 문자 내용을 먼저 작성해 주세요.')
                    return
                  }
                  try {
                    const saved = await createMessageTemplate({
                      channel: sendType,
                      template_name: saveTemplateName.trim(),
                      content: message,
                    })
                    setTemplateId(saved.id)
                    setTemplate(saved.template_name)
                    setSaveTemplateName('')
                    setSaveTemplateModalOpen(false)
                    await loadChannelTemplates(sendType)
                    window.alert('템플릿이 저장되었습니다.')
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : '템플릿 저장에 실패했습니다.')
                  }
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
