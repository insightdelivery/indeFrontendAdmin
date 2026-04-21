/**
 * 아티클·비디오·세미나 공통 발행 상태 sysCodeSid.
 * articleDbPlan.me §2.3.2 (SYS26209B021~024) + 삭제 SYS26209B025.
 */
export const CONTENT_PUBLISH_STATUS = {
  PUBLISHED: 'SYS26209B021',
  DRAFT: 'SYS26209B022',
  PRIVATE: 'SYS26209B023',
  SCHEDULED: 'SYS26209B024',
  DELETED: 'SYS26209B025',
} as const

export type ContentPublishStatusSid = (typeof CONTENT_PUBLISH_STATUS)[keyof typeof CONTENT_PUBLISH_STATUS]
