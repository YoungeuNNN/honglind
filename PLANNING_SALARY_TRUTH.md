# 홍라인드 — 사례비 진실 DB & 초빙 유입 루프 (Build Spec)

> **한 줄:** "협의라고 적힌 자리, 실제로 얼마 받는지 아는 유일한 곳."
> **상태:** 구현 착수용 스펙 (spec-first). 코드 반영 전 본 문서를 단일 출처로 본다.
> **작성 기준:** Vite8 · React19 · TS · Supabase · 싱글톤 in-memory 캐시 + (본 기능은) TanStack Query 예외.

---

## 0. 전략 요약 (왜 이게 웨지인가)

- 타깃 = **신학대학원 재학생 = 동시에 현직 파트전도사**. 인증(재학증명서)이 학생·현직을 한 번에 검증.
- 장신대 등 **초빙게시판은 이미 존재**한다. 그러나 구조적으로 못 하는 것:
  - 교회가 쓴 **광고 카피** ("사례비 협의"). 실지급액을 끝까지 모름.
  - 단방향·휘발성 → **데이터 누적 0**.
  - 학교 공식 채널은 교회(이해관계자)의 **을(전도사) 진실**을 호스팅 불가.
- 그래서 우리는 **초빙게시판을 이기지 않는다. 그 위에 "진실 레이어"를 얹는다.**
  - 초빙게시판/외부 = 자리를 **발견**하는 곳.
  - 홍라인드 = 지원 전에 **실지급·후기를 확인**하고 **직접 제보**하는 곳.
- 독점 자산 두 개: **① 사례비 진실 DB** (킬러) · **② 교회 후기**. 둘 다 인증 익명 없이는 안 나온다.

### 핵심 불변식 (설계 전체를 지배)

1. **개별 제보 행(salary_reports)은 클라이언트가 직접 SELECT 불가.** 본인 것 + 관리자 제외.
2. 모든 조회는 **집계 RPC**를 통해서만. **표본 N < 3이면 어떤 세부 집계도 반환하지 않는다** (k-익명, k=3).
3. 지역은 **시/군/구까지만**, 사역 시점은 **연 단위**로만 저장/노출 (시점 흐리기).
4. 교회명은 저장하되(그룹핑용), **N≥3 전에는 화면에 절대 등장하지 않음**. 등장해도 **개별 행이 아니라 집계값**만.
5. 사례비 페이지 전부 **noindex**. 검색 유입 포기하고 신원추적 위험을 산다.

---

## PART A. 사례비 진실 DB

### A-1. 데이터 모델 — 도메인 타입 (`src/types/index.ts` 추가)

```ts
// ── 사례비 제보 (Salary Truth) ────────────────────────────
export type MinistryPosition =
  | '파트전도사' | '교육전도사' | '풀타임전도사' | '부목사' | '기타'

// 출석 규모 버킷 (원시 인원수 저장 금지 — 특정 방지)
export type ChurchSizeBucket =
  | '~50' | '50-150' | '150-300' | '300-1000' | '1000+'

export interface SalaryReport {
  id: string
  // reporterId 는 서버에만 존재. 클라이언트 응답에 절대 실려오지 않는다.
  denomination: string           // 교단 (자유/선택 목록)
  regionSido: string             // 시/도 (예: 서울)
  regionSigungu: string          // 시/군/구 (예: 강남구) — 동 이하 금지
  churchSize: ChurchSizeBucket
  position: MinistryPosition
  monthlyStipend: number         // 월 실수령(원). 필수. "협의/미기재" 불가
  weeklyHours: number            // 주당 사역시간(시간). 필수. 시급 환산의 분모
  housingProvided: boolean       // 사택
  mealsProvided: boolean         // 식사 제공
  transportProvided: boolean     // 교통비
  insurance4: boolean            // 4대보험
  serveYear: number              // 사역(수령) 연도. 연 단위만
  note?: string | null           // 자유 비고(선택). 개인특정 금지 안내
  createdAt: string
  // churchKey/churchName 은 집계 그룹핑 전용 — 개별 응답엔 포함 안 함
}

// 집계 결과 (RPC 반환) — 개별 행이 아니라 통계만
export interface SalaryAggRow {
  groupLabel: string             // 예: "서울 강남구 · 파트전도사"
  count: number                  // 표본 수 (항상 >= 3)
  medianMonthly: number          // 월 사례비 중앙값
  p25Monthly: number
  p75Monthly: number
  medianHourly: number           // 시급 중앙값 = 월 / (주당 * 4.345)
  housingRate: number            // 사택 제공 비율 0~1
  insuranceRate: number          // 4대보험 비율 0~1
}

export interface SalaryOverview {   // 랜딩/헤드라인용
  totalReports: number
  medianHourlyPart: number        // 파트전도사 시급 중앙값
  belowMinWageRate: number        // 최저임금 미만 비율 (감정·확산 훅)
  updatedYear: number
}
```

