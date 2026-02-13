# Axios 인터셉터 동작 확인 결과

## ✅ 확인 완료 사항

### 1. 모든 API 호출이 `apiClient`를 사용하는지 확인

#### ✅ 인증 관련 API (`src/services/auth.ts`)
- `login()` - `apiClient.post('/adminMember/login')` ✅
- `refreshToken()` - `apiClient.post('/adminMember/tokenrefresh')` ✅
- `logout()` - `apiClient.post('/adminMember/logout')` ✅

#### ✅ 관리자 관리 API (`src/services/admin.ts`)
- `getAdminList()` - `apiClient.get('/adminMember/list')` ✅
- `registerAdmin()` - `apiClient.post('/adminMember/join')` ✅
- `updateAdmin()` - `apiClient.put('/adminMember/update')` ✅
- `deleteAdmin()` - `apiClient.delete('/adminMember/delete')` ✅

#### ✅ 아티클 관리 API (`src/services/article.ts`, `src/features/articles/services/index.ts`)
- `getArticleList()` - `apiClient.get('/article/list')` ✅
- `getArticle()` - `apiClient.get('/article/{id}')` ✅
- `createArticle()` - `apiClient.post('/article/create')` ✅
- `updateArticle()` - `apiClient.put('/article/{id}')` ✅
- `deleteArticle()` - `apiClient.delete('/article/{id}')` ✅
- `deleteArticles()` - `apiClient.delete('/article/batch-delete')` ✅
- `updateArticleStatus()` - `apiClient.put('/article/batch-status')` ✅
- `restoreArticle()` - `apiClient.post('/article/{id}/restore')` ✅
- `hardDeleteArticle()` - `apiClient.delete('/article/{id}/hard-delete')` ✅
- `exportArticlesToExcel()` - `apiClient.get('/article/export')` ✅

#### ✅ 비디오/세미나 관리 API (`src/features/video/services/index.ts`)
- `getVideoList()` - `apiClient.get('/video/list')` ✅
- `getVideo()` - `apiClient.get('/video/{id}')` ✅
- `createVideo()` - `apiClient.post('/video/create')` ✅
- `updateVideo()` - `apiClient.put('/video/{id}')` ✅
- `deleteVideo()` - `apiClient.delete('/video/{id}')` ✅
- `deleteVideos()` - `apiClient.delete('/video/batch-delete')` ✅
- `updateVideoStatus()` - `apiClient.put('/video/batch-status')` ✅
- `restoreVideo()` - `apiClient.post('/video/{id}/restore')` ✅
- `hardDeleteVideo()` - `apiClient.delete('/video/{id}/hard-delete')` ✅
- `getVideoStreamInfo()` - `apiClient.get('/video/stream/{id}/info')` ✅
- `uploadVideoFile()` - TUS 프로토콜 사용 (별도 처리) ⚠️

#### ✅ 시스템 코드 API (`src/lib/syscode.ts`)
- `fetchSysCodeFromAPI()` - `apiClient.get('/systemmanage/syscode/')` ✅
- `fetchSysCodeByParent()` - `apiClient.get('/systemmanage/syscode/by_parent/')` ✅

### 2. 인터셉터 설정 확인 (`src/lib/axios.ts`)

#### ✅ Request Interceptor (154-168줄)
- 모든 요청에 `Authorization: Bearer {token}` 헤더 자동 추가
- 토큰이 있으면 자동으로 헤더에 포함

#### ✅ Response Interceptor (170-267줄)
- **Login API 제외**: `/adminMember/login`은 토큰 갱신 시도하지 않음 (183줄) ✅
- **401/403 에러 감지**: 토큰 만료 시 자동으로 토큰 갱신 시도
- **토큰 갱신 로직**:
  1. 401/403 에러 발생 시 `refreshAccessToken()` 호출
  2. 새 토큰으로 원래 요청 자동 재시도
  3. 동시 요청은 대기열에 추가하여 순차 처리
  4. 최대 3회 재시도 후 실패 시 로그인 페이지로 리다이렉트

### 3. 특수 케이스: TUS 업로드

#### ⚠️ TUS 업로드 (`src/features/video/services/index.ts`)
- `tus-js-client`는 axios를 사용하지 않으므로 인터셉터가 직접 동작하지 않음
- **해결 방법**: `onError` 콜백에서 401/403 에러 감지 시 `apiClient.post('/adminMember/tokenrefresh')` 호출
- 이렇게 하면 토큰 갱신 API 호출 시 인터셉터가 동작함 ✅

## 📋 인터셉터 동작 흐름

```
1. API 호출 (apiClient.get/post/put/delete)
   ↓
2. Request Interceptor
   - Authorization 헤더 자동 추가
   ↓
3. 서버 요청
   ↓
4. Response Interceptor
   ├─ 성공 (200-299)
   │  └─ 응답 반환
   │
   └─ 실패 (401/403)
      ├─ Login API인가?
      │  └─ 예 → 에러 반환 (토큰 갱신 안 함)
      │
      └─ 아니오 → 토큰 갱신 시도
         ├─ 성공 → 새 토큰으로 원래 요청 재시도
         └─ 실패 (3회) → 로그인 페이지로 리다이렉트
```

## ✅ 결론

**모든 API 호출 (login 제외)에서 인터셉터가 정상적으로 동작합니다.**

1. ✅ 모든 API 서비스 함수가 `apiClient`를 사용
2. ✅ Login API는 인터셉터에서 제외됨
3. ✅ 401/403 에러 시 자동 토큰 갱신 및 재시도
4. ✅ TUS 업로드는 별도 처리로 인터셉터 활용

## 🔍 추가 확인 사항

- [x] 모든 API 호출이 `apiClient`를 사용하는지 확인
- [x] Login API가 인터셉터에서 제외되는지 확인
- [x] 401/403 에러 시 토큰 갱신 로직 확인
- [x] TUS 업로드의 토큰 갱신 처리 확인
- [x] 동시 요청 시 대기열 처리 확인
- [x] 최대 재시도 횟수 및 로그인 리다이렉트 확인

## 📝 참고 사항

- 인터셉터는 `src/lib/axios.ts`에 구현되어 있음
- 모든 API 서비스 함수는 `apiClient`를 import하여 사용
- TUS 업로드만 예외적으로 `tus-js-client`를 사용하지만, 토큰 갱신 시 `apiClient`를 통해 처리

