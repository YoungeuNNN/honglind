# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**홍라인드 (Honglind)** — 사역자/신학생을 위한 익명 커뮤니티 웹앱 (모바일 반응형). UI/문서는 한국어로 작성되어 있습니다.

스택: **Vite 8 · React 19 · TypeScript · React Router v7 · Zustand · TanStack Query · Supabase**

## 주요 명령어

```bash
npm install          # 의존성 설치 (Node 20, .nvmrc)
npm run dev          # 개발 서버 (port 3000, 점유 시 다음 포트로 자동, 브라우저 자동 오픈)
npm run build        # 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 미리보기
npm run lint         # ESLint flat config (eslint.config.js)
```

테스트 셋업은 아직 없습니다.

## 환경 변수 (필수)

`.env`에 다음이 설정되어야 합니다 (`.env.example` 참고):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase 연결
- `VITE_USE_MOCK=true` — **실제 Supabase 대신 mock 데이터로 동작**. dev 중 빠른 UI 작업에 사용
- `VITE_API_URL` — 현재 미사용 (legacy)

빌드 시 Supabase 변수가 비어 있으면 `src/api/supabase.ts`가 `document.body`를 안내문으로 덮어쓰고 throw 합니다. Netlify에서는 Environment variables에 등록 필요.

## 아키텍처 — 큰 그림

### 데이터 계층: **싱글톤 in-memory 캐시 패턴** (주의 깊게 다룰 것)

`src/api/dataService.ts`는 일반적인 fetch-on-demand 패턴이 **아닙니다**. 부팅 시 `loadAll()`가 전체 데이터를 한 번 가져와 모듈 레벨 `cache` 객체에 적재한 뒤,

- `get*/find*/is*/has*` 함수: **동기** — 캐시에서 즉시 반환
- `create*/update*/delete*` 함수: **async** — Supabase에 쓰고 캐시도 갱신

UI 컴포넌트는 대부분의 read를 동기 호출로 처리합니다. 새 read 함수를 추가할 때 fetch가 아니라 캐시에서 꺼내는 패턴을 유지하세요. 캐시가 stale 해질 수 있는 mutation 경로는 반드시 캐시도 함께 업데이트해야 합니다.

### Mock / Real 데이터 서비스 스왑

`src/api/dataService.ts`(Supabase)와 `src/api/mockDataService.ts`(메모리 더미)는 **동일한 export 인터페이스**를 가집니다. 진입점에서 `VITE_USE_MOCK` 환경변수로 한 번에 교체됩니다:

```ts
const dataService = useMock ? MockDS : DS
```

`dataService.ts`에 새 함수를 추가하면 `mockDataService.ts`에 동일 시그니처를 추가해야 mock 모드가 깨지지 않습니다.

### 인증 흐름

- Supabase Auth(`auth.users`) + 1:1 매핑되는 `public.profiles` 테이블. 가입 시 SQL 트리거 `handle_new_user`가 profile 자동 생성
- `useAuthStore` (Zustand)의 `init()`이 `loadAll()` + `syncSessionFromAuth()` + `supabase.auth.onAuthStateChange` 리스너 등록을 한 번에 처리 (`_authListenerInitialized` 모듈 가드로 StrictMode/HMR 다회 호출 방어)
- 관리자 여부는 `profiles.role === 'admin'` + SQL 헬퍼 `is_admin()`
- **Remember me**: `src/api/supabase.ts`의 `dynamicStorage`가 `getRememberMe()` 결과에 따라 `localStorage`(영구)와 `sessionStorage`(세션) 사이를 동적으로 전환. 로그인 폼에서 토글하기 전에 반드시 `setRememberMe()` 호출

### 라우팅 / 가드

`src/App.tsx`가 모든 라우트를 한 곳에서 선언. 패턴:

```
/auth                                   ← AuthPage (가드 없음)
<AuthGuard><AppLayout/></AuthGuard>     ← 이하 모두 인증 필요
  /                                       FeedPage
  /post/:id, /write, /write/:id, ...
  /admin                                ← <AdminGuard/> 추가
```

