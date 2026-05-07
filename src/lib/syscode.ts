// syscode 데이터 관리 유틸리티
// localStorage에 24시간 캐시하여 관리

import apiClient from '@/lib/axios'

export interface SysCodeItem {
  sysCodeSid: string
  sysCodeName: string
  sysCodeValue: string
  sysCodeSort: number
  sysCodeUseFlag: string
}

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24시간 (밀리초)
const CACHE_KEY = 'sysCodeData' // 단일 캐시 키 사용

/** sysCodeManager(관리자 메뉴) 루트 — sysCodeData 캐시에서 제외(하위 포함) */
const SYSCODE_EXCLUDE_ROOT = 'SYS26330B006'

/** Display Event — eventTypeCode (eventBannerPlan) */
export const DISPLAY_EVENT_TYPE_PARENT = 'SYS26320B003'
/** Display Event — contentTypeCode */
export const DISPLAY_CONTENT_TYPE_PARENT = 'SYS26320B009'

/** 1:1 문의 유형 부모 코드 (inquiry_inquiry.inquiry_type = 하위 sysCodeSid) */
export const INQUIRY_TYPE_PARENT = 'SYS26330B001'

/** 로그인 직후 선로드할 parent_id 목록 (1회 bulk 호출 대상) */
export const SYSCODE_LOGIN_PARENT_IDS = [
  'SYS26209B002', // 아티클 카테고리
  'SYS26325B002', // 비디오 카테고리
  'SYS26325B003', // 세미나 카테고리
  'SYS26127B017', // 회원가입 지역(해외)
  'SYS26127B018', // 회원가입 지역(국내)
  'SYS26127B006', // 직분 코드
  'SYS26209B020', // 아티클 발행정보
  'SYS26209B015', // 아티클 공개범위
  DISPLAY_EVENT_TYPE_PARENT, // 전시 이벤트 타입
  DISPLAY_CONTENT_TYPE_PARENT, // 전시 콘텐츠 타입
  INQUIRY_TYPE_PARENT, // 1:1 문의 유형
] as const

type SysCodeTreeNode = {
  sysCodeSid: string
  sysCodeParentsSid?: string
  sysCodeName: string
  sysCodeVal?: string | null
  sysCodeValue?: string | null
  sysCodeSort?: number | null
  sysCodeUse?: string | null
  sysCodeUseFlag?: string | null
  children?: SysCodeTreeNode[]
}

// syscode 데이터를 localStorage에서 가져오기
export const getSysCodeFromCache = (sysCodeGubn: string): SysCodeItem[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    
    if (!cached) return null
    
    const allCacheData = JSON.parse(cached)
    const now = Date.now()
    
    // 전체 캐시가 만료되었는지 확인
    if (now - allCacheData.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    // 특정 sysCodeGubn의 데이터 반환
    return allCacheData[sysCodeGubn] || null
  } catch (error) {
    console.error('syscode 캐시 읽기 오류:', error)
    return null
  }
}

// syscode 데이터를 localStorage에 저장
export const setSysCodeToCache = (sysCodeGubn: string, data: SysCodeItem[]): void => {
  try {
    // 기존 캐시 데이터 가져오기
    const existingCache = localStorage.getItem(CACHE_KEY)
    let allCacheData: any = {
      timestamp: Date.now()
    }
    
    if (existingCache) {
      const parsed = JSON.parse(existingCache)
      // 캐시가 만료되지 않았다면 기존 데이터 유지
      if (Date.now() - parsed.timestamp <= CACHE_DURATION) {
        allCacheData = parsed
        allCacheData.timestamp = Date.now() // 타임스탬프 업데이트
      }
    }
    
    // 새로운 데이터 추가/업데이트
    allCacheData[sysCodeGubn] = data
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(allCacheData))
    console.log(`💾 sysCodeData 캐시 업데이트: ${sysCodeGubn}`, data)
  } catch (error) {
    console.error('syscode 캐시 저장 오류:', error)
  }
}

const toSysCodeItems = (rows: any[]): SysCodeItem[] => {
  return rows.map((item: any) => ({
    sysCodeSid: item.sysCodeSid,
    sysCodeName: item.sysCodeName,
    sysCodeValue: item.sysCodeVal || item.sysCodeValue || item.sysCodeSid,
    sysCodeSort: item.sysCodeSort || 0,
    sysCodeUseFlag: item.sysCodeUse || item.sysCodeUseFlag || 'Y'
  }))
}

const getValidCacheSeed = (): Record<string, any> => {
  const now = Date.now()
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return { timestamp: now }
  try {
    const parsed = JSON.parse(cached)
    if (now - parsed.timestamp <= CACHE_DURATION) {
      return { ...parsed, timestamp: now }
    }
  } catch {
    // 무시하고 신규 캐시 생성
  }
  return { timestamp: now }
}

