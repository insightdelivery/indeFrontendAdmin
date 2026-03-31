import type { AdminMenuCatalogItem } from '@/services/menuPermissions'

export type CatalogTreeNode = AdminMenuCatalogItem & { children: CatalogTreeNode[] }

/**
 * sysCodeManager 하위 flat 목록 + 루트(SYS26330B006) → 계층 트리
 */
export function buildAdminMenuTree(
  items: AdminMenuCatalogItem[],
  rootSid: string
): CatalogTreeNode[] {
  const byCode = new Map<string, CatalogTreeNode>()
  for (const it of items) {
    byCode.set(it.menu_code, { ...it, children: [] })
  }
  const roots: CatalogTreeNode[] = []
  for (const it of items) {
    const node = byCode.get(it.menu_code)!
    const p = (it.parent_sid ?? '').trim()
    if (!p || p === rootSid) {
      roots.push(node)
    } else {
      const parent = byCode.get(p)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  const sortRec = (nodes: CatalogTreeNode[]) => {
    nodes.sort((a, b) => {
      const sa = a.sort ?? 0
      const sb = b.sort ?? 0
      if (sa !== sb) return sa - sb
      return a.menu_code.localeCompare(b.menu_code)
    })
    for (const n of nodes) sortRec(n.children)
  }
  sortRec(roots)
  return roots
}
