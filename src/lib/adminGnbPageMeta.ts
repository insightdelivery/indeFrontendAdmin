/**
 * 관리자 GNB(상단 헤더)에 표시할 페이지별 제목·부제.
 * pathname은 usePathname() 기준(쿼리스트링 없음).
 */

export type AdminGnbPageMeta = { title: string; subtitle?: string }

const EXACT: Record<string, AdminGnbPageMeta> = {
  '/admin/articles': {
    title: '아티클 관리',
    subtitle: '아티클을 검색·필터링하고 관리할 수 있습니다.',
  },
  '/admin/articles/trash': {
    title: '휴지통',
    subtitle: '삭제된 아티클을 관리하고 복구할 수 있습니다.',
  },
  '/admin/articles/new': {
    title: '새 아티클 등록',
    subtitle: '아티클 정보를 입력하고 등록하세요.',
  },
  '/admin/articles/edit': {
    title: '아티클 수정',
    subtitle: '아티클 정보를 수정하세요.',
  },
  '/admin/video': {
    title: '비디오 관리',
    subtitle: '비디오 콘텐츠를 검색·필터링하고 관리할 수 있습니다.',
  },
  '/admin/video/new': {
    title: '새 비디오 등록',
    subtitle: '비디오 정보를 입력하고 등록하세요.',
  },
  '/admin/video/edit': {
    title: '비디오 수정',
    subtitle: '비디오 정보를 수정하세요.',
  },
  '/admin/video/detail': {
    title: '비디오 상세',
    subtitle: '비디오 콘텐츠 정보를 확인합니다.',
  },
  '/admin/seminar': {
    title: '세미나 관리',
    subtitle: '세미나 콘텐츠를 검색·필터링하고 관리할 수 있습니다.',
  },
  '/admin/seminar/new': {
    title: '새 세미나 등록',
    subtitle: '세미나 정보를 입력하고 등록하세요.',
  },
  '/admin/seminar/edit': {
    title: '세미나 수정',
    subtitle: '세미나 정보를 수정하세요.',
  },
  '/admin/seminar/detail': {
    title: '세미나 상세',
    subtitle: '세미나 콘텐츠 정보를 확인합니다.',
  },
  '/admin/curation': {
    title: '특집(큐레이션) 관리',
    subtitle: '한 특집에 여러 콘텐츠를 담아 메인 등에 노출합니다. (curationContentPlan)',
  },
  '/admin/contentAuthor': {
    title: '작성자 관리',
    subtitle: '콘텐츠 저자(에디터/디렉터)를 등록·수정·삭제합니다.',
  },
  '/admin/contentAuthor/new': {
    title: '작성자 등록',
    subtitle:
      '콘텐츠 저자(에디터/디렉터)를 등록합니다. 프로필 이미지와 연결 관리자를 선택할 수 있습니다.',
  },
  '/admin/contentAuthor/edit': {
    title: '작성자 수정',
    subtitle: '저자 정보를 수정합니다. 프로필 이미지와 연결 관리자를 변경할 수 있습니다.',
  },
  '/admin/display-events': {
    title: '이벤트 베너 관리',
    subtitle: 'Hero 배너 등 노출 행을 관리합니다. (eventBannerPlan)',
  },
  '/admin/display-events/new': {
    title: '이벤트 베너 등록',
    subtitle: 'contentId가 있으면 링크 URL은 사용할 수 없습니다. (서버 검증)',
  },
  '/admin/display-events/edit': {
    title: '이벤트 베너 수정',
    subtitle: 'contentId가 있으면 링크 URL은 사용할 수 없습니다. (서버 검증)',
  },
  '/admin/homepage-docs': {
    title: '홈페이지 관리',
    subtitle:
      '회사소개·약관·개인정보·콘텐츠 저작권·추천검색어·외부링크를 편집합니다. 저작권은 유형별로 각각 저장합니다.',
  },
  '/admin/users': {
    title: '회원 관리',
    subtitle: '공개 회원(PublicMemberShip) 목록을 조회·수정·삭제할 수 있습니다.',
  },
  '/admin/users/new': {
    title: '회원 등록',
    subtitle: '새 공개 회원을 등록합니다.',
  },
  '/admin/users/edit': {
    title: '회원 상세 관리',
    subtitle: '회원정보, 라이브러리, 하이라이트, 적용질문, 북마크, 별점을 관리합니다.',
  },
  '/admin/orders': {
    title: '결제 관리',
    subtitle: '주문·결제 화면은 추후 연동 예정입니다.',
  },
  '/admin/settings/code': {
    title: '시스템 코드 관리',
    subtitle: '시스템 코드를 조회하고 관리할 수 있습니다.',
  },
  '/admin/settings/menu-permission': {
    title: '메뉴 권한',
    subtitle:
      '왼쪽에서 관리자를 선택하면 오른쪽에 sysCodeManager 메뉴 트리와 user_permissions가 반영됩니다.',
  },
  '/admin/settings/admin-register': {
    title: '관리자 등록',
    subtitle: '관리자 목록을 조회하고 관리할 수 있습니다.',
  },
  '/admin/board/inquiries': {
    title: '1:1 문의 관리',
    subtitle: '회원 문의 목록을 보고 답변할 수 있습니다.',
  },
  '/admin/board/inquiries/detail': {
    title: '1:1 문의 상세',
    subtitle: '문의 내용을 확인하고 답변을 등록합니다.',
  },
  '/admin/board/faqs': {
    title: 'FAQ 관리',
    subtitle: 'FAQ 목록을 조회·수정·삭제할 수 있습니다.',
  },
  '/admin/board/faqs/new': {
    title: 'FAQ 등록',
    subtitle: '새 FAQ를 작성합니다.',
  },
  '/admin/board/faqs/edit': {
    title: 'FAQ 수정',
    subtitle: 'FAQ를 수정합니다.',
  },
  '/admin/board/notices': {
    title: '공지사항 관리',
    subtitle: '공지사항 목록을 조회·수정·삭제할 수 있습니다.',
  },
  '/admin/board/notices/new': {
    title: '공지 등록',
    subtitle: '새 공지사항을 작성합니다.',
  },
  '/admin/board/notices/edit': {
    title: '공지 수정',
    subtitle: '공지사항을 수정합니다.',
  },
  '/admin/messages': {
    title: '문자 이메일',
    subtitle: '좌측 메뉴에서 문자/카카오 또는 이메일 기능을 선택해 주세요.',
  },
  '/admin/messages/sms/send': {
    title: '문자 전송',
    subtitle: '문자·알림톡 등을 발송합니다. (알리고 연동)',
  },
  '/admin/messages/email/send': {
    title: '이메일 전송',
    subtitle: '수신자를 선택하거나 직접 입력하여 이메일을 발송합니다.',
  },
  '/admin/messages/sms/history': {
    title: '문자 전송 내역',
    subtitle: '발송·예약 건을 조회합니다.',
  },
  '/admin/messages/email/history': {
    title: '이메일 전송 내역',
    subtitle: '발송·예약 건을 조회합니다.',
  },
  '/admin/messages/sms/sender-numbers': {
    title: '발신번호 관리',
    subtitle: '알리고에 등록된 발신번호를 조회·등록합니다.',
  },
  '/admin/messages/email/sender-emails': {
    title: '발신이메일 관리',
    subtitle: '발송에 사용할 발신 이메일을 관리합니다.',
  },
  '/admin/messages/newsletter': {
    title: '뉴스레터 신청',
    subtitle: '회원 동의는「회원 뉴스레터 병합」으로 반영합니다.',
  },
}

const REGEX_RULES: { pattern: RegExp; meta: AdminGnbPageMeta }[] = [
  {
    pattern: /^\/admin\/articles\/\d+$/,
    meta: {
      title: '아티클 상세',
      subtitle: '아티클 정보를 확인하세요.',
    },
  },
  {
    pattern: /^\/admin\/video\/\d+\/edit$/,
    meta: {
      title: '비디오 수정',
      subtitle: '비디오 정보를 수정하세요.',
    },
  },
]

export function getAdminGnbPageMeta(pathname: string | null): AdminGnbPageMeta | null {
  if (!pathname) return null
  const path = pathname.replace(/\/$/, '') || '/'
  if (path === '/admin') return null

  const exact = EXACT[path]
  if (exact) return exact

  for (const { pattern, meta } of REGEX_RULES) {
    if (pattern.test(path)) return meta
  }

  return null
}