/** 여러 parent_id의 syscode를 한 번에 localStorage에 저장 */
const setSysCodeBulkToCache = (payload: Record<string, SysCodeItem[]>): void => {
  try {
    const nextCache = getValidCacheSeed()
    Object.entries(payload).forEach(([parentId, rows]) => {
      nextCache[parentId] = rows
    })
    localStorage.setItem(CACHE_KEY, JSON.stringify(nextCache))
  } catch (error) {
    console.error('syscode bulk 캐시 저장 오류:', error)
  }
}

function unwrapApiArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data?.IndeAPIResponse?.ErrorCode === '00') return (data.IndeAPIResponse.Result ?? []) as T[]
  if (Array.isArray(data?.results)) return data.results as T[]
  if (Array.isArray(data?.Result)) return data.Result as T[]
  return []
}

async function fetchSysCodeManageTree(): Promise<SysCodeTreeNode[]> {
  try {
    const response = await apiClient.get('/systemmanage/syscode/code_tree')
    return unwrapApiArray<SysCodeTreeNode>(response.data)
  } catch (error) {
    console.error('❌ 시스템 코드 code_tree 조회 실패:', error)
    return []
  }
}

function buildCachePayloadFromTree(roots: SysCodeTreeNode[]): Record<string, SysCodeItem[]> {
  const payload: Record<string, SysCodeItem[]> = {}

  const visit = (node: SysCodeTreeNode, excluded: boolean) => {
    const isExcludedNode = excluded || node.sysCodeSid === SYSCODE_EXCLUDE_ROOT
    if (isExcludedNode) return

    const children = Array.isArray(node.children) ? node.children : []
    // 규칙:
    // - "하위(children)가 있는 노드"만 key로 저장한다.
    // - 하위에 포함된 leaf(자식 없는) 노드는 key로 따로 만들지 않는다. (빈 배열 key 방지)
    if (children.length > 0) {
      payload[node.sysCodeSid] = toSysCodeItems(children as any[])
      for (const ch of children) visit(ch, false)
    }
  }

  for (const root of roots) visit(root, false)
  return payload
}

/**
 * sysCodeManage(code_tree) 전체 데이터를 계층 기준으로 캐시에 채운다.
 * - localStorage 키는 단일 `sysCodeData`
 * - `SYS26330B006` 노드 및 하위(자식) 트리는 저장하지 않는다.
 */
export const hydrateSysCodeCacheFromManage = async (): Promise<void> => {
  try {
    const roots = await fetchSysCodeManageTree()
    const payload = buildCachePayloadFromTree(roots)
    setSysCodeBulkToCache(payload)
    console.log(`✅ sysCodeManage(code_tree) 캐시 저장 완료: ${Object.keys(payload).length}개 parent`)
  } catch (error) {
    console.error('❌ sysCodeManage(code_tree) 캐시 저장 실패:', error)
  }
}

// syscode 데이터를 API에서 가져오기
export const fetchSysCodeFromAPI = async (sysCodeGubn: string): Promise<SysCodeItem[]> => {
  try {
    console.log(`syscode API 호출: /systemmanage/syscode?sysCodeParentsSid=${sysCodeGubn}`)
    
    const response = await apiClient.get(`/systemmanage/syscode`, {
      params: {
        sysCodeParentsSid: sysCodeGubn
      }
    })
    
    console.log(`syscode API 응답 (${sysCodeGubn}):`, response.data)
    
    // ViewSet은 배열을 직접 반환하거나 객체로 감싸서 반환할 수 있음
    let syscodeList: any[] = []
    
    // IndeAPIResponse 구조 처리
    if (response.data?.IndeAPIResponse?.ErrorCode === '00') {
      console.log(`✅ IndeAPIResponse 구조로 데이터 파싱`)
      syscodeList = response.data.IndeAPIResponse.Result || []
    }
    // 배열 구조인 경우 (ViewSet 기본 응답)
    else if (Array.isArray(response.data)) {
      console.log(`✅ 배열 구조로 데이터 파싱`)
      syscodeList = response.data
    }
    // 객체로 감싸진 경우
    else if (response.data?.results && Array.isArray(response.data.results)) {
      console.log(`✅ results 배열 구조로 데이터 파싱`)
      syscodeList = response.data.results
    }
    else {
      throw new Error('알 수 없는 응답 형식입니다.')
    }
    
    return toSysCodeItems(syscodeList)
  } catch (error) {
    console.error(`syscode API 호출 오류 (${sysCodeGubn}):`, error)
    return []
  }
}

// syscode 데이터 가져오기 (캐시 우선). 캐시가 없으면 sysCodeManage(code_tree)로 전체를 채운 뒤 반환한다.
export const getSysCode = async (sysCodeGubn: string): Promise<SysCodeItem[]> => {
  const cachedData = getSysCodeFromCache(sysCodeGubn)
  if (cachedData !== null) {
    return cachedData
  }
  // 규칙: sysCodeManage 전체(하이락) 구조로 받아 캐시에 넣는다.
  clearSysCodeCache()
  await hydrateSysCodeCacheFromManage()
  return getSysCodeFromCache(sysCodeGubn) ?? []
}

