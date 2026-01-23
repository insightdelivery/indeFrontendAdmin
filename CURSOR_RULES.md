# 프로젝트 컨텍스트: 관리자 대시보드 프론트엔드 (Admin Dashboard)

## 1. 프로젝트 개요
- **목표**: 현대적이고 반응형인 관리자 대시보드 프론트엔드 구축.
- **역할**: 프론트엔드 개발자 (Next.js App Router 기반).
- **핵심 기능**: JWT 인증, 데이터 시각화(테이블/차트), 폼(Form) 관리, CRUD.

## 2. 기술 스택 및 라이브러리
- **프레임워크**: Next.js 14+ (App Router).
- **언어**: TypeScript.
- **스타일링**: Tailwind CSS.
- **UI 라이브러리**: shadcn/ui (Radix UI 기반).
- **HTTP 클라이언트**: **Axios** (엄격 사용, `fetch` 금지).
- **쿠키 관리**: `js-cookie` (클라이언트 측 토큰 제어용).
- **폼/유효성**: React Hook Form + Zod.

## 3. 환경 변수 설정 (Environment Variables)
- **파일 구분**:
  - 로컬 개발용: `.env.local`
  - 배포용: `.env.production`
- **필수 변수**:
  - `NEXT_PUBLIC_API_URL`: 백엔드 API 기본 주소.
- **기본값**:
  - 로컬 기준: `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - *AI 주의사항: 코드 작성 시 하드코딩 하지 말고 반드시 `process.env.NEXT_PUBLIC_API_URL`을 참조할 것.*

## 4. 아키텍처 및 폴더 구조
- `src/app`: App Router 페이지 및 레이아웃.
- `src/components/ui`: shadcn/ui 기본 컴포넌트.
- `src/components/admin`: 비즈니스 로직이 포함된 관리자 컴포넌트.
- `src/lib`: 설정 파일 (`axios.ts`, `utils.ts` 등).
- `src/services`: API 호출 함수 모음 (도메인별 분리).
- `src/middleware.ts`: **인증 가드 (페이지 접근 제어).**

## 5. AI 구현 규칙 (Implementation Rules) - Critical

### 규칙 1: 인증 (Authentication) - Cookie Only
**[중요] 보안 및 Next.js 미들웨어 호환성을 위해 `localStorage`에 토큰 저장을 금지한다.**

1.  **로그인 로직**:
    - API 응답으로 받은 `accessToken`, `refreshToken`을 **`js-cookie` 라이브러리를 사용하여 쿠키에 저장**한다.
    - 예: `Cookies.set('accessToken', token, { secure: true })`
2.  **미들웨어 (`src/middleware.ts`)**:
    - Next.js 서버 사이드 미들웨어에서 `request.cookies.get('accessToken')`을 확인한다.
    - `/admin` 하위 경로는 토큰이 없으면 즉시 `/login`으로 리다이렉트한다.
    - `localStorage`는 서버에서 접근 불가능하므로 절대 사용하지 않는다.

### 규칙 2: Axios 설정 (`src/lib/axios.ts`)
1.  **Request Interceptor**:
    - 매 요청마다 `js-cookie`에서 토큰을 읽어 헤더에 삽입한다.
    - `config.headers.Authorization = Bearer ${Cookies.get('accessToken')}`
2.  **Response Interceptor**:
    - `401 Unauthorized` 에러 감지 시:
        - 쿠키 삭제 (`Cookies.remove('accessToken')`).
        - 로그인 페이지로 강제 이동 (`window.location.href = '/login'`).

### 규칙 3: UI 컴포넌트 (Shadcn/ui)
- 항상 `shadcn/ui` 컴포넌트 사용을 최우선으로 한다.
- 예: `<input>` 대신 `<Input>`, `<table>` 대신 `<Table>`, `<TableBody>` 등 사용.
- 새로운 UI가 필요하면 "shadcn/ui 설치 명령어"를 먼저 제안한다.

### 규칙 4: 데이터 페칭 및 에러 핸들링
- API 호출 코드는 컴포넌트 내부에 직접 작성하지 않고 `src/services` 폴더에 분리한다.
- 로딩 상태: 데이터가 없을 때는 `Skeleton` UI를 보여준다.
- 에러 처리: `try-catch` 블록을 사용하고, 사용자에게는 `toast` (Sonner 또는 Toaster)로 알림을 띄운다.

## 6. 단계별 작업 리스트 (Reference)

1.  **초기 설정**:
    - `npm install axios js-cookie` 및 타입 정의(`@types/js-cookie`) 설치.
    - `.env.local` 생성.
2.  **네트워크 & 인증 기본**:
    - `src/lib/axios.ts` 생성 (Cookie 연동 인터셉터).
    - `src/middleware.ts` 작성 (라우트 보호).
3.  **UI 스캐폴딩**:
    - `shadcn` 초기화 및 로그인 폼(`zod` 검증 포함) 구현.
4.  **레이아웃**:
    - 로그인 된 사용자만 볼 수 있는 `AdminLayout` (사이드바, 헤더).
5.  **기능 구현**:
    - API 연동 CRUD 페이지 개발.

---
**AI에게**: 위 규칙을 엄격히 준수하세요. 특히 **토큰은 무조건 쿠키(Cookie)로 관리**하고, **Next.js 미들웨어**를 통해 페이지 보안을 처리해야 합니다.


너는 Next.js 배포 전문가야.

내 프로젝트는 Next.js를 정적(export) 방식으로 배포해야 하고,
빌드 결과로 반드시 out/ 폴더가 생성되어야 해.

현재 상태:
- 프로젝트 경로: /Users/hyoungjinnam/macSyncData/DEV/INDE/frontend_admin
- npm run build를 해도 out/ 폴더가 생성되지 않음
- Ubuntu 서버에서는 정적 파일만 nginx로 서빙할 예정
- 서버에서는 Node 실행, next start, SSR 사용 안 함

목표:
- Next.js 정적 export(out) 방식으로 동작하도록 프로젝트를 수정해줘
- npm run build 실행 후 out/ 폴더가 생성되게 만들어줘

구체적인 요구사항:
1. next.config.js (또는 next.config.mjs)를 확인하고
   - output: 'export' 설정이 없으면 추가
   - next/image를 쓰고 있다면 images.unoptimized = true 설정
2. package.json의 scripts를 확인해서
   - Next.js 버전에 맞게 build/export 방식이 올바른지 수정
3. 정적 export가 불가능한 코드(getServerSideProps, server actions 등)가 있다면
   - 어떤 파일이 문제인지 알려주고
   - 가능한 경우 정적 방식으로 변경 제안
4. 수정이 필요한 파일은 직접 고쳐줘
5. 변경 후 내가 실행해야 할 정확한 빌드 명령을 알려줘

중요 제약:
- SSR, API routes, Route Handlers 사용 금지
- 서버에서 환경변수 주입하지 않음 (빌드 시점 고정)
- 결과는 nginx에서 index.html + _next 정적 파일로 서빙됨

최종 결과:
- npm run build 이후 out/ 디렉터리가 생성됨
- out/ 안에 index.html, _next/, static assets가 존재함