> **시급 환산:** `hourly = monthlyStipend / (weeklyHours * 4.345)` (주 → 월 환산 4.345주).
> **최저임금 상수:** `src/utils/constants.ts`에 `export const MIN_WAGE_HOURLY = 10_320 // 2026년 기준, 매년 갱신` 로 두고 클라이언트에서 비교. (연도별 값은 반드시 실제 고시값으로 갱신 — 코드에 확정 숫자 박지 말 것.)

### A-2. 마이그레이션 (신규 파일: `supabase/migrations/20260706000000_salary_truth.sql`)

```sql
-- ============================================================
-- 사례비 진실 DB
-- 핵심: 개별 행은 클라이언트 SELECT 불가. 집계 RPC(k>=3)로만 노출.
-- ============================================================

create table public.salary_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references public.profiles(id) on delete set null,
  denomination     text not null,
  region_sido      text not null,
  region_sigungu   text not null,
  church_size      text not null check (church_size in ('~50','50-150','150-300','300-1000','1000+')),
  position         text not null check (position in ('파트전도사','교육전도사','풀타임전도사','부목사','기타')),
  monthly_stipend  integer not null check (monthly_stipend >= 0 and monthly_stipend < 100000000),
  weekly_hours     numeric  not null check (weekly_hours > 0 and weekly_hours <= 100),
  housing_provided boolean not null default false,
  meals_provided   boolean not null default false,
  transport_provided boolean not null default false,
  insurance_4      boolean not null default false,
  serve_year       integer not null check (serve_year between 2000 and 2100),
  note             text,
  church_key       text,          -- 정규화 교회 식별자(그룹핑 전용, 화면 비노출)
  church_name      text,          -- 원문 교회명(선택). 절대 개별 노출 안 함
  status           text not null default 'visible' check (status in ('visible','hidden','flagged')),
  created_at       timestamptz not null default now()
);

create index salary_region_idx on public.salary_reports (region_sido, region_sigungu, position);
create index salary_church_idx on public.salary_reports (church_key);

-- ── RLS: 개별 행 접근 차단이 핵심 ──
alter table public.salary_reports enable row level security;

-- INSERT: 2단계 인증(verified) 통과자만 [A안]. 기존 posts/comments 와 동일한 is_verified() 게이트 재사용.
create policy salary_insert on public.salary_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and (public.is_verified() or public.is_admin()));

-- SELECT: 본인 제보 + 관리자만. (일반 조회는 전부 RPC 경유)
create policy salary_select_own on public.salary_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- UPDATE/DELETE: 본인 또는 관리자
create policy salary_modify_own on public.salary_reports
  for update to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy salary_delete_own on public.salary_reports
  for delete to authenticated using (reporter_id = auth.uid() or public.is_admin());

-- ── 집계 RPC: k>=3 강제 ──
-- 지역·직분별 집계
create or replace function public.salary_agg_by_region(
  p_denomination text default null,
  p_position     text default null
)
returns table (
  group_label text, count bigint,
  median_monthly numeric, p25_monthly numeric, p75_monthly numeric,
  median_hourly numeric, housing_rate numeric, insurance_rate numeric
)
language sql stable security definer set search_path = public as $$
  select
    region_sido || ' ' || region_sigungu || ' · ' || position as group_label,
    count(*) as count,
    percentile_cont(0.5) within group (order by monthly_stipend) as median_monthly,
    percentile_cont(0.25) within group (order by monthly_stipend) as p25_monthly,
    percentile_cont(0.75) within group (order by monthly_stipend) as p75_monthly,
    percentile_cont(0.5) within group (order by monthly_stipend / (weekly_hours * 4.345)) as median_hourly,
    avg(case when housing_provided then 1 else 0 end) as housing_rate,
    avg(case when insurance_4 then 1 else 0 end) as insurance_rate
  from public.salary_reports
  where status = 'visible'
    and (p_denomination is null or denomination = p_denomination)
    and (p_position is null or position = p_position)
  group by region_sido, region_sigungu, position
  having count(*) >= 3;          -- ★ k-익명 임계값
$$;

-- 특정 교회 집계 (N>=3 아니면 0행 반환)
create or replace function public.salary_agg_by_church(p_church_key text)
returns table (
  count bigint, median_monthly numeric, median_hourly numeric,
  housing_rate numeric, insurance_rate numeric
)
language sql stable security definer set search_path = public as $$
  select
    count(*),
    percentile_cont(0.5) within group (order by monthly_stipend),
    percentile_cont(0.5) within group (order by monthly_stipend / (weekly_hours * 4.345)),
    avg(case when housing_provided then 1 else 0 end),
    avg(case when insurance_4 then 1 else 0 end)
  from public.salary_reports
  where status = 'visible' and church_key = p_church_key
  having count(*) >= 3;          -- ★ 미달이면 아무것도 안 준다
$$;

-- 랜딩 헤드라인
create or replace function public.salary_overview(p_min_wage numeric)
returns table (
  total_reports bigint, median_hourly_part numeric, below_min_wage_rate numeric
)
language sql stable security definer set search_path = public as $$
  select
    count(*),
    percentile_cont(0.5) within group (
      order by monthly_stipend / (weekly_hours * 4.345)
    ) filter (where position = '파트전도사'),
    avg(case when monthly_stipend / (weekly_hours * 4.345) < p_min_wage then 1 else 0 end)
  from public.salary_reports
  where status = 'visible';
$$;

grant execute on function public.salary_agg_by_region(text, text) to authenticated;
grant execute on function public.salary_agg_by_church(text) to authenticated;
grant execute on function public.salary_overview(numeric) to authenticated;
```