// 특정 syscode의 이름 가져오기
export const getSysCodeName = (sysCodeList: SysCodeItem[], sysCodeValue: string): string => {
  // sysCodeSid로 먼저 찾기
  let item = sysCodeList.find(code => code.sysCodeSid === sysCodeValue)
  // 없으면 sysCodeValue로 찾기
  if (!item) {
    item = sysCodeList.find(code => code.sysCodeValue === sysCodeValue)
  }
  return item ? item.sysCodeName : sysCodeValue
}

// syscode 옵션 생성 (Select 컴포넌트용)
export const createSysCodeOptions = (sysCodeList: SysCodeItem[]) => {
  return sysCodeList
    .filter(code => code.sysCodeUseFlag === 'Y')
    .sort((a, b) => a.sysCodeSort - b.sysCodeSort)
    .map(code => ({
      value: code.sysCodeSid,
      label: code.sysCodeName
    }))
}

/**
 * 특정 부모 코드의 하위 레벨 시스템 코드 조회 (by_parent API)
 * @param parentId 부모 코드 ID (예: 'SYS26209B002')
 * @returns 시스템 코드 배열
 */
export const fetchSysCodeByParent = async (parentId: string): Promise<SysCodeItem[]> => {
  try {
    console.log(`📡 시스템 코드 하위 레벨 조회 API 호출: /systemmanage/syscode/by_parent?parent_id=${parentId}`)
    
    const response = await apiClient.get('/systemmanage/syscode/by_parent', {
      params: {
        parent_id: parentId
      }
    })
    
    console.log(`📥 시스템 코드 하위 레벨 API 응답 (${parentId}):`, response.data)
    
    let syscodeList: any[] = []
    
    // IndeAPIResponse 구조 처리
    if (response.data?.IndeAPIResponse?.ErrorCode === '00') {
      console.log(`✅ IndeAPIResponse 구조로 데이터 파싱`)
      syscodeList = response.data.IndeAPIResponse.Result || []
    }
    // 배열 구조인 경우 (ViewSet 기본 응답)
    else if (Array.isArray(response.data)) {
      console.log(`✅ 배열 구조로 데이터 파싱`)
      syscodeList = response.data
    }
    // 객체로 감싸진 경우
    else if (response.data?.results && Array.isArray(response.data.results)) {
      console.log(`✅ results 배열 구조로 데이터 파싱`)
      syscodeList = response.data.results
    }
    else {
      console.warn('알 수 없는 응답 형식:', response.data)
      return []
    }
    
    const mappedData = toSysCodeItems(syscodeList)
    
    console.log(`✅ 시스템 코드 하위 레벨 파싱 완료: ${mappedData.length}개 항목`)
    return mappedData
  } catch (error) {
    console.error(`❌ 시스템 코드 하위 레벨 API 호출 오류 (${parentId}):`, error)
    return []
  }
}

/**
 * 여러 부모 코드의 하위 레벨을 1회 bulk로 조회
 * @param parentIds 부모 코드 ID 목록
 */
export const fetchSysCodeBulkByParents = async (
  parentIds: readonly string[]
): Promise<Record<string, SysCodeItem[]>> => {
  try {
    const uniqueParentIds = Array.from(
      new Set(parentIds.map((id) => id.trim()).filter(Boolean))
    )
    if (!uniqueParentIds.length) return {}

    const response = await apiClient.get('/systemmanage/syscode/bulk', {
      params: {
        parent_ids: uniqueParentIds.join(',')
      }
    })

    const raw = response.data?.IndeAPIResponse?.Result ?? response.data ?? {}
    const result: Record<string, SysCodeItem[]> = {}
    uniqueParentIds.forEach((parentId) => {
      const rows = Array.isArray(raw?.[parentId]) ? raw[parentId] : []
      result[parentId] = toSysCodeItems(rows)
    })
    return result
  } catch (error) {
    console.error('❌ 시스템 코드 bulk 조회 실패:', error)
    return {}
  }
}

/** 로그인 전환 등 이전 세션 캐시를 버릴 때 사용 (단일 키 `sysCodeData`). */
export const clearSysCodeCache = (): void => {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // quota / 비프라이빗 모드 등은 무시
  }
}

/**
 * 로그인 시 기존 sysCodeData를 비운 뒤, sysCodeManage(code_tree)의 전체 데이터를
 * 하이락(계층) 구조로 받아 localStorage에 저장한다.
 * (단, SYS26330B006 및 하위 트리는 저장하지 않음)
 */
export const loadSysCodeOnLogin = async (
  parentIds: readonly string[] = SYSCODE_LOGIN_PARENT_IDS
): Promise<void> => {
  clearSysCodeCache()
  try {
    await hydrateSysCodeCacheFromManage()
  } catch (error) {
    console.error('❌ 로그인 시 시스템 코드 로드 실패:', error)
  }
}


