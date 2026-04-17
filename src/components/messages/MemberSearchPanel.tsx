'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getPublicMemberList, type PublicMemberRecipientScope } from '@/services/publicMembers'
import type { PublicMemberListItem, PublicMemberStatus } from '@/types/publicMember'
import { Input } from '@/components/ui/input'

const MEMBER_MODAL_PAGE_SIZE = 100
const MEMBER_FETCH_ALL_PAGE_SIZE = 250
const RECIPIENT_CHIP_PREVIEW = 20

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type MemberSearchRow = {
  id: number
  name: string
  nickname: string
  email: string
  phone: string
  status: PublicMemberStatus
  createdAt: string
}

export type MemberSearchConfirmPayload = {
  selectedIds: number[]
  byId: Record<number, MemberSearchRow>
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

/** 가입일시 — Asia/Seoul 기준 yyyy-mm-dd HH:mm */
function formatMemberJoinedAt(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const p = (t: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === t)?.value ?? ''
  const y = p('year')
  const mo = p('month')
  const da = p('day')
  const hr = p('hour')
  const mi = p('minute')
  if (!y) return '-'
  return `${y}-${mo}-${da} ${hr}:${mi}`
}

function mapListItemToRow(m: PublicMemberListItem): MemberSearchRow {
  return {
    id: m.member_sid,
    name: m.name || m.nickname || `회원#${m.member_sid}`,
    nickname: (m.nickname || '').trim(),
    email: m.email || '',
    phone: normalizePhone(m.phone || ''),
    status: (m.status || (m.is_active ? 'ACTIVE' : 'WITHDRAWN')) as PublicMemberStatus,
    createdAt: m.created_at || '',
  }
}

export type MemberSearchPanelProps = {
  mode: 'sms' | 'email'
  /** false면 제목·설명 숨김(상위에서 이미 표시할 때) */
  showHeader?: boolean
  title?: string
  description?: string
  topSlot?: ReactNode
  initialSelectedIds: number[]
  initialById: Record<number, MemberSearchRow>
  manualEmailCount?: number
  /** 「전체 삭제」 시 회원 선택만 비운 뒤 추가 실행(예: 직접 입력 이메일 칩 비우기) */
  onExtraClear?: () => void
  onConfirm: (payload: MemberSearchConfirmPayload) => void
  onCancel: () => void
}

export function MemberSearchPanel({
  mode,
  showHeader = true,
  title = '회원 검색',
  description = '검색 조건을 선택한 뒤 목록에서 수신자를 선택해 주세요.',
  topSlot,
  initialSelectedIds,
  initialById,
  manualEmailCount = 0,
  onExtraClear,
  onConfirm,
  onCancel,
}: MemberSearchPanelProps) {
  const [contactKeyword, setContactKeyword] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [cachedFullSearchValidIds, setCachedFullSearchValidIds] = useState<number[] | null>(null)
  const [bulkSelectLoading, setBulkSelectLoading] = useState(false)
  const [memberSearchScope, setMemberSearchScope] = useState<PublicMemberRecipientScope>('all')
  const [joinDateFrom, setJoinDateFrom] = useState('')
  const [joinDateTo, setJoinDateTo] = useState('')
  const [joinDateQueryFrom, setJoinDateQueryFrom] = useState('')
  const [joinDateQueryTo, setJoinDateQueryTo] = useState('')
  const [contacts, setContacts] = useState<MemberSearchRow[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [memberListPage, setMemberListPage] = useState(1)
  const [memberListTotalCount, setMemberListTotalCount] = useState(0)
  const [memberListHasNext, setMemberListHasNext] = useState(false)
  const [modalRecipientById, setModalRecipientById] = useState<Record<number, MemberSearchRow>>({})
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])

  useEffect(() => {
    setSelectedContactIds(initialSelectedIds)
    setModalRecipientById({ ...initialById })
    setCachedFullSearchValidIds(null)
    // 모달을 열 때마다 부모가 넘긴 초기 선택만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회 시드
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
        if (!joinDateQueryFrom.trim() || !joinDateQueryTo.trim()) return null
        params.join_date_from = joinDateQueryFrom.trim()
        params.join_date_to = joinDateQueryTo.trim()
      }
      return params
    },
    [memberSearchScope, joinDateQueryFrom, joinDateQueryTo, debouncedSearch]
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
      setContacts(response.results.map(mapListItemToRow))
    } catch {
      setContacts([])
      setMemberListTotalCount(0)
      setMemberListHasNext(false)
    } finally {
      setContactsLoading(false)
    }
  }, [buildMemberListParams, memberListPage])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  /** 가입 일자: 날짜(드래프트)는 있는데 조회 확정이 비어 있으면 1회 자동 조회 */
  useEffect(() => {
    if (memberSearchScope !== 'join_date') return
    if (!joinDateFrom.trim() || !joinDateTo.trim()) return
    if (joinDateQueryFrom.trim() && joinDateQueryTo.trim()) return
    setJoinDateQueryFrom(joinDateFrom.trim())
    setJoinDateQueryTo(joinDateTo.trim())
  }, [memberSearchScope, joinDateFrom, joinDateTo, joinDateQueryFrom, joinDateQueryTo])

  useEffect(() => {
    setMemberListPage(1)
    setCachedFullSearchValidIds(null)
  }, [memberSearchScope, joinDateQueryFrom, joinDateQueryTo, debouncedSearch])

  const fetchAllValidRecipientsForSearch = useCallback(async () => {
    const base = buildMemberListParams(1, MEMBER_FETCH_ALL_PAGE_SIZE)
    if (base === null) {
      return { ids: [] as number[], byId: {} as Record<number, MemberSearchRow> }
    }
    const ids: number[] = []
    const byId: Record<number, MemberSearchRow> = {}
    const seen = new Set<string>()
    let page = 1
    while (true) {
      const res = await getPublicMemberList({ ...base, page, page_size: MEMBER_FETCH_ALL_PAGE_SIZE })
      for (const m of res.results) {
        const c = mapListItemToRow(m)
        if (mode === 'sms') {
          const phone = normalizePhone(c.phone)
          if (!c.name?.trim() || !phone) continue
          if (!/^01\d{8,9}$/.test(phone)) continue
          if (seen.has(phone)) continue
          seen.add(phone)
        } else {
          const em = (c.email || '').trim().toLowerCase()
          if (!em || !EMAIL_RE.test(em)) continue
          if (seen.has(em)) continue
          seen.add(em)
        }
        ids.push(c.id)
        byId[c.id] = c
      }
      if (!res.next) break
      page += 1
      if (page > 500) break
    }
    return { ids, byId }
  }, [buildMemberListParams, mode])

  const addEntireSearchToRecipientSelection = async () => {
    if (buildMemberListParams(1, MEMBER_MODAL_PAGE_SIZE) === null) {
      window.alert('가입일 범위를 선택해 주세요.')
      return
    }
    try {
      setBulkSelectLoading(true)
      const { ids, byId } = await fetchAllValidRecipientsForSearch()
      if (ids.length === 0) {
        window.alert(
          mode === 'sms'
            ? '해당 검색 조건에서 발송 가능한 회원(이름·휴대폰 010 등)이 없습니다.'
            : '해당 검색 조건에서 유효한 이메일 주소를 가진 회원이 없습니다.'
        )
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

  const bulkTitle =
    mode === 'sms'
      ? '검색 조건·키워드에 맞는 회원 전체(모든 페이지) 중 발송 가능한 회원을 선택합니다. 인원이 많으면 잠시 걸릴 수 있습니다.'
      : '검색 조건·키워드에 맞는 회원 전체(모든 페이지) 중 유효 이메일이 있는 회원을 선택합니다. 인원이 많으면 잠시 걸릴 수 있습니다.'

  const handleConfirm = () => {
    onConfirm({ selectedIds: selectedContactIds, byId: modalRecipientById })
  }

  const selectionSummaryCount = selectedContactIds.length + manualEmailCount

  return (
    <div className="space-y-0">
      {showHeader ? (
        <>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </>
      ) : null}
      {topSlot ? <div className={showHeader ? 'mt-4' : 'mt-0'}>{topSlot}</div> : null}

      <div className={`flex flex-wrap items-center gap-2 ${showHeader || topSlot ? 'mt-4 border-t border-slate-100 pt-4' : 'mt-0'}`}>
        <select
          value={memberSearchScope}
          onChange={(e) => {
            const v = e.target.value as PublicMemberRecipientScope
            setMemberSearchScope(v)
            if (v !== 'join_date') {
              setJoinDateQueryFrom('')
              setJoinDateQueryTo('')
              return
            }
            const end = new Date()
            const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
            const draftFrom = (joinDateFrom.trim() || toDateInputValue(start)).trim()
            const draftTo = (joinDateTo.trim() || toDateInputValue(end)).trim()
            setJoinDateFrom(draftFrom)
            setJoinDateTo(draftTo)
            setJoinDateQueryFrom(draftFrom)
            setJoinDateQueryTo(draftTo)
            setMemberListPage(1)
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
          <button
            type="button"
            className="h-10 shrink-0 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            disabled={contactsLoading}
            onClick={() => {
              if (!joinDateFrom.trim() || !joinDateTo.trim()) {
                window.alert('가입일 시작과 종료를 모두 선택해 주세요.')
                return
              }
              setJoinDateQueryFrom(joinDateFrom.trim())
              setJoinDateQueryTo(joinDateTo.trim())
              setMemberListPage(1)
            }}
          >
            조회
          </button>
          <span className="text-xs text-slate-500">
            검색 조건에서 「가입 일자」를 고르면 기본 범위로 바로 조회됩니다. 날짜만 바꾼 뒤에는 조회를 눌러 주세요.
          </span>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">키워드는 서버 검색(이름·이메일·휴대전화)이며, 입력 후 잠시 뒤 목록이 갱신됩니다.</p>
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
              <th className="px-3 py-2" />
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">이메일</th>
              <th className="px-3 py-2 text-left">휴대전화번호</th>
              <th className="px-3 py-2 whitespace-nowrap text-left">가입일시</th>
              <th className="px-3 py-2 text-left">상태</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td className="px-3 py-6 text-center text-slate-400" colSpan={6}>
                  {contactsLoading ? '회원 데이터를 불러오는 중...' : '회원 데이터가 없습니다.'}
                </td>
              </tr>
            ) : null}
            {contacts.map((c) => {
              const em = (c.email || '').trim().toLowerCase()
              const canPickEmail = !!em && EMAIL_RE.test(em)
              const disabled = mode === 'email' && !canPickEmail
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      disabled={disabled}
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
                  <td className="px-3 py-2">{c.email || '—'}</td>
                  <td className="px-3 py-2">{c.phone}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600 tabular-nums">{formatMemberJoinedAt(c.createdAt)}</td>
                  <td className="px-3 py-2">{c.status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800" title={bulkTitle}>
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
            {bulkSelectLoading ? <span className="text-xs text-violet-600">전체 목록 불러오는 중…</span> : null}
            <p className="font-semibold">
              {mode === 'sms' ? '받는사람' : '선택'} {selectionSummaryCount.toLocaleString('ko-KR')}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-rose-500 underline"
            onClick={() => {
              setSelectedContactIds([])
              setModalRecipientById({})
              setCachedFullSearchValidIds(null)
              onExtraClear?.()
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
                {mode === 'sms' ? `${c.name}(${c.phone})` : `${c.name}(${c.email})`}
              </span>
            )
          })}
          {selectedContactIds.length > RECIPIENT_CHIP_PREVIEW ? (
            <span className="text-xs text-slate-500">외 {selectedContactIds.length - RECIPIENT_CHIP_PREVIEW}명</span>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="h-10 rounded-lg border border-slate-300 px-5" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="h-10 rounded-lg bg-violet-600 px-5 text-white" onClick={handleConfirm}>
          확인
        </button>
      </div>
    </div>
  )
}
