/** 아티클/비디오/세미나 관리 목록 테이블 공통 토큰 */

export const ADMIN_CONTENT_TABLE_HEAD_TH =
  'px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-[#fff] whitespace-nowrap'

export function splitPublishedAtListParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return {
    date: d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    time: d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

/** 비디오·세미나 목록 (썸네일·제목 가변 + 나머지 고정폭) */
export const VIDEO_LIST_COL_CHK = 'w-10 min-w-10 max-w-10 px-2'
export const VIDEO_LIST_COL_THUMB = 'w-[72px] min-w-[72px] max-w-[72px] px-2'
export const VIDEO_LIST_COL_CAT = 'w-[120px] min-w-[120px] max-w-[120px] px-2'
export const VIDEO_LIST_COL_TITLE = 'min-w-0 px-3 py-4'
export const VIDEO_LIST_COL_SPEAKER = 'w-[104px] min-w-[104px] max-w-[104px] px-2'
export const VIDEO_LIST_COL_PUBL = 'w-[92px] min-w-[92px] max-w-[92px] px-2'
export const VIDEO_LIST_COL_VIEW = 'w-[68px] min-w-[68px] max-w-[68px] px-2'
export const VIDEO_LIST_COL_STAR = 'w-[52px] min-w-[52px] max-w-[52px] px-2'
export const VIDEO_LIST_COL_COMMENT = 'w-[52px] min-w-[52px] max-w-[52px] px-2'
export const VIDEO_LIST_COL_QA = 'w-[68px] min-w-[68px] max-w-[68px] px-2'
export const VIDEO_LIST_COL_BOOKMARK = 'w-[56px] min-w-[56px] max-w-[56px] px-2'
export const VIDEO_LIST_COL_VIS = 'w-[120px] min-w-[120px] max-w-[120px] px-2'
export const VIDEO_LIST_COL_ACTIONS = 'w-20 min-w-20 max-w-20 px-0.5'