> 적용: `supabase db push --linked`. **`db push`는 사용자 확인 후에만.** 마이그레이션 파일만 만들고 자동 push 금지.

### A-3. dataService 계층 (캐시 패턴 예외 — 명시)

CLAUDE.md의 싱글톤 캐시에 **넣지 않는다.** 민감·가변·잠재적 대용량이라 `loadAll()` 대상 아님. **TanStack Query로 on-demand fetch** (CLAUDE.md가 허용한 "서버 fetch 신규 기능" 예외).

`src/api/dataService.ts` (+ `mockDataService.ts` 동일 시그니처) 추가:

```ts
// 쓰기
export async function submitSalaryReport(data: Omit<SalaryReport,'id'|'createdAt'>): Promise<void>
export async function getMySalaryReports(): Promise<SalaryReport[]>   // 본인 것만
export async function deleteSalaryReport(id: string): Promise<void>

// 읽기(집계 RPC 래퍼) — 개별 행 절대 반환 안 함
export async function fetchSalaryByRegion(denom?: string, pos?: string): Promise<SalaryAggRow[]>
export async function fetchSalaryByChurch(churchKey: string): Promise<SalaryAggRow | null> // N<3 → null
export async function fetchSalaryOverview(): Promise<SalaryOverview>
```

- 훅: `useSalaryByRegion`, `useSalaryByChurch(key)`, `useSalaryOverview` — `staleTime: 60s`.
- mock: 더미 집계 반환하되 **N<3 분기(null)도 반드시 재현** (임계값 UI 테스트용).

### A-4. 화면

