'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import {
  createMessageBatch,
  createMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplates,
  getSenderEmails,
  updateMessageTemplate,
  type MessageTemplate,
} from '@/services/messages'
import { getPublicMemberList } from '@/services/publicMembers'
import { Input } from '@/components/ui/input'

type Contact = {
  id: number
  name: string
  email: string
  nickname: string
  phone: string
  status: 'ACTIVE' | 'WITHDRAW_REQUEST' | 'WITHDRAWN'
}

type EmailRecipient = {
  key: string
  name: string
  email: string
  nickname: string
  phone: string
}

const PERSONALIZE_PLACEHOLDER = '{개인화 추가}'
const CHANNEL: 'email' = 'email'

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

function personalizeBody(body: string, r: EmailRecipient): string {
  const 이름 = (r.name || '').trim() || (r.email.split('@')[0] ?? '고객')
  const 아이디 = (r.nickname || '').trim() || r.email.split('@')[0] || r.email
  const 핸드폰번호 = normalizePhone(r.phone)
  return body.replaceAll('{이름}', 이름).replaceAll('{아이디}', 아이디).replaceAll('{핸드폰번호}', 핸드폰번호)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailSendPage() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([])
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false)
  const [contactKeyword, setContactKeyword] = useState('')
  const [contactStatus, setContactStatus] = useState<'전체' | Contact['status']>('전체')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [manualEmailInput, setManualEmailInput] = useState('')
  const [manualEmails, setManualEmails] = useState<string[]>([])

  const [senderEmail, setSenderEmail] = useState('')
  const [senderDisplayName, setSenderDisplayName] = useState('')
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
  const [senderEmails, setSenderEmails] = useState<string[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templateLoading, setTemplateLoading] = useState(false)
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

  useEffect(() => {
    const loadSenderEmails = async () => {
      try {
        const data = await getSenderEmails({ status: 'approved' })
        const values = data.map((v) => v.sender_email)
        setSenderEmails(values)
        setSenderEmail((prev) => (prev || values[0] || ''))
      } catch {
        setSenderEmails([])
      }
    }
    void loadSenderEmails()
  }, [])

  useEffect(() => {
    if (contactModalOpen) {
      void loadContacts()
    }
  }, [contactModalOpen])

  const loadTemplates = async () => {
    try {
      setTemplateLoading(true)
      const data = await getMessageTemplates({ channel: CHANNEL })
      setTemplates(data)
    } catch {
      setTemplates([])
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const keywordOk =
        c.name.includes(contactKeyword) ||
        c.phone.includes(contactKeyword) ||
        c.email.toLowerCase().includes(contactKeyword.toLowerCase())
      const statusOk = contactStatus === '전체' ? true : c.status === contactStatus
      return keywordOk && statusOk
    })
  }, [contacts, contactKeyword, contactStatus])

  const previewBody = useMemo(() => message.trim(), [message])

  const receiverLabel = `${recipients.length}명`

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

  const applyRecipientsFromModal = () => {
    const picked = contacts.filter((c) => selectedContactIds.includes(c.id))
    const byEmail = new Map<string, EmailRecipient>()
    for (const p of picked) {
      const em = (p.email || '').trim().toLowerCase()
      if (!em || !EMAIL_RE.test(em)) continue
      byEmail.set(em, {
        key: `m:${p.id}`,
        name: p.name,
        email: em,
        nickname: p.nickname || '',
        phone: normalizePhone(p.phone),
      })
    }
    for (const raw of manualEmails) {
      const em = raw.trim().toLowerCase()
      if (!em || !EMAIL_RE.test(em)) continue
      if (!byEmail.has(em)) {
        byEmail.set(em, {
          key: `e:${em}`,
          name: '',
          email: em,
          nickname: '',
          phone: '',
        })
      }
    }
    setRecipients(Array.from(byEmail.values()))
    setContactModalOpen(false)
    setManualEmails([])
    setManualEmailInput('')
  }

  const loadContacts = async () => {
    try {
      setContactsLoading(true)
      const response = await getPublicMemberList({ page: 1, page_size: 200 })
      const nextContacts: Contact[] = response.results.map((m) => ({
        id: m.member_sid,
        name: m.name || m.nickname || `회원#${m.member_sid}`,
        email: m.email || '',
        nickname: m.nickname || '',
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
    setRecipients([])
    setSelectedContactIds([])
    setManualEmails([])
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
    if (recipients.length === 0) {
      window.alert('수신자를 먼저 선택해 주세요.')
      return
    }
    if (!message.trim()) {
      window.alert('이메일 내용을 입력해 주세요.')
      return
    }
    if (!senderEmail.trim()) {
      window.alert('발신 이메일을 선택해 주세요. 발신이메일 관리 메뉴에서 등록할 수 있습니다.')
      return
    }
    if (!title.trim()) {
      window.alert('제목을 입력해 주세요.')
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
        type: 'email',
        sender: senderEmail,
        title,
        content: message,
        status,
        scheduled_at: scheduledAt,
        request_snapshot: {
          template,
          templateId,
          senderDisplayName,
        },
        details: recipients.map((r) => ({
          receiver_name: r.name,
          receiver_phone: r.phone,
          receiver_email: r.email,
          final_content: personalizeBody(message, r),
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
      <div className="grid min-h-[860px] grid-cols-1 lg:grid-cols-[52%_48%]">
        <div className="border-r border-slate-200 p-6 pb-24">
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">이메일 전송</h1>
            <span className="text-sm text-gray-500">남은 이메일 수량 -</span>
            <Info className="h-5 w-5 text-slate-400" />
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800">받는사람</label>
                <button
                  type="button"
                  className="text-sm font-medium text-slate-700 underline"
                  onClick={() => {
                    setSelectedContactIds(recipients.filter((x) => x.key.startsWith('m:')).map((x) => Number(x.key.slice(2))))
                    setManualEmails(recipients.filter((x) => x.key.startsWith('e:')).map((x) => x.email))
                    setContactModalOpen(true)
                  }}
                >
                  이메일 추가
                </button>
              </div>
              <input value={receiverLabel} readOnly className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm" />
              {recipients.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
                  {recipients.map((c) => (
                    <span key={c.key} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] text-violet-700">
                      {c.name ? `${c.name}(${c.email})` : c.email}
                    </span>
                  ))}
                  <button type="button" className="ml-auto text-[13px] text-rose-500 underline" onClick={() => setRecipients([])}>
                    전체 삭제
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">발신 이메일</label>
              <select
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              >
                <option value="">발신 이메일을 선택하세요</option>
                {senderEmails.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
              {senderEmails.length === 0 ? (
                <p className="mt-2 text-xs text-amber-700">등록된 발신 이메일이 없습니다. 사이드 메뉴 「발신이메일 관리」에서 등록해 주세요.</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">보내는 사람 이름</label>
              <input
                value={senderDisplayName}
                onChange={(e) => setSenderDisplayName(e.target.value)}
                placeholder="20자 이내"
                maxLength={20}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-800">이메일 내용</label>
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
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-800">예약 전송</label>
              <button
                type="button"
                className={`h-8 w-14 rounded-full p-1 ${isScheduled ? 'bg-violet-600' : 'bg-slate-200'}`}
                onClick={() => setIsScheduled((v) => !v)}
              >
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
                  <p className="mt-2 text-xs text-slate-500">예약 시간은 현재 기준 최소 10분 이후로만 설정할 수 있습니다.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 pb-24">
          <h2 className="mb-6 text-center text-sm font-medium text-slate-500">미리보기</h2>
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <p className="mb-3 text-base font-semibold text-slate-700">{title.trim() || '제목 없음'}</p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-[18px] font-medium text-violet-700">
                  {(senderDisplayName || 'E').slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{senderDisplayName.trim() || '보내는 사람'}</p>
                  <p className="text-xs text-slate-500">{senderEmail || '발신 이메일 미선택'}</p>
                  <p className="text-xs text-slate-400">받는 사람: 수신자 기준 미리보기</p>
                </div>
              </div>
            </div>
            <div className="min-h-[400px] whitespace-pre-wrap p-5 text-sm text-slate-700">{previewBody || '내용을 입력하세요'}</div>
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
          <div className="mx-auto max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">이메일 추가</h3>
            <p className="mt-2 text-sm text-slate-600">회원을 선택하거나 이메일 주소를 직접 추가할 수 있습니다.</p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">이메일 직접 입력</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  value={manualEmailInput}
                  onChange={(e) => setManualEmailInput(e.target.value)}
                  placeholder="example@domain.com"
                  className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = manualEmailInput.trim().toLowerCase()
                      if (v && EMAIL_RE.test(v) && !manualEmails.includes(v)) {
                        setManualEmails((prev) => [...prev, v])
                        setManualEmailInput('')
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="h-11 shrink-0 rounded-lg bg-violet-600 px-4 text-sm text-white"
                  onClick={() => {
                    const v = manualEmailInput.trim().toLowerCase()
                    if (!v || !EMAIL_RE.test(v)) {
                      window.alert('올바른 이메일 형식을 입력해 주세요.')
                      return
                    }
                    if (manualEmails.includes(v)) {
                      window.alert('이미 추가된 주소입니다.')
                      return
                    }
                    setManualEmails((prev) => [...prev, v])
                    setManualEmailInput('')
                  }}
                >
                  추가
                </button>
              </div>
              {manualEmails.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {manualEmails.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                    >
                      {em}
                      <button
                        type="button"
                        className="text-rose-500"
                        onClick={() => setManualEmails((prev) => prev.filter((x) => x !== em))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <select
                value={contactStatus}
                onChange={(e) => setContactStatus(e.target.value as '전체' | Contact['status'])}
                className="h-11 rounded-lg border border-slate-300 px-3 text-sm"
              >
                <option value="전체">상태: 전체</option>
                <option value="ACTIVE">활성</option>
                <option value="WITHDRAW_REQUEST">탈퇴 요청</option>
                <option value="WITHDRAWN">탈퇴</option>
              </select>
              <input
                value={contactKeyword}
                onChange={(e) => setContactKeyword(e.target.value)}
                placeholder="이름, 이메일, 휴대전화번호 검색"
                className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <button type="button" onClick={loadContacts} className="h-11 rounded-lg border border-slate-300 px-4 text-sm text-slate-700">
                새로고침
              </button>
            </div>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2" />
                    <th className="px-3 py-2 text-left">이름</th>
                    <th className="px-3 py-2 text-left">이메일</th>
                    <th className="px-3 py-2 text-left">휴대전화번호</th>
                    <th className="px-3 py-2 text-left">상태</th>
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
                          disabled={!c.email.trim()}
                          checked={selectedContactIds.includes(c.id)}
                          onChange={(e) =>
                            setSelectedContactIds((prev) =>
                              e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">{c.email || '—'}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">선택 {selectedContactIds.length + manualEmails.length}</p>
                <button
                  type="button"
                  className="text-sm text-rose-500 underline"
                  onClick={() => {
                    setSelectedContactIds([])
                    setManualEmails([])
                  }}
                >
                  전체 삭제
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5" onClick={() => setContactModalOpen(false)}>
                취소
              </button>
              <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={applyRecipientsFromModal}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {templateModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">이메일 템플릿</h3>
            <p className="mt-2 text-sm text-slate-600">템플릿을 선택한 뒤 본문에 반영할 수 있습니다.</p>
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
                <option key={t.id} value={t.id}>
                  {t.template_name}
                </option>
              ))}
            </select>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-slate-200 p-4 whitespace-pre-wrap text-[15px]">
              {templateLoading
                ? '불러오는 중...'
                : templates.find((t) => t.id === templateId)?.content ?? '템플릿 데이터가 없습니다.'}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5" onClick={() => setTemplateModalOpen(false)}>
                취소
              </button>
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
          <div className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
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
                <option key={t.id} value={t.id}>
                  {t.template_name}
                </option>
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
                    await loadTemplates()
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
                        channel: CHANNEL,
                        template_name: editorTemplateName.trim(),
                        content: editorTemplateContent.trim(),
                      })
                      await loadTemplates()
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
                      await loadTemplates()
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
              <h3 className="text-lg font-semibold">새 이메일 템플릿</h3>
              <button type="button" onClick={() => setSaveTemplateModalOpen(false)}>
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
            <label className="mb-2 block text-sm font-medium text-gray-800">템플릿 이름</label>
            <input
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              placeholder="예) 안내 메일"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-300"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-300 px-5 text-sm" onClick={() => setSaveTemplateModalOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="h-10 rounded-lg bg-violet-600 px-5 text-sm text-white"
                onClick={async () => {
                  if (!saveTemplateName.trim()) {
                    window.alert('템플릿 이름을 입력해 주세요.')
                    return
                  }
                  if (!message.trim()) {
                    window.alert('저장할 내용을 먼저 작성해 주세요.')
                    return
                  }
                  try {
                    const saved = await createMessageTemplate({
                      channel: CHANNEL,
                      template_name: saveTemplateName.trim(),
                      content: message,
                    })
                    setTemplateId(saved.id)
                    setTemplate(saved.template_name)
                    setSaveTemplateName('')
                    setSaveTemplateModalOpen(false)
                    await loadTemplates()
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
