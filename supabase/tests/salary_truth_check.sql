-- ============================================================
-- 사례비 진실 DB — 검증 스크립트 (self-rollback)
-- ============================================================
-- 목적: 마이그레이션(20260706000000_salary_truth.sql) 적용 후,
--       집계 RPC 3종이 아래를 실제로 지키는지 로컬에서 확인한다.
--         1) k>=3 미만 그룹은 절대 노출 안 됨
--         2) 특정 교회 N<3 이면 0행(클라이언트 null)
--         3) 환산 시급 = 월 / (주당 * 4.345) 계산 정확
--
-- 실행 방법 (로컬 Supabase 먼저 띄운 상태):
--   supabase db reset            # 마이그레이션 전체 재적용
--   psql "$(supabase status | grep 'DB URL' | awk '{print $NF}')" -f supabase/tests/salary_truth_check.sql
--   (또는)  supabase db execute --file supabase/tests/salary_truth_check.sql
--
-- 전체가 BEGIN ... ROLLBACK 으로 감싸져 있어 DB 에 아무것도 안 남는다.
-- seed insert 는 소유자(postgres) 권한으로 실행되어 RLS 를 우회한다(정상).
-- reporter_id 는 FK 의존을 피하려고 NULL 로 둔다(집계 로직 검증이 목적).
-- ============================================================

begin;

-- ── seed ──────────────────────────────────────────────────
-- 그룹 A: 서울 강남구 · 파트전도사  (3건 → k>=3 통과, 노출돼야 함)
--   교회키 'test-gangnam' 로 묶음
insert into public.salary_reports
  (reporter_id, denomination, region_sido, region_sigungu, church_size, position,
   monthly_stipend, weekly_hours, housing_provided, meals_provided, transport_provided,
   insurance_4, serve_year, church_key)
values
  (null,'예장합동','서울','강남구','300-1000','파트전도사',1300000,24,false,true ,false,false,2025,'test-gangnam'),
  (null,'예장합동','서울','강남구','300-1000','파트전도사', 800000,25,false,false,false,false,2025,'test-gangnam'), -- 저임금(최저 미만)
  (null,'예장합동','서울','강남구','300-1000','파트전도사',1600000,30,true ,true ,true ,true ,2025,'test-gangnam');

-- 그룹 B: 경기 성남시 · 교육전도사  (2건 → k<3, 절대 노출 안 돼야 함)
--   교회키 'test-small' 로 묶음
insert into public.salary_reports
  (reporter_id, denomination, region_sido, region_sigungu, church_size, position,
   monthly_stipend, weekly_hours, serve_year, church_key)
values
  (null,'예장통합','경기','성남시','150-300','교육전도사',1500000,40,2025,'test-small'),
  (null,'예장통합','경기','성남시','150-300','교육전도사',1200000,35,2025,'test-small');

-- ── 검증 1: 지역 집계 — 서울 강남구(3건)만 나와야 하고 경기 성남시(2건)는 없어야 함 ──
\echo ''
\echo '=== [1] salary_agg_by_region() — 기대: 1행(서울 강남구 파트전도사, count=3). 경기 성남시 없어야 정상 ==='
select group_label, count,
       round(median_monthly) as median_won,
       round(median_hourly)  as hourly_won,
       round(p25_monthly)    as p25, round(p75_monthly) as p75
from public.salary_agg_by_region();

-- ── 검증 2: 교회 집계 — 'test-gangnam'(3건)=1행, 'test-small'(2건)=0행 ──
\echo ''
\echo '=== [2a] salary_agg_by_church(''test-gangnam'') — 기대: 1행(count=3) ==='
select count, round(median_monthly) as median_won, round(median_hourly) as hourly_won
from public.salary_agg_by_church('test-gangnam');

\echo ''
\echo '=== [2b] salary_agg_by_church(''test-small'') — 기대: 0행 (클라이언트 null) ==='
select count from public.salary_agg_by_church('test-small');

-- ── 검증 3: 개요 — 시급 계산 & 최저임금 미만 비율 ──
--   파트전도사 시급: 1300000/(24*4.345)=12,466 / 800000/(25*4.345)=7,366 / 1600000/(30*4.345)=12,275
--   → 파트 시급 중앙값 ≈ 12,275원
--   전체 5건 중 최저임금(10,320) 미만: 800k행(7,366)·B1(8,630)·B2(7,890) = 3건 → 60%
\echo ''
\echo '=== [3] salary_overview(10320) — 기대: total=5, 파트시급중앙값 ~12,275, 최저미만 ~0.60 ==='
select total_reports,
       round(median_hourly_part) as part_hourly_median,
       round(below_min_wage_rate, 2) as below_min_rate
from public.salary_overview(10320);

rollback;

\echo ''
\echo '=== 검증 끝 (ROLLBACK 완료 — DB 에 남은 데이터 없음) ==='
