'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleUserRound, Info, ExternalLink, X } from 'lucide-react'
import {
  createMessageBatch,
  createMessageTemplate,
  deleteMessageTemplate,
  getAligoRemain,
  getMessageTemplates,
  getSenderNumbers,
  updateMessageTemplate,
  type MessageTemplate,
} from '@/services/messages'
import { getPublicMemberList } from '@/services/publicMembers'
import { Input } from '@/components/ui/input'

type SendType = 'sms' | 'kakao'
type Contact = {
  id: number
  name: string
  email: string
  phone: string
  status: 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN'
}

const PERSONALIZE_PLACEHOLDER = '{개인화변수추가}'

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
  const [contactStatus, setContactStatus] = useState<'전체' | Contact['status']>('전체')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
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
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [senderNumbers, setSenderNumbers] = useState<string[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
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
    if (contactModalOpen) {
      void loadContacts()
    }
  }, [contactModalOpen])

  const loadTemplates = async (channel: SendType) => {
    try {
      setTemplateLoading(true)
      const data = await getMessageTemplates({ channel })
      setTemplates(data)
    } catch {
      setTemplates([])
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates(sendType)
  }, [sendType])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const keywordOk = c.name.includes(contactKeyword) || c.phone.includes(contactKeyword)
      const statusOk = contactStatus === '전체' ? true : c.status === contactStatus
      return keywordOk && statusOk
    })
  }, [contacts, contactKeyword, contactStatus])

  const previewText = useMemo(() => {
    return message.trim()
  }, [message])

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
    const picked = contacts.filter((c) => selectedContactIds.includes(c.id))
    const uniqueByPhone = new Map<string, Contact>()
    for (const p of picked) {
      const phone = normalizePhone(p.phone)
      if (!p.name || !phone) continue
      if (!/^01\d{8,9}$/.test(phone)) continue
      uniqueByPhone.set(phone, { ...p, phone })
    }
    setSelectedContacts(Array.from(uniqueByPhone.values()))
    setContactModalOpen(false)
  }

  const loadContacts = async () => {
    try {
      setContactsLoading(true)
      const response = await getPublicMemberList({ page: 1, page_size: 200 })
      const nextContacts: Contact[] = response.results.map((m) => ({
        id: m.member_sid,
        name: m.name || m.nickname || `회원#${m.member_sid}`,
        email: m.email || '',
        phone: normalizePhone(m.phone || ''),
        status: m.status || (m.is_active ? 'ACTIVE' : 'WITHDRAWN'),
      }))
      setContacts(nextContacts)
    } catch {
      setContacts([])
    } finally {
      setContactsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedContacts([])
    setSelectedContactIds([])
    setTitle('')
    setMessage('')
    setTemplate('')
    setTemplateId(null)
    setSaveTemplateName('')
    setEditorTemplateId(null)
    setEditorTemplateName('')
    setEditorTemplateContent('')
    setIsScheduled(false)
  }

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      window.alert('수신자를 먼저 선택해 주세요.')
      return
    }
    if (!message.trim()) {
      window.alert('문자 내용을 입력해 주세요.')
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
          messageClass,
          messageByte,
        },
        details: selectedContacts.map((c) => ({
          receiver_name: c.name,
          receiver_phone: c.phone,
          receiver_email: c.email,
          final_content: message.replaceAll('{이름}', c.name),
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
                <button type="button" className="text-sm font-medium text-gray-700 underline" onClick={() => setContactModalOpen(true)}>
                  연락처 수정
                </button>
              </div>
              <input value={receiverLabel} readOnly className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm" />
              {selectedContacts.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
                  {selectedContacts.map((c) => (
                    <span key={c.id} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] text-violet-700">
                      {c.name}({c.phone})
                    </span>
                  ))}
                  <button type="button" className="ml-auto text-[13px] text-rose-500 underline" onClick={() => setSelectedContacts([])}>
                    전체 삭제
                  </button>
                </div>
              ) : null}
            </div>

            {sendType === 'sms' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">발신번호</label>
                  <select value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">발신번호를 선택하세요</option>
                    {senderNumbers.map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

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
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-800">템플릿</label>
                    <button type="button" className="text-sm font-medium text-gray-700 underline" onClick={() => setTemplateEditorOpen(true)}>
                      템플릿 편집
                    </button>
                  </div>
                  <select
                    className="h-11 w-full rounded-lg border border-violet-500 px-3 text-sm"
                    value={templateId ?? ''}
                    onChange={(e) => {
                      const nextId = Number(e.target.value)
                      const picked = templates.find((t) => t.id === nextId)
                      setTemplateId(Number.isNaN(nextId) ? null : nextId)
                      setTemplate(picked?.template_name ?? '')
                      setMessage(picked?.content ?? '')
                    }}
                  >
                    <option value="">템플릿 선택</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.template_name}</option>
                    ))}
                  </select>
                  <div className="mt-3 min-h-[500px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
                    {templateLoading
                      ? '불러오는 중...'
                      : templates.find((t) => t.id === templateId)?.content ?? '선택된 템플릿 내용이 없습니다.'}
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
                    <span>알림톡 도착</span>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-yellow-300">kakao</span>
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
            <h3 className="text-lg font-semibold">회원검색</h3>
            <p className="mt-2 text-sm text-slate-600">목록에서 수신자를 선택해 주세요.</p>
            <div className="mt-4 flex gap-2">
              <select value={contactStatus} onChange={(e) => setContactStatus(e.target.value as '전체' | Contact['status'])} className="h-11 rounded-lg border border-slate-300 px-3 text-sm">
                <option value="전체">상태: 전체</option>
                <option value="ACTIVE">활성</option>
                <option value="WITHDRAW_REQUEST">탈퇴 요청</option>
                <option value="WITHDRAWN">탈퇴</option>
              </select>
              <input value={contactKeyword} onChange={(e) => setContactKeyword(e.target.value)} placeholder="이름, 휴대전화번호 검색" className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
              <button type="button" onClick={loadContacts} className="h-11 rounded-lg border border-slate-300 px-4 text-sm text-slate-700">
                새로고침
              </button>
            </div>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2"></th><th className="px-3 py-2 text-left">이름</th><th className="px-3 py-2 text-left">이메일</th><th className="px-3 py-2 text-left">휴대전화번호</th><th className="px-3 py-2 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-6 text-center text-slate-400" colSpan={5}>
                        {contactsLoading ? '회원 데이터를 불러오는 중...' : '회원 데이터가 없습니다.'}
                      </td>
                    </tr>
                  ) : null}
                  {filteredContacts.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(c.id)}
                          onChange={(e) =>
                            setSelectedContactIds((prev) =>
                              e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                            )
                          }
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
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">받는사람 {selectedContactIds.length}</p>
                <button type="button" className="text-rose-500 underline text-sm" onClick={() => setSelectedContactIds([])}>전체 삭제</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {contacts.filter((c) => selectedContactIds.includes(c.id)).map((c) => (
                  <span key={c.id} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">{c.name}({c.phone})</span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5" onClick={() => setContactModalOpen(false)}>취소</button>
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
            <h3 className="text-lg font-semibold text-slate-900">템플릿 편집</h3>
            <p className="mt-2 text-sm text-slate-600">등록, 수정, 삭제를 한 곳에서 처리할 수 있습니다.</p>

            <select
              className="mt-4 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              value={editorTemplateId ?? ''}
              onChange={(e) => {
                const nextId = Number(e.target.value)
                const selected = templates.find((t) => t.id === nextId)
                if (Number.isNaN(nextId) || !selected) {
                  setEditorTemplateId(null)
                  setEditorTemplateName('')
                  setEditorTemplateContent('')
                  return
                }
                setEditorTemplateId(nextId)
                setEditorTemplateName(selected.template_name)
                setEditorTemplateContent(selected.content)
              }}
            >
              <option value="">새 템플릿 등록</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>

            <input
              value={editorTemplateName}
              onChange={(e) => setEditorTemplateName(e.target.value)}
              placeholder="템플릿 제목"
              className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <textarea
              value={editorTemplateContent}
              onChange={(e) => setEditorTemplateContent(e.target.value)}
              placeholder="템플릿 내용"
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
                    await deleteMessageTemplate(editorTemplateId)
                    await loadTemplates(sendType)
                    if (templateId === editorTemplateId) {
                      setTemplateId(null)
                      setTemplate('')
                      setMessage('')
                    }
                    setEditorTemplateId(null)
                    setEditorTemplateName('')
                    setEditorTemplateContent('')
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
                      window.alert('템플릿 제목과 내용을 입력해 주세요.')
                      return
                    }
                    try {
                      setEditorSubmitting(true)
                      const created = await createMessageTemplate({
                        channel: sendType,
                        template_name: editorTemplateName.trim(),
                        content: editorTemplateContent.trim(),
                      })
                      await loadTemplates(sendType)
                      setEditorTemplateId(created.id)
                      setTemplateId(created.id)
                      setTemplate(created.template_name)
                      setMessage(created.content)
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
                      window.alert('템플릿 제목과 내용을 입력해 주세요.')
                      return
                    }
                    try {
                      setEditorSubmitting(true)
                      const updated = await updateMessageTemplate(editorTemplateId, {
                        template_name: editorTemplateName.trim(),
                        content: editorTemplateContent.trim(),
                      })
                      await loadTemplates(sendType)
                      setTemplateId(updated.id)
                      setTemplate(updated.template_name)
                      setMessage(updated.content)
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
                    await loadTemplates(sendType)
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
