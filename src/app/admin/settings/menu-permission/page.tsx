'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getAdminList, type AdminMember } from '@/services/admin'
import {
  createUserMenuPermission,
  deleteUserMenuPermission,
  fetchUserMenuPermissions,
  reapplyTemplatePermissions,
  updateUserMenuPermission,
  type MenuPermissionRow,
  type MenuPermissionTargetUser,
} from '@/services/menuPermissions'
import { useAdminMenuCatalog } from '@/contexts/AdminMenuCatalogContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Code, Loader2, Plus, RotateCcw, Shield, Trash2 } from 'lucide-react'

/** adminLayoutPlan.md §16.2.1 — 액션 버튼 파스텔 (variant로 색 대체 금지) */
const adminActionBtn = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200',
} as const

/** 백엔드 api.services.admin_permissions 와 동일 */
const LEVEL_SUPER_ADMIN = 1
const LEVEL_DIRECTOR = 5
const LEVEL_EDITOR = 6

function levelRoleLabel(level: number): string {
  if (level === LEVEL_SUPER_ADMIN) return '최고관리자'
  if (level === LEVEL_DIRECTOR) return '디렉터'
  if (level === LEVEL_EDITOR) return '에디터'
  return `레벨 ${level}`
}

function canReapplyTemplateByLevel(level: number | undefined): boolean {
  if (level == null) return false
  return level === LEVEL_SUPER_ADMIN || level === LEVEL_DIRECTOR || level === LEVEL_EDITOR
}

