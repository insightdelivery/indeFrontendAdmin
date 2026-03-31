'use client'

import type { CatalogTreeNode } from '@/lib/buildAdminMenuTree'
import type { MenuPermissionRow } from '@/services/menuPermissions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'

type Props = {
  nodes: CatalogTreeNode[]
  depth: number
  permByCode: Map<string, MenuPermissionRow>
  disabled: boolean
  /** 레벨 1(최고관리자) 등 — 메뉴 사용 스위치 비표시 */
  hideMenuUseSwitch?: boolean
  savingMenuCode: string | null
  onToggleAccess: (menuCode: string, enabled: boolean) => void
  onPatch: (id: number, patch: Partial<Pick<MenuPermissionRow, 'can_read' | 'can_write' | 'can_delete'>>) => void
  onRequestDelete: (row: MenuPermissionRow) => void
}

type RowProps = Omit<Props, 'nodes'> & { node: CatalogTreeNode }

export function MenuPermissionTree({
  nodes,
  depth,
  permByCode,
  disabled,
  hideMenuUseSwitch = false,
  savingMenuCode,
  onToggleAccess,
  onPatch,
  onRequestDelete,
}: Props) {
  return (
    <ul className={cn('space-y-0', depth > 0 && 'ml-4 border-l border-gray-200 pl-3')}>
      {nodes.map((node) => (
        <MenuPermissionTreeRow
          key={node.menu_code}
          node={node}
          depth={depth}
          permByCode={permByCode}
          disabled={disabled}
          hideMenuUseSwitch={hideMenuUseSwitch}
          savingMenuCode={savingMenuCode}
          onToggleAccess={onToggleAccess}
          onPatch={onPatch}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </ul>
  )
}

function MenuPermissionTreeRow({
  node,
  depth,
  permByCode,
  disabled,
  hideMenuUseSwitch = false,
  savingMenuCode,
  onToggleAccess,
  onPatch,
  onRequestDelete,
}: RowProps) {
  const [open, setOpen] = useState(true)
  const row = permByCode.get(node.menu_code)
  const hasChildren = node.children.length > 0
  const busy = savingMenuCode === node.menu_code
  const accessOn = !!(row && row.can_read)

  return (
    <li className="list-none">
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100 py-2.5 pr-1 text-sm',
          depth === 0 && 'bg-gray-50/50'
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900">{node.label}</div>
          <div className="text-xs text-gray-500">{node.menu_code}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {!hideMenuUseSwitch ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">메뉴 사용</span>
              <Switch
                checked={accessOn}
                disabled={disabled || busy}
                onCheckedChange={(v) => onToggleAccess(node.menu_code, v === true)}
                aria-label={`${node.label} 메뉴 사용`}
              />
            </div>
          ) : null}
          {row && accessOn ? (
            <>
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <Checkbox
                  checked={row.can_write}
                  disabled={disabled || busy}
                  onCheckedChange={(v) => onPatch(row.id, { can_write: v === true })}
                />
                쓰기
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <Checkbox
                  checked={row.can_delete}
                  disabled={disabled || busy}
                  onCheckedChange={(v) => onPatch(row.id, { can_delete: v === true })}
                />
                삭제
              </label>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                disabled={disabled || busy}
                onClick={() => onRequestDelete(row)}
                aria-label="권한 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {hasChildren && open ? (
        <MenuPermissionTree
          nodes={node.children}
          depth={depth + 1}
          permByCode={permByCode}
          disabled={disabled}
          hideMenuUseSwitch={hideMenuUseSwitch}
          savingMenuCode={savingMenuCode}
          onToggleAccess={onToggleAccess}
          onPatch={onPatch}
          onRequestDelete={onRequestDelete}
        />
      ) : null}
    </li>
  )
}
