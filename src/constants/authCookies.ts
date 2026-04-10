/**
 * 관리자 `userInfo` 일반 쿠키 만료(일).
 * HttpOnly refresh와 크게 어긋나지 않게 UI용 표시 정보(이름·권한 캐시)가 먼저 사라지지 않도록 함.
 *
 * 인증 판별은 메모리 access token + HttpOnly refresh → `/adminMember/tokenrefresh` 만 사용한다.
 */
export const ADMIN_USER_INFO_COOKIE_EXPIRES_DAYS = 7
