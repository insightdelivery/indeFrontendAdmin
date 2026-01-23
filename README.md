# Admin Dashboard Frontend

관리자 대시보드 프론트엔드 프로젝트입니다.

## 기술 스택

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui
- **Data Fetching**: Axios
- **Form Handling**: React Hook Form + Zod
- **Authentication**: JWT (Cookie-based)

## 시작하기

### 1. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
src/
├── app/              # Next.js App Router 페이지
│   ├── admin/       # 관리자 페이지
│   └── login/       # 로그인 페이지
├── components/       # React 컴포넌트
│   ├── ui/          # shadcn/ui 컴포넌트
│   └── admin/       # 관리자 전용 컴포넌트
├── lib/             # 유틸리티 및 설정
│   ├── axios.ts     # Axios 인스턴스 설정
│   └── utils.ts     # 유틸리티 함수
├── services/        # API 호출 함수
│   └── auth.ts      # 인증 관련 API
├── hooks/           # Custom Hooks
└── middleware.ts    # Next.js 미들웨어 (라우트 보호)
```

## 주요 기능

- ✅ JWT 기반 인증 (쿠키 저장)
- ✅ 로그인/로그아웃
- ✅ 라우트 보호 (미들웨어)
- ✅ Axios 인터셉터 (토큰 자동 첨부, 401 처리)
- ✅ Toast 알림

## API 엔드포인트

백엔드 API와 연동:

- `POST /adminMember/login` - 로그인
- `POST /adminMember/tokenrefresh` - 토큰 갱신
- `POST /adminMember/logout` - 로그아웃

## 개발 가이드

### 환경 변수 사용

모든 API 호출은 `process.env.NEXT_PUBLIC_API_URL`을 사용합니다.

### Axios 사용

`src/lib/axios.ts`에서 설정된 인스턴스를 import하여 사용:

```typescript
import apiClient from '@/lib/axios'

const response = await apiClient.get('/endpoint')
```

### 컴포넌트 작성

- 클라이언트 컴포넌트는 `'use client'` 지시어 사용
- shadcn/ui 컴포넌트 우선 사용
- Tailwind CSS로 스타일링