export default function MenuPermissionPage() {
  const { toast } = useToast()
  const { items: menuMasterItems, labelFor, loading: catalogLoading, error: catalogError } =
    useAdminMenuCatalog()
  const [admins, setAdmins] = useState<AdminMember[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [selectedSid, setSelectedSid] = useState<string>('')
  const [targetUser, setTargetUser] = useState<MenuPermissionTargetUser | null>(null)
  const [rows, setRows] = useState<MenuPermissionRow[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<MenuPermissionRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [addMenuCode, setAddMenuCode] = useState<string>('')
  const [addRead, setAddRead] = useState(true)
  const [addWrite, setAddWrite] = useState(false)
  const [addDelete, setAddDelete] = useState(false)
  const [adding, setAdding] = useState(false)
  const [reapplyOpen, setReapplyOpen] = useState(false)
  const [reapplying, setReapplying] = useState(false)

  const loadAdmins = useCallback(async () => {
    try {
      setAdminsLoading(true)
      const list = await getAdminList()
      setAdmins(list)
    } catch (e: unknown) {
      toast({
        title: '관리자 목록 실패',
        description: e instanceof Error ? e.message : '목록을 불러오지 못했습니다.',
        variant: 'destructive',
      })
    } finally {
      setAdminsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const loadPermissions = useCallback(
    async (userId: string) => {
      if (!userId) {
        setTargetUser(null)
        setRows([])
        return
      }
      try {
        setPermLoading(true)
        const data = await fetchUserMenuPermissions(userId)
        setTargetUser(data.target_user)
        setRows(data.permissions)
      } catch (e: unknown) {
        setTargetUser(null)
        setRows([])
        toast({
          title: '권한 조회 실패',
          description: e instanceof Error ? e.message : '조회에 실패했습니다.',
          variant: 'destructive',
        })
      } finally {
        setPermLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    if (selectedSid) {
      loadPermissions(selectedSid)
    } else {
      setTargetUser(null)
      setRows([])
    }
  }, [selectedSid, loadPermissions])

  const usedCodes = useMemo(() => new Set(rows.map((r) => r.menu_code)), [rows])
  const addableCatalog = useMemo(
    () => menuMasterItems.filter((m) => !usedCodes.has(m.menu_code)),
    [menuMasterItems, usedCodes]
  )

  useEffect(() => {
    if (addableCatalog.length === 0) {
      setAddMenuCode('')
      return
    }
    if (!addMenuCode || usedCodes.has(addMenuCode)) {
      setAddMenuCode(addableCatalog[0].menu_code)
    }
  }, [addableCatalog, addMenuCode, usedCodes])

  const patchRow = async (
    id: number,
    patch: Partial<Pick<MenuPermissionRow, 'can_read' | 'can_write' | 'can_delete'>>
  ) => {
    try {
      setSavingId(id)
      const updated = await updateUserMenuPermission(id, patch)
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast({ title: '저장됨', description: '권한이 반영되었습니다.' })
    } catch (e: unknown) {
      toast({
        title: '저장 실패',
        description: e instanceof Error ? e.message : '수정에 실패했습니다.',
        variant: 'destructive',
      })
      if (selectedSid) await loadPermissions(selectedSid)
    } finally {
      setSavingId(null)
    }
  }

  const handleAdd = async () => {
    if (!selectedSid || !addMenuCode) return
    try {
      setAdding(true)
      const created = await createUserMenuPermission({
        user_id: selectedSid,
        menu_code: addMenuCode,
        can_read: addRead,
        can_write: addWrite,
        can_delete: addDelete,
      })
      setRows((prev) => [...prev, created].sort((a, b) => a.menu_code.localeCompare(b.menu_code)))
      toast({ title: '추가됨', description: `${labelFor(addMenuCode)} 메뉴 권한을 추가했습니다.` })
    } catch (e: unknown) {
      toast({
        title: '추가 실패',
        description: e instanceof Error ? e.message : '추가에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  const confirmReapplyTemplate = async () => {
    if (!selectedSid || !targetUser) return
    try {
      setReapplying(true)
      const result = await reapplyTemplatePermissions(selectedSid)
      await loadPermissions(selectedSid)
      setReapplyOpen(false)
      if (result.mode === 'super_admin') {
        toast({
          title: '템플릿 재적용 완료',
          description: `최고관리자(Lv.${LEVEL_SUPER_ADMIN}): DB 메뉴 권한 ${result.rows_cleared ?? 0}건을 삭제했습니다.`,
        })
      } else {
        const mode = result.template_match_mode ?? ''
        const scm = result.scm_template_rows
        const emptySid = result.skipped_empty_sysCodeSid
        const extraZero =
          result.rows_created === 0
            ? ` sysCodeManager 매칭: ${mode || '?'}${scm != null ? `, 행 ${scm}건` : ''}${
                emptySid ? ` (sysCodeSid 비어 제외 ${emptySid}건)` : ''
              }. 디렉터는 sysCodeVal, 에디터는 sysCodeVal1에 Y/1이 들어 있는지 확인하세요.`
            : ''
        toast({
          title: '템플릿 재적용 완료',
          description: `${levelRoleLabel(result.memberShipLevel)}(${result.admin_role}) 템플릿으로 ${result.rows_created}건을 등록했습니다. (기존 권한은 전부 대체)${extraZero}`,
        })
      }
    } catch (e: unknown) {
      toast({
        title: '재적용 실패',
        description: e instanceof Error ? e.message : '처리에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setReapplying(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteRow) return
    try {
      setDeleting(true)
      await deleteUserMenuPermission(deleteRow.id)
      setRows((prev) => prev.filter((r) => r.id !== deleteRow.id))
      toast({ title: '삭제됨', description: '권한 행이 삭제되었습니다.' })
      setDeleteOpen(false)
      setDeleteRow(null)
    } catch (e: unknown) {
      toast({
        title: '삭제 실패',
        description: e instanceof Error ? e.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const isSuperTarget = targetUser && targetUser.memberShipLevel === LEVEL_SUPER_ADMIN

  return (
    <div className="space-y-6">
      {/* adminLayoutPlan §18.1 PageHeader — 부제는 h1과 같은 좌측 div 안 */}
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0 pr-4">
          <h1 className="text-lg font-semibold text-gray-900">메뉴 권한</h1>
          <p className="text-sm text-gray-600 mt-1">
            관리자별 <code className="rounded bg-gray-100 px-1 text-xs text-gray-800">user_permissions</code>{' '}
            조회·추가·수정·삭제 (adminUserPermissionsPlan §13)
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Shield className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
              대상 관리자
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              목록은 관리자 등록과 동일 API입니다.{' '}
              <Link
                href="/admin/settings/admin-register"
                className="font-medium text-blue-700 underline-offset-4 hover:underline"
              >
                관리자 등록
              </Link>
              에서 계정을 관리할 수 있습니다.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              className={adminActionBtn.blue}
              onClick={() => loadAdmins()}
              disabled={adminsLoading}
            >
              {adminsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              목록 새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="max-w-md space-y-2">
            <Label htmlFor="admin-select" className="text-sm font-medium text-gray-700">
              관리자 선택
            </Label>
            <Select
              value={selectedSid || '__none__'}
              onValueChange={(v) => setSelectedSid(v === '__none__' ? '' : v)}
              disabled={adminsLoading}
            >
              <SelectTrigger id="admin-select" className="border-gray-300 bg-white">
                <SelectValue placeholder={adminsLoading ? '불러오는 중…' : '관리자를 선택하세요'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">선택 안 함</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.memberShipSid} value={a.memberShipSid}>
                    {a.memberShipName} ({a.memberShipId}) · Lv.{a.memberShipLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSuperTarget ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
              role="status"
            >
              이 관리자는 회원 레벨이 <strong>{LEVEL_SUPER_ADMIN}</strong>(최고관리자)입니다. API에서는 모든 메뉴를
              통과하며, 아래 DB 행은 참고·운영용으로만 씁니다.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedSid ? (
        <Card className="border-gray-200 bg-white">
          <CardHeader className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle className="text-base font-semibold text-gray-900">메뉴별 권한</CardTitle>
              <CardDescription className="max-w-xl text-sm text-gray-600">
                읽기·쓰기·삭제는 HTTP 메서드와 매핑됩니다 (GET→읽기, POST/PUT/PATCH→쓰기, DELETE→삭제). 회원 레벨을
                변경한 뒤에는 &quot;레벨 템플릿으로 재적용&quot;으로{' '}
                <code className="rounded bg-gray-100 px-1 text-xs">sysCodeManager</code>의 디렉터/에디터 템플릿을
                일괄 반영할 수 있습니다.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                className={`gap-2 ${adminActionBtn.purple}`}
                disabled={
                  !targetUser || permLoading || !canReapplyTemplateByLevel(targetUser.memberShipLevel)
                }
                title={
                  targetUser && !canReapplyTemplateByLevel(targetUser.memberShipLevel)
                    ? `레벨 ${LEVEL_SUPER_ADMIN}(최고), ${LEVEL_DIRECTOR}(디렉터), ${LEVEL_EDITOR}(에디터)에서만 사용합니다. 관리자 등록에서 레벨을 맞춘 뒤 다시 시도하세요.`
                    : undefined
                }
                onClick={() => setReapplyOpen(true)}
              >
                <RotateCcw className="h-4 w-4" />
                레벨 템플릿으로 재적용
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {permLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                불러오는 중…
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                          메뉴
                        </th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                          읽기
                        </th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                          쓰기
                        </th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                          삭제
                        </th>
                        <th className="w-24 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                            등록된 메뉴 권한이 없습니다. 아래에서 메뉴를 추가하세요.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 align-middle">
                              <div className="font-medium text-gray-900">{labelFor(row.menu_code)}</div>
                              <div className="text-xs text-gray-500">{row.menu_code}</div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Checkbox
                                checked={row.can_read}
                                disabled={savingId === row.id}
                                onCheckedChange={(v) => patchRow(row.id, { can_read: v === true })}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Checkbox
                                checked={row.can_write}
                                disabled={savingId === row.id}
                                onCheckedChange={(v) => patchRow(row.id, { can_write: v === true })}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <Checkbox
                                checked={row.can_delete}
                                disabled={savingId === row.id}
                                onCheckedChange={(v) => patchRow(row.id, { can_delete: v === true })}
                              />
                            </td>
                            <td className="px-4 py-3 text-right align-middle">
                              <Button
                                type="button"
                                size="sm"
                                className={adminActionBtn.red}
                                disabled={savingId === row.id}
                                aria-label="이 메뉴 권한 삭제"
                                onClick={() => {
                                  setDeleteRow(row)
                                  setDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                삭제
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                    <Plus className="h-4 w-4 text-gray-600" aria-hidden />
                    메뉴 추가
                  </div>
                  {catalogLoading ? (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      메뉴 마스터(sysCodeManager) 불러오는 중…
                    </p>
                  ) : catalogError ? (
                    <p className="text-sm text-red-600">
                      메뉴 목록을 불러오지 못했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
                    </p>
                  ) : addableCatalog.length === 0 ? (
                    <p className="text-sm text-gray-500">추가할 수 있는 메뉴가 없습니다.</p>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-[220px] space-y-2">
                        <Label className="text-sm text-gray-700">메뉴 코드</Label>
                        <Select value={addMenuCode} onValueChange={setAddMenuCode}>
                          <SelectTrigger className="border-gray-300 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {addableCatalog.map((m) => (
                              <SelectItem key={m.menu_code} value={m.menu_code}>
                                {m.label} ({m.menu_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <Checkbox checked={addRead} onCheckedChange={(v) => setAddRead(v === true)} />
                          읽기
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <Checkbox checked={addWrite} onCheckedChange={(v) => setAddWrite(v === true)} />
                          쓰기
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <Checkbox checked={addDelete} onCheckedChange={(v) => setAddDelete(v === true)} />
                          삭제
                        </label>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className={adminActionBtn.green}
                        onClick={handleAdd}
                        disabled={adding || !addMenuCode || catalogLoading}
                      >
                        {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        추가
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gray-200 bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Code className="h-4 w-4 text-gray-600" aria-hidden />
            템플릿과의 관계
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-6 text-sm text-gray-600">
          <p>
            신규 관리자 생성 시 자동 부여되는 메뉴 목록은 DB 테이블{' '}
            <code className="rounded bg-gray-100 px-1 text-xs text-gray-800">sysCodeManager</code>의{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">sysCodeVal</code> /{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">sysCodeVal1</code>(디렉터/에디터 템플릿)을 따릅니다.{' '}
            <Link
              href="/admin/settings/code"
              className="font-medium text-blue-700 underline-offset-4 hover:underline"
            >
              코드관리
            </Link>
            에서 동일 트리를 편집합니다. 운영 중 권한 변경은 이 화면의{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">user_permissions</code>가 우선합니다.
          </p>
        </CardContent>
      </Card>

      <Dialog open={reapplyOpen} onOpenChange={setReapplyOpen}>
        <DialogContent className="border-gray-200 bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">레벨 템플릿으로 재적용</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-gray-600">
                {targetUser ? (
                  <>
                    <p>
                      <strong className="text-gray-900">{targetUser.memberShipName}</strong> (
                      {targetUser.memberShipId}) · 현재 레벨{' '}
                      <strong className="text-gray-900">{targetUser.memberShipLevel}</strong> (
                      {levelRoleLabel(targetUser.memberShipLevel)})
                    </p>
                    {targetUser.memberShipLevel === LEVEL_SUPER_ADMIN ? (
                      <p>
                        최고관리자는 API에서 메뉴를 모두 통과합니다. 이 작업은{' '}
                        <strong className="text-gray-900">user_permissions 행을 모두 삭제</strong>합니다.
                      </p>
                    ) : targetUser.memberShipLevel === LEVEL_DIRECTOR ? (
                      <p>
                        <code className="rounded bg-gray-100 px-1 text-xs">sysCodeManager</code>에서{' '}
                        <code className="rounded bg-gray-100 px-1 text-xs">SYS26330B006</code> 하위 중{' '}
                        <code className="rounded bg-gray-100 px-1 text-xs">sysCodeVal=Y</code> 인 메뉴에 대해
                        디렉터 템플릿(읽기·쓰기·삭제 허용)으로{' '}
                        <strong className="text-gray-900">기존 권한을 모두 지우고 다시 채웁니다</strong>.
                      </p>
                    ) : targetUser.memberShipLevel === LEVEL_EDITOR ? (
                      <p>
                        <code className="rounded bg-gray-100 px-1 text-xs">sysCodeManager</code>에서{' '}
                        <code className="rounded bg-gray-100 px-1 text-xs">SYS26330B006</code> 하위 중{' '}
                        <code className="rounded bg-gray-100 px-1 text-xs">sysCodeVal1=Y</code> 인 메뉴에 대해
                        에디터 템플릿(읽기·쓰기, 삭제는 기본 비허용)으로{' '}
                        <strong className="text-gray-900">기존 권한을 모두 지우고 다시 채웁니다</strong>.
                      </p>
                    ) : (
                      <p>이 레벨에서는 재적용을 지원하지 않습니다.</p>
                    )}
                  </>
                ) : (
                  <p>대상 관리자 정보를 불러오지 못했습니다.</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              size="sm"
              className={adminActionBtn.gray}
              onClick={() => setReapplyOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className={adminActionBtn.green}
              onClick={confirmReapplyTemplate}
              disabled={reapplying || !targetUser || !canReapplyTemplateByLevel(targetUser.memberShipLevel)}
            >
              {reapplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              재적용 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gray-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">메뉴 권한 삭제</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {deleteRow
                ? `${labelFor(deleteRow.menu_code)} (${deleteRow.menu_code}) 권한 행을 삭제할까요?`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" size="sm" className={adminActionBtn.gray} onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className={adminActionBtn.red}
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