**① 제보 폼 (`/salary/new`)** — 인증(verified) 유저만.
```
교단 [드롭다운]      시/도 [ ]   시/군/구 [ ]
교회 규모 [~50 / 50-150 / 150-300 / 300-1000 / 1000+]
직분 [파트전도사 …]
월 실수령 사례비 [ ___ 원]   주당 사역시간 [ __ 시간]
   → 실시간 시급 환산: "환산 시급 8,240원  ⚠ 최저임금 미만"
사택 ☐  식사 ☐  교통비 ☐  4대보험 ☐
사역 연도 [2025]
비고(선택, 개인 특정 금지 안내문)
[제보하기]
```
- 검증: 월사례비·주당시간·직분·지역 필수. "협의/미기재" **입력 불가**(숫자 강제). 이게 초빙게시판과의 차별점.
- 제출 후: "제보 감사합니다. 이 데이터가 다음 전도사를 지킵니다." 토스트.

**② 집계 화면 (`/salary`)** — noindex.
- 상단 헤드라인 카드: `salary_overview` → "파트전도사 시급 중앙값 8,600원 · 최저임금 미만 63%".
- 필터: 교단 / 직분. 결과: 지역별 카드(중앙값·p25~p75 레인지 바·시급·사택률·4대보험률).
- **N<3 지역은 "표본 부족(3건 필요)"로 잠금 표시** + "네가 제보하면 열림" CTA. → 제보 유도 루프.

**③ 교회별 패널 (컴포넌트, 청빙 상세에 삽입)** — A-2의 `salary_agg_by_church`.
- N≥3: "이 교회 실지급 중앙값 ○○원 / 시급 ○○원 (제보 N건)".
- N<3: "아직 이 교회 데이터가 부족합니다. 지원·근무 경험이 있다면 제보해주세요." + CTA.

---

## PART B. 초빙 유입 루프

### B-1. 개념

```
외부 초빙(장신대 게시판 등)  ──붙여넣기──▶  홍라인드 청빙 글(구조화 + 사례비 필수)
        ▲                                          │
        │                                          ▼
   더 강한 확인 가치 ◀── 데이터 축적 ◀── 사례비 제보 CTA ◀── 교회별 진실 패널(확인)
```
루프 한 문장: **발견(외부) → 확인(진실 패널) → 기여(제보) → 축적 → 다음 사람에게 더 큰 확인 가치.**

### B-2. 데이터 모델 — 기존 청빙 확장

`CheongbingData`(`src/types/index.ts`)에 2필드 추가. 새 테이블 불필요(기존 `posts.cheongbing` JSON 재사용):

```ts
export interface CheongbingData {
  position: string
  denomination: string
  region: string
  churchSize: string
  salary: string        // ← 필수화(정책). 빈값/"협의"만이면 등록 차단 or "미기재" 명시 플래그
  deadline: string
  contact: string
  sourceUrl?: string     // ★ 외부 초빙 출처 링크 (장신대 등)
  churchKey?: string     // ★ 사례비 DB와 연결하는 정규화 교회키
}
```
- 마이그레이션 불필요 (JSON 컬럼). `constants.ts`의 `CATEGORIES`에서 `'청빙'` **주석 해제**로 부활(constants.ts:4).

### B-3. 화면/동작

**① 청빙 작성 (기존 WritePage 청빙 폼 확장)**
- 맨 위 "외부 공고 링크(선택)" 입력 → `sourceUrl`.
- **사례비 칸 정책 강화:** 숫자 사례비 or "사례비 미기재" 체크 **둘 중 하나 필수**. 그냥 "협의"만 쓰고 등록 불가.
- 교회 지정 → `churchKey` 생성(정규화: 교단+지역+교회명 해시 or 수기 매칭). MVP는 자유입력 후 관리자 정규화.

**② 청빙 상세 (PostDetailPage 청빙 분기에 삽입)**
- 기존 청빙 정보 테이블 아래에 **`<ChurchSalaryPanel churchKey=… />`** (A-4 ③).
- `sourceUrl` 있으면 "원문 공고 보기" 링크(외부 새 탭 + `rel="noopener nofollow"`).
- 하단 **검증유저 코멘트**: 기존 댓글 시스템 재사용. 프롬프트 카피만 "이 교회 지원/근무 경험을 나눠주세요(개인 특정 금지)".

