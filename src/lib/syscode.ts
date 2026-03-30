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

interface SysCodeCache {
  data: SysCodeItem[]
  timestamp: number
}

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24시간 (밀리초)
const CACHE_KEY = 'sysCodeData' // 단일 캐시 키 사용

/** Display Event — eventTypeCode (eventBannerPlan) */
export const DISPLAY_EVENT_TYPE_PARENT = 'SYS26320B003'
/** Display Event — contentTypeCode */
export const DISPLAY_CONTENT_TYPE_PARENT = 'SYS26320B009'

/** 1:1 문의 유형 부모 코드 (inquiry_inquiry.inquiry_type = 하위 sysCodeSid) */
export const INQUIRY_TYPE_PARENT = 'SYS26330B001'

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
    
    return syscodeList.map((item: any) => ({
      sysCodeSid: item.sysCodeSid,
      sysCodeName: item.sysCodeName,
      sysCodeValue: item.sysCodeVal || item.sysCodeValue || item.sysCodeSid,
      sysCodeSort: item.sysCodeSort || 0,
      sysCodeUseFlag: item.sysCodeUse || item.sysCodeUseFlag || 'Y'
    }))
  } catch (error) {
    console.error(`syscode API 호출 오류 (${sysCodeGubn}):`, error)
    return []
  }
}

// syscode 데이터 가져오기 (캐시 우선, 없으면 API 호출). 빈 배열도 캐시 히트로 본다.
export const getSysCode = async (sysCodeGubn: string): Promise<SysCodeItem[]> => {
  const cachedData = getSysCodeFromCache(sysCodeGubn)
  if (cachedData !== null) {
    return cachedData
  }
  const apiData = await fetchSysCodeFromAPI(sysCodeGubn)
  setSysCodeToCache(sysCodeGubn, apiData)
  return apiData
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
    
    const mappedData = syscodeList.map((item: any) => ({
      sysCodeSid: item.sysCodeSid,
      sysCodeName: item.sysCodeName,
      sysCodeValue: item.sysCodeVal || item.sysCodeValue || item.sysCodeSid,
      sysCodeSort: item.sysCodeSort || 0,
      sysCodeUseFlag: item.sysCodeUse || item.sysCodeUseFlag || 'Y'
    }))
    
    console.log(`✅ 시스템 코드 하위 레벨 파싱 완료: ${mappedData.length}개 항목`)
    return mappedData
  } catch (error) {
    console.error(`❌ 시스템 코드 하위 레벨 API 호출 오류 (${parentId}):`, error)
    return []
  }
}

/**
 * 로그인 시 특정 부모 코드의 하위 레벨을 가져와서 localStorage에 저장
 * @param parentId 부모 코드 ID (기본값: 'SYS26209B002')
 */
export const loadSysCodeOnLogin = async (parentId: string = 'SYS26209B002'): Promise<void> => {
  try {
    console.log(`🚀 로그인 시 시스템 코드 로드 시작: ${parentId}`)
    
    // API에서 데이터 가져오기
    const sysCodeData = await fetchSysCodeByParent(parentId)
    
    if (sysCodeData.length > 0) {
      // localStorage에 저장
      setSysCodeToCache(parentId, sysCodeData)
      console.log(`✅ 로그인 시 시스템 코드 저장 완료: ${parentId} (${sysCodeData.length}개 항목)`)
    } else {
      console.warn(`⚠️ 로그인 시 시스템 코드 데이터가 비어있음: ${parentId}`)
    }
  } catch (error) {
    console.error(`❌ 로그인 시 시스템 코드 로드 실패 (${parentId}):`, error)
  }
}