`AuthGuard`는 `initialized` 플래그가 true가 되기 전까지 "로딩 중..."을 그려 인증 결정 전에 redirect가 깜빡이지 않게 합니다. 새 보호 라우트는 반드시 `AppLayout` 내부에 두세요 (헤더/사이드바/모바일 네비 공유).

### 상태 관리

- **Zustand**: `authStore`(전역 사용자/세션), `uiStore`(토스트 등 UI)
- **TanStack Query**: `QueryClientProvider`는 설치되어 있지만 in-memory cache 패턴 때문에 실제 사용은 제한적. 서버 fetch가 필요한 신규 기능에 한정해 사용
- **defaultOptions**: `staleTime: 60s, retry: 1`

### Path alias

`@/*` → `src/*`. Vite (`vite.config.ts`) + TypeScript (`tsconfig.app.json`)에 모두 설정됨. 항상 `@/...`로 import.

### 스타일

순수 CSS. `src/styles/variables.css`의 CSS 변수 + `global.css`(약 36KB) 한 파일. **Tailwind나 CSS-in-JS 없음**. 새 스타일은 변수(`var(--primary)`, `var(--radius-lg)` 등)를 우선 활용.

### 데이터베이스 (Supabase)

- 단일 마이그레이션: `supabase/migrations/20260429000000_initial_schema.sql`이 전체 스키마/RLS/트리거/함수의 출처
- 카운터(views 등) atomic 증가는 `SECURITY DEFINER` SQL 함수로 우회 (`increment_post_views` 등) — 클라이언트에서 `+1`하지 말고 RPC 호출
- 스키마 변경 시 동일 디렉터리에 새 타임스탬프 마이그레이션 추가

### 카테고리 / 특수 게시글

10개 카테고리는 `src/utils/constants.ts`의 `CATEGORIES`에 하드코딩. 일부 카테고리는 일반 게시글과 다른 구조:

- **청빙** — `Post.cheongbing: CheongbingData` (직책/교단/지역/규모/사례비/마감/연락처)
- **기도요청** — `Post.prayers: string[]`(기도 누른 유저), `prayerAnswered: boolean`
- **설교나눔** — `Post.sermonVerse: string`
- **투표 포함** — `Post.poll: Poll` (옵션별 votes 배열)

이 컬럼들은 게시글 작성/표시 로직에서 카테고리에 맞춰 분기 처리됩니다.

## 제품 사양: `PLANNING.md`

루트의 `PLANNING.md`(약 65KB)는 모든 화면·동작·검증 규칙·에지케이스를 정의한 **제품 사양의 단일 출처**입니다. 새 화면/필드/규칙을 추가하기 전에 해당 섹션을 먼저 확인하세요. 사양과 코드가 다르면 사양이 기준입니다 (다만 의도와 다른 케이스로 보이면 사용자에게 확인).

## 배포

Netlify. `netlify.toml`이 `npm run build` → `dist/` 퍼블리시, SPA fallback `/* → /index.html`. Node 20 고정.

## 알아둘 점

- `index.html`의 `<title>`은 **홍라인드 - 사역자 & 신학생 익명 커뮤니티**. UI 카피는 기독교 컨텍스트(말씀 인용, 토스트 문구 "은혜 가운데 교제하세요" 등)를 따릅니다 — 새 카피도 톤을 맞출 것
- 비밀번호 정책은 `src/utils/helpers.ts`의 `isPasswordValid` / `getPasswordRules` 4조건 (8자 이상 / 영문 / 숫자 / 특수문자). 회원가입 UI는 이 함수 결과를 실시간 표시
- `tsconfig.app.json`에 `verbatimModuleSyntax: true` + `erasableSyntaxOnly: true` — 타입 전용 import는 반드시 `import type`으로
- `src/components/`는 도메인별로 나뉨: `home/`, `layout/`, `notification/`, `report/`, `ui/`
