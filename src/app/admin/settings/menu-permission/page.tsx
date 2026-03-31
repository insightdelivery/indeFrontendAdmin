'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getAdminListPaged, type AdminMember } from '@/services/admin'
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
import { buildAdminMenuTree } from '@/lib/buildAdminMenuTree'
import { MenuPermissionTree } from '@/components/admin/MenuPermissionTree'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Code, Loader2, RotateCcw, Search, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

/** adminLayoutPlan.md §16.2.1 */
const adminActionBtn = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200',
  red: 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200',
} as const

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

/** 비활성 계정은 레벨과 무관하게 재적용(전체 삭제), 활성은 1·5·6만 */
function canReapplyTemplateForUser(u: MenuPermissionTargetUser | null): boolean {
  if (!u) return false
  if (u.is_active === false) return true
  return canReapplyTemplateByLevel(u.memberShipLevel)
}

export default function MenuPermissionPage() {
  const { toast } = useToast()
  const {
    items: menuMasterItems,
    adminMenuRoot,
    labelFor,
    loading: catalogLoading,
    error: catalogError,
  } = useAdminMenuCatalog()

  const [admins, setAdmins] = useState<AdminMember[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [adminPage, setAdminPage] = useState(1)
  const [adminPageSize] = useState(15)
  const [adminTotal, setAdminTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [selectedSid, setSelectedSid] = useState<string>('')
  const [targetUser, setTargetUser] = useState<MenuPermissionTargetUser | null>(null)
  const [rows, setRows] = useState<MenuPermissionRow[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [savingMenuCode, setSavingMenuCode] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<MenuPermissionRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reapplyOpen, setReapplyOpen] = useState(false)
  const [reapplying, setReapplying] = useState(false)

  const loadAdminsPaged = useCallback(async () => {
    try {
      setAdminsLoading(true)
      const r = await getAdminListPaged({
        q: searchApplied.trim() || undefined,
        page: adminPage,
        pageSize: adminPageSize,
      })
      setAdmins(r.admins)
      setAdminTotal(r.total)
    } catch (e: unknown) {
      toast({
        title: '관리자 목록 실패',
        description: e instanceof Error ? e.message : '목록을 불러오지 못했습니다.',
        variant: 'destructive',
      })
    } finally {
      setAdminsLoading(false)
    }
  }, [toast, searchApplied, adminPage, adminPageSize])

  useEffect(() => {
    loadAdminsPaged()
  }, [loadAdminsPaged])

  const applySearch = useCallback(() => {
    setSearchApplied(searchInput.trim())
    setAdminPage(1)
  }, [searchInput])

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
    if (selectedSid) loadPermissions(selectedSid)
    else {
      setTargetUser(null)
      setRows([])
    }
  }, [selectedSid, loadPermissions])

  const permByCode = useMemo(() => {
    const m = new Map<string, MenuPermissionRow>()
    for (const r of rows) m.set(r.menu_code, r)
    return m
  }, [rows])

  const menuTree = useMemo(() => {
    const root = adminMenuRoot?.trim() || 'SYS26330B006'
    return buildAdminMenuTree(menuMasterItems, root)
  }, [menuMasterItems, adminMenuRoot])

  const patchRow = async (
    id: number,
    patch: Partial<Pick<MenuPermissionRow, 'can_read' | 'can_write' | 'can_delete'>>,
    options?: { silent?: boolean }
  ) => {
    try {
      const updated = await updateUserMenuPermission(id, patch)
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      if (!options?.silent) {
        toast({ title: '저장됨', description: '권한이 반영되었습니다.' })
      }
    } catch (e: unknown) {
      toast({
        title: '저장 실패',
        description: e instanceof Error ? e.message : '수정에 실패했습니다.',
        variant: 'destructive',
      })
      if (selectedSid) await loadPermissions(selectedSid)
    }
  }

  const handleToggleAccess = async (menuCode: string, enabled: boolean) => {
    if (!selectedSid) return
    const existing = permByCode.get(menuCode)
    setSavingMenuCode(menuCode)
    try {
      if (enabled) {
        if (existing) {
          if (!existing.can_read) {
            await patchRow(existing.id, { can_read: true }, { silent: true })
          }
        } else {
          const created = await createUserMenuPermission({
            user_id: selectedSid,
            menu_code: menuCode,
            can_read: true,
            can_write: false,
            can_delete: false,
          })
          setRows((prev) => [...prev, created].sort((a, b) => a.menu_code.localeCompare(b.menu_code)))
          toast({ title: '메뉴 활성화', description: `${labelFor(menuCode)} 권한을 추가했습니다.` })
        }
      } else if (existing) {
        await deleteUserMenuPermission(existing.id)
        setRows((prev) => prev.filter((r) => r.id !== existing.id))
        toast({ title: '메뉴 비활성화', description: `${labelFor(menuCode)} 권한을 제거했습니다.` })
      }
    } catch (e: unknown) {
      toast({
        title: '처리 실패',
        description: e instanceof Error ? e.message : '요청에 실패했습니다.',
        variant: 'destructive',
      })
      if (selectedSid) await loadPermissions(selectedSid)
    } finally {
      setSavingMenuCode(null)
    }
  }

  const handlePatchFromTree = (
    id: number,
    patch: Partial<Pick<MenuPermissionRow, 'can_read' | 'can_write' | 'can_delete'>>
  ) => {
    void patchRow(id, patch, { silent: true })
  }

  const confirmReapplyTemplate = async () => {
    if (!selectedSid || !targetUser) return
    try {
      setReapplying(true)
      const result = await reapplyTemplatePermissions(selectedSid)
      await loadPermissions(selectedSid)
      setReapplyOpen(false)
      if (result.mode === 'inactive_clear') {
        toast({
          title: '메뉴 권한 정리 완료',
          description: `비활성 관리자: 부여된 메뉴 권한 ${result.rows_cleared ?? 0}건을 삭제했습니다.`,
        })
      } else if (result.mode === 'super_admin') {
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
  const totalPages = Math.max(1, Math.ceil(adminTotal / adminPageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0 pr-4">
          <h1 className="text-lg font-semibold text-gray-900">메뉴 권한</h1>
          <p className="text-sm text-gray-600 mt-1">
            왼쪽에서 관리자를 선택하면 오른쪽에{' '}
            <code className="rounded bg-gray-100 px-1 text-xs text-gray-800">sysCodeManager</code> 메뉴 트리와{' '}
            <code className="rounded bg-gray-100 px-1 text-xs text-gray-800">user_permissions</code>가
            반영됩니다.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(440px,min(52vw,640px))_minmax(0,1fr)] lg:items-start">
        {/* 좌: 관리자 목록 */}
        <Card className="border-gray-200 bg-white lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
          <CardHeader className="shrink-0 border-b border-gray-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Shield className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
              관리자
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              <Link
                href="/admin/settings/admin-register"
                className="font-medium text-blue-700 underline-offset-4 hover:underline"
              >
                관리자 등록
              </Link>
              과 동일 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="border-gray-300 bg-white pl-9"
                  placeholder="아이디·이름 검색"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className={adminActionBtn.blue}
                onClick={applySearch}
                disabled={adminsLoading}
              >
                검색
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
              {adminsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  불러오는 중…
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="whitespace-nowrap px-2 py-2 pl-3">고유코드</th>
                      <th className="px-3 py-2">이름</th>
                      <th className="px-3 py-2">아이디</th>
                      <th className="px-2 py-2 text-center">레벨</th>
                      <th className="px-2 py-2 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      admins.map((a) => (
                        <tr
                          key={a.memberShipSid}
                          className={cn(
                            'cursor-pointer hover:bg-gray-50',
                            selectedSid === a.memberShipSid && 'bg-blue-50/80'
                          )}
                          onClick={() => setSelectedSid(a.memberShipSid)}
                        >
                          <td className="whitespace-nowrap px-2 py-2.5 pl-3 font-mono text-xs text-gray-800">
                            {a.memberShipSid}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{a.memberShipName}</td>
                          <td className="px-3 py-2.5 text-gray-700">{a.memberShipId}</td>
                          <td className="px-2 py-2.5 text-center text-gray-600">{a.memberShipLevel}</td>
                          <td className="px-2 py-2.5 text-center">
                            {a.is_active ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                활성
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                                비활성
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
              <span>
                총 {adminTotal}명 · 페이지당 {adminPageSize}명 · {adminPage}/{totalPages}페이지
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={adminsLoading || adminPage <= 1}
                  onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={adminsLoading || adminPage >= totalPages}
                  onClick={() => setAdminPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 우: 메뉴 트리 */}
        <div className="space-y-4 min-w-0">
          {!selectedSid ? (
            <Card className="border-dashed border-gray-300 bg-gray-50/50">
              <CardContent className="py-12 text-center text-sm text-gray-600">
                왼쪽 목록에서 관리자를 선택하면 메뉴 권한이 표시됩니다.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200 bg-white">
              <CardHeader className="flex flex-col gap-3 border-b border-gray-100 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold text-gray-900">
                    {targetUser?.memberShipName ?? '…'}{' '}
                    <span className="font-normal text-gray-600">({targetUser?.memberShipId})</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    메뉴 사용 ON 시 읽기 권한이 부여됩니다.
                    <br />
                    비활성 관리자의 경우 &quot;레벨별 메뉴 권한 재적용&quot; 시 메뉴 사용 권한이 모두 삭제됩니다.
                  </CardDescription>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className={`gap-2 ${adminActionBtn.purple}`}
                    disabled={!targetUser || permLoading || !canReapplyTemplateForUser(targetUser)}
                    onClick={() => setReapplyOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    레벨별 메뉴 권한 재적용
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isSuperTarget ? (
                  <div
                    className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
                    role="status"
                  >
                    최고관리자(Lv.{LEVEL_SUPER_ADMIN})는 API에서 모든 메뉴를 통과합니다. 따로 설정 할 필요가 없습니다.
                  </div>
                ) : null}

                {permLoading || catalogLoading ? (
                  <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    불러오는 중…
                  </div>
                ) : catalogError ? (
                  <p className="py-8 text-sm text-red-600">
                    메뉴 트리를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
                  </p>
                ) : menuTree.length === 0 ? (
                  <p className="py-8 text-sm text-gray-500">
                    표시할 메뉴가 없습니다. sysCodeManager에서 관리자 메뉴(SYS26330B006 하위)를 확인하세요.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-2">
                    <MenuPermissionTree
                      nodes={menuTree}
                      depth={0}
                      permByCode={permByCode}
                      disabled={false}
                      hideMenuUseSwitch={Boolean(isSuperTarget)}
                      savingMenuCode={savingMenuCode}
                      onToggleAccess={handleToggleAccess}
                      onPatch={handlePatchFromTree}
                      onRequestDelete={(row) => {
                        setDeleteRow(row)
                        setDeleteOpen(true)
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={reapplyOpen} onOpenChange={setReapplyOpen}>
        <DialogContent className="border-gray-200 bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {targetUser?.is_active === false
                ? '비활성 관리자 · 메뉴 권한 삭제'
                : '레벨 템플릿으로 재적용'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-gray-600">
                {targetUser ? (
                  <>
                    <p>
                      <strong className="text-gray-900">{targetUser.memberShipName}</strong> (
                      {targetUser.memberShipId}) · Lv.{targetUser.memberShipLevel} (
                      {levelRoleLabel(targetUser.memberShipLevel)})
                      {targetUser.is_active === false ? (
                        <span className="ml-2 text-gray-500">· 비활성</span>
                      ) : null}
                    </p>
                    {targetUser.is_active === false ? (
                      <p>
                        비활성 계정은 템플릿을 적용하지 않고, 부여된{' '}
                        <strong className="text-gray-900">user_permissions</strong> 행을{' '}
                        <strong className="text-gray-900">모두 삭제</strong>합니다.
                      </p>
                    ) : targetUser.memberShipLevel === LEVEL_SUPER_ADMIN ? (
                      <p>
                        최고관리자: 이 작업은 <strong className="text-gray-900">user_permissions 행 전부 삭제</strong>
                        합니다.
                      </p>
                    ) : targetUser.memberShipLevel === LEVEL_DIRECTOR ? (
                      <p>
                        SYS26330B006 하위 중 sysCodeVal=Y 인 메뉴에 디렉터 템플릿으로 기존 권한을 대체합니다.
                      </p>
                    ) : targetUser.memberShipLevel === LEVEL_EDITOR ? (
                      <p>
                        SYS26330B006 하위 중 sysCodeVal1=Y 인 메뉴에 에디터 템플릿으로 기존 권한을 대체합니다.
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
            <Button type="button" size="sm" className={adminActionBtn.gray} onClick={() => setReapplyOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              className={targetUser?.is_active === false ? adminActionBtn.red : adminActionBtn.green}
              onClick={confirmReapplyTemplate}
              disabled={reapplying || !targetUser || !canReapplyTemplateForUser(targetUser)}
            >
              {reapplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {targetUser?.is_active === false ? '전체 삭제 실행' : '재적용 실행'}
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
                ? `${labelFor(deleteRow.menu_code)} (${deleteRow.menu_code}) 권한을 삭제할까요?`
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
