/**
 * 관리자 인증 쿠키 키 (공개 사이트 accessToken/refreshToken과 분리)
 * - 동일 도메인에서 공개·관리자 토큰이 섞이면 admin 토큰 갱신 시 401 발생
 */
export const ADMIN_ACCESS_TOKEN_KEY = 'adminAccessToken'
export const ADMIN_REFRESH_TOKEN_KEY = 'adminRefreshToken'
export const ADMIN_USER_INFO_KEY = 'adminUserInfo'
