import apiClient from '@/lib/axios'

export interface MenuPermissionRow {
  id: number
  menu_code: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

export interface MenuPermissionTargetUser {
  memberShipSid: string
  memberShipId: string
  memberShipName: string
  memberShipLevel: number
  /** 없으면 활성으로 간주(구 API 호환) */
  is_active?: boolean
}

interface IndeRoot<T> {
  IndeAPIResponse?: {
    ErrorCode: string
    Message: string
    Result?: T
  }
}

function unwrapResult<T>(data: unknown): T {
  const root = data as IndeRoot<T>
  if (root.IndeAPIResponse) {
    const { ErrorCode, Message, Result } = root.IndeAPIResponse
    if (ErrorCode !== '00') {
      throw new Error(Message || '요청에 실패했습니다.')
    }
    if (Result === undefined) {
      throw new Error('응답 데이터가 없습니다.')
    }
    return Result as T
  }
  return data as T
}

function unwrapMessage(data: unknown): string {
  const root = data as IndeRoot<{ message?: string }>
  if (root.IndeAPIResponse) {
    if (root.IndeAPIResponse.ErrorCode !== '00') {
      throw new Error(root.IndeAPIResponse.Message || '요청에 실패했습니다.')
    }
    return root.IndeAPIResponse.Result?.message ?? root.IndeAPIResponse.Message ?? '처리되었습니다.'
  }
  return '처리되었습니다.'
}

export interface AdminMenuCatalogItem {
  menu_code: string
  label: string
  sort: number | null
  /** SYS26330B006 루트 또는 상위 메뉴 sysCodeSid */
  parent_sid?: string
}

/** SYS26330B006 하위 sysCodeManager 메뉴 (표시명·권한 부여 가능 코드) */
export async function fetchAdminMenuCatalog(): Promise<{
  admin_menu_root: string
  items: AdminMenuCatalogItem[]
}> {
  const { data } = await apiClient.get('/adminMember/user-permissions/menu-catalog')
  return unwrapResult(data)
}

export async function fetchUserMenuPermissions(userId: string): Promise<{
  target_user: MenuPermissionTargetUser
  permissions: MenuPermissionRow[]
}> {
  const { data } = await apiClient.get('/adminMember/user-permissions', {
    params: { user_id: userId },
  })
  return unwrapResult(data)
}

export async function createUserMenuPermission(data: {
  user_id: string
  menu_code: string
  can_read?: boolean
  can_write?: boolean
  can_delete?: boolean
}): Promise<MenuPermissionRow> {
  const { data: res } = await apiClient.post('/adminMember/user-permissions', data)
  const out = unwrapResult<{ permission: MenuPermissionRow }>(res)
  return out.permission
}

export async function updateUserMenuPermission(
  id: number,
  patch: Partial<Pick<MenuPermissionRow, 'can_read' | 'can_write' | 'can_delete'>>
): Promise<MenuPermissionRow> {
  const { data: res } = await apiClient.put(`/adminMember/user-permissions/${id}`, patch)
  const out = unwrapResult<{ permission: MenuPermissionRow }>(res)
  return out.permission
}

export async function deleteUserMenuPermission(id: number): Promise<void> {
  const { data: res } = await apiClient.delete(`/adminMember/user-permissions/${id}`)
  unwrapMessage(res)
}

export interface ReapplyTemplateResult {
  memberShipLevel: number
  mode: 'super_admin' | 'template' | 'inactive_clear'
  admin_role: string
  rows_created: number
  rows_cleared: number | null
  /** strict | relaxed_use | val_only | none — sysCodeManager 매칭 단계 */
  template_match_mode?: string
  /** 템플릿 조건에 맞은 sysCodeManager 행 수(sysCodeSid 비어 있으면 user_permissions는 더 적을 수 있음) */
  scm_template_rows?: number
  skipped_empty_sysCodeSid?: number
  admin_menu_root?: string
  admin_menu_descendant_count?: number
}

/** 현재 memberShipLevel에 맞춰 sysCodeManager 템플릿으로 user_permissions 재생성 (1·5·6만) */
export async function reapplyTemplatePermissions(userId: string): Promise<ReapplyTemplateResult> {
  const { data: res } = await apiClient.post('/adminMember/user-permissions/reapply-template', {
    user_id: userId,
  })
  const wrapped = unwrapResult<{ result: ReapplyTemplateResult }>(res)
  return wrapped.result
}