**③ CTA 배치 (루프 닫기)**
- 진실 패널 안 "이 교회 사례비 제보하기" → `/salary/new?churchKey=…` 프리필.
- 집계 화면의 잠긴(N<3) 카드 → 제보 유도.

### B-4. 리스크 & 방어 (반드시 구현)

| 리스크 | 방어 |
|---|---|
| **명예훼손/모욕** (교회·담임 실명 비방) | 사례비는 **사실(숫자)만**. 후기 댓글은 의견/경험 한정, 인신공격 금지 안내 + 1클릭 신고 + 관리자 즉시 hide. **삭제요청(takedown) 창구** 필수 |
| **역추적**(좁은 표본) | k≥3 미만 개별 노출 금지(A 불변식). 시점 연 단위, 지역 구 단위 |
| **외부 콘텐츠 저작권** | 자동 스크래핑 금지. **유저가 링크+요약**만. 원문 전문 복붙 금지 안내 |
| **허위 제보 오염** | verified 유저만 제보. 중앙값(평균 아님)으로 이상치 방어. 관리자 flag/hide |

> ⚠ 법적 리스크(명예훼손)는 실제 노출이 있으니, 오픈 전 **이용약관에 교회후기/사례비 정책 + 삭제요청 절차** 명문화 권장. (본 문서는 법률자문 아님.)

---

## 빌드 순서 & 수용 게이트

| # | 스텝 | 산출물 | 게이트 |
|---|---|---|---|
| 1 | 마이그레이션 A-2 적용 | salary_reports + RPC 3종 | RPC가 N<3에서 0행 반환 확인 |
| 2 | dataService/mock A-3 | 6개 함수 + 훅 | mock에서 N<3 null 재현 |
| 3 | 제보 폼 `/salary/new` | 화면 ①, 시급 실시간 환산 | "협의" 입력 차단 동작 |
| 4 | 집계 화면 `/salary` (noindex) | 화면 ②, 헤드라인 | 잠긴 카드 CTA 노출 |
| 5 | 청빙 부활 + 확장 B-2/B-3 | sourceUrl·churchKey·진실 패널 | 청빙 상세에서 교회 집계 표시 |
| 6 | 루프 CTA + 신고/takedown | 프리필·신고·hide | 제보→집계 반영 왕복 확인 |

**전체 수용 기준(파일럿 1개 신학교):** 사례비 제보 **50건** 누적 · 청빙 상세에서 진실 패널이 실제로 열리는 교회 **5곳** · 제보→집계 왕복 재방문 발생.

---

## 열린 질문 (착수 전 확정 필요)

1. ~~churchKey 정규화~~ **[확정 · 수기]** 사용자는 교회명 자유입력 → **관리자가 매칭 버튼으로 기존 교회와 연결해 churchKey 부여**. 자동(교단+지역+명 해시)은 데이터·패턴 쌓인 뒤 전환. (자유입력 이름의 표기 흔들림·동명 교회를 초기 소량 데이터에서 자동으로 묶으면 오염 위험이 커서 수기 우선.)
2. ~~verified 게이트~~ **[확정 · A안]** 제보(쓰기) = `is_verified()` (2단계 재학증명서 통과자만). 읽기(집계 조회) = `approved`(1단계)까지 허용 — **볼 사람은 넓게, 쓸 사람은 좁게.** 기존 posts/comments 와 동일한 `is_verified() or is_admin()` 게이트 재사용.
3. ~~월사례비 단위~~ **[확정 · 원 단위]** `monthlyStipend`는 **원(KRW) 정수**로 저장. 입력 UI는 천단위 콤마 표기만 도우미로, 저장값은 원.
4. **최저임금 상수 출처**: 매년 수동 갱신 vs 관리자 설정값 테이블.
5. 사례비/청빙 **모바일 하단 네비** 진입점 노출 여부.
