/** 관리자 access JWT — 메모리만 (frontend_adminRules.md). 새로고침 시 사라짐 → tokenrefresh 로 복구. */
let memoryAccessToken: string | null = null

export function setAdminAccessToken(token: string | null): void {
  memoryAccessToken = token && token.trim() ? token.trim() : null
}

export function getAdminAccessToken(): string | null {
  return memoryAccessToken
}

export function clearAdminAccessToken(): void {
  memoryAccessToken = null
}
