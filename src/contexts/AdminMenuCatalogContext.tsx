'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchAdminMenuCatalog,
  type AdminMenuCatalogItem,
} from '@/services/menuPermissions'

type AdminMenuCatalogContextValue = {
  adminMenuRoot: string | null
  items: AdminMenuCatalogItem[]
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  /** DB 메뉴 마스터 기준 표시명; 없으면 코드 그대로 */
  labelFor: (menuCode: string) => string
}

const AdminMenuCatalogContext = createContext<AdminMenuCatalogContextValue | null>(null)

export function AdminMenuCatalogProvider({ children }: { children: ReactNode }) {
  const [adminMenuRoot, setAdminMenuRoot] = useState<string | null>(null)
  const [items, setItems] = useState<AdminMenuCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAdminMenuCatalog()
      setAdminMenuRoot(res.admin_menu_root)
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      setItems([])
      setAdminMenuRoot(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const labelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) {
      m.set(it.menu_code, it.label)
    }
    return m
  }, [items])

  const labelFor = useCallback(
    (menuCode: string) => labelMap.get(menuCode) ?? menuCode,
    [labelMap]
  )

  const value = useMemo(
    () => ({
      adminMenuRoot,
      items,
      loading,
      error,
      reload,
      labelFor,
    }),
    [adminMenuRoot, items, loading, error, reload, labelFor]
  )

  return (
    <AdminMenuCatalogContext.Provider value={value}>{children}</AdminMenuCatalogContext.Provider>
  )
}

export function useAdminMenuCatalog(): AdminMenuCatalogContextValue {
  const ctx = useContext(AdminMenuCatalogContext)
  if (!ctx) {
    throw new Error('useAdminMenuCatalog는 AdminMenuCatalogProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}
