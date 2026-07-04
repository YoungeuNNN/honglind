-- ============================================================
-- 사례비 진실 DB (Salary Truth)
-- 핵심 불변식:
--   · 개별 제보 행은 클라이언트 SELECT 불가 (본인 것 + 관리자만).
--   · 모든 조회는 집계 RPC 로만. 표본 N < 3 이면 아무 세부 집계도 반환 안 함 (k-익명, k=3).
--   · 지역은 시/군/구까지만, 사역 시점은 연 단위로만.
--   · 교회명은 저장하되(그룹핑용) 개별 노출 없음.
-- 스펙: PLANNING_SALARY_TRUTH.md
-- ============================================================

create table public.salary_reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_id        uuid references public.profiles(id) on delete set null,
  denomination       text not null,
  region_sido        text not null,
  region_sigungu     text not null,
  church_size        text not null check (church_size in ('~50','50-150','150-300','300-1000','1000+')),
  position           text not null check (position in ('파트전도사','교육전도사','풀타임전도사','부목사','기타')),
  monthly_stipend    integer not null check (monthly_stipend >= 0 and monthly_stipend < 100000000),
  weekly_hours       numeric  not null check (weekly_hours > 0 and weekly_hours <= 100),
  housing_provided   boolean not null default false,
  meals_provided     boolean not null default false,
  transport_provided boolean not null default false,
  insurance_4        boolean not null default false,
  serve_year         integer not null check (serve_year between 2000 and 2100),
  note               text,
  church_key         text,          -- 정규화 교회 식별자(그룹핑 전용, 화면 비노출). 초기엔 관리자 수기 부여
  church_name        text,          -- 원문 교회명(선택). 절대 개별 노출 안 함
  status             text not null default 'visible' check (status in ('visible','hidden','flagged')),
  created_at         timestamptz not null default now()
);

create index salary_region_idx on public.salary_reports (region_sido, region_sigungu, position);
create index salary_church_idx on public.salary_reports (church_key);

-- ───────────────── RLS: 개별 행 접근 차단이 핵심 ─────────────────
alter table public.salary_reports enable row level security;

-- INSERT: 2단계 인증(verified) 통과자만 [A안]. 기존 posts/comments 와 동일한 is_verified() 게이트 재사용.
create policy salary_insert on public.salary_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and (public.is_verified() or public.is_admin()));

-- SELECT: 본인 제보 + 관리자만. 일반 조회는 전부 아래 RPC 경유.
create policy salary_select_own on public.salary_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- UPDATE/DELETE: 본인 또는 관리자
create policy salary_update_own on public.salary_reports
  for update to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy salary_delete_own on public.salary_reports
  for delete to authenticated using (reporter_id = auth.uid() or public.is_admin());

-- ───────────────── 집계 RPC: k>=3 강제 ─────────────────
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
    percentile_cont(0.5)  within group (order by monthly_stipend) as median_monthly,
    percentile_cont(0.25) within group (order by monthly_stipend) as p25_monthly,
    percentile_cont(0.75) within group (order by monthly_stipend) as p75_monthly,
    percentile_cont(0.5)  within group (order by (monthly_stipend / (weekly_hours * 4.345))::float8) as median_hourly,
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
    percentile_cont(0.5) within group (order by (monthly_stipend / (weekly_hours * 4.345))::float8),
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
      order by (monthly_stipend / (weekly_hours * 4.345))::float8
    ) filter (where position = '파트전도사'),
    avg(case when monthly_stipend / (weekly_hours * 4.345) < p_min_wage then 1 else 0 end)
  from public.salary_reports
  where status = 'visible';
$$;

grant execute on function public.salary_agg_by_region(text, text) to authenticated;
grant execute on function public.salary_agg_by_church(text)       to authenticated;
grant execute on function public.salary_overview(numeric)         to authenticated;
