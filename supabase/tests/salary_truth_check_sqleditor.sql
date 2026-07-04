-- ============================================================
-- 사례비 진실 DB — 검증 (Supabase 대시보드 SQL Editor 용)
-- ============================================================
-- Docker/psql 없이 확인하는 버전. psql 메타명령(\echo) 없음.
--
-- 사용법:
--   1) (선행) 마이그레이션 20260706000000_salary_truth.sql 이 이 프로젝트에 적용돼 있어야 함
--      · db push 전에 안전하게 보려면: 새 dev 프로젝트 또는 Supabase 브랜치에서 먼저 실행 권장
--      · 마이그레이션 자체도 SQL Editor 에 통째로 붙여넣어 만들 수 있음
--   2) 아래 전체를 SQL Editor 에 붙여넣고 Run
--   3) 결과 표의 '결과' 열이 '기대' 열과 맞는지 눈으로 확인
--
-- 전체가 BEGIN ... ROLLBACK 이라 시드 데이터는 DB 에 남지 않는다.
-- (SQL Editor 가 트랜잭션 제어를 막아 결과가 안 보이면, 맨 끝 ROLLBACK 을 지우고 Run 한 뒤
--  마지막에 아래 한 줄로 직접 정리:
--    delete from public.salary_reports where church_key in ('test-gangnam','test-small');)
-- ============================================================

begin;

-- 그룹 A: 서울 강남구 · 파트전도사 3건 (k>=3 통과 → 노출돼야)
insert into public.salary_reports
  (reporter_id, denomination, region_sido, region_sigungu, church_size, position,
   monthly_stipend, weekly_hours, housing_provided, insurance_4, serve_year, church_key)
values
  (null,'예장합동','서울','강남구','300-1000','파트전도사',1300000,24,false,false,2025,'test-gangnam'),
  (null,'예장합동','서울','강남구','300-1000','파트전도사', 800000,25,false,false,2025,'test-gangnam'),
  (null,'예장합동','서울','강남구','300-1000','파트전도사',1600000,30,true ,true ,2025,'test-gangnam');

-- 그룹 B: 경기 성남시 · 교육전도사 2건 (k<3 → 숨겨져야)
insert into public.salary_reports
  (reporter_id, denomination, region_sido, region_sigungu, church_size, position,
   monthly_stipend, weekly_hours, serve_year, church_key)
values
  (null,'예장통합','경기','성남시','150-300','교육전도사',1500000,40,2025,'test-small'),
  (null,'예장통합','경기','성남시','150-300','교육전도사',1200000,35,2025,'test-small');

-- 한 개의 진단 표로 반환
select ord, 검사, 결과, 기대 from (
  select 1 as ord,
         'k>=3 지역 필터: 노출 그룹 수' as 검사,
         (select count(*)::text from public.salary_agg_by_region())        as 결과,
         '1  (경기 성남시 2건은 숨겨져야 정상)'                              as 기대
  union all
  select 2, '교회 test-gangnam(3건) 행수',
         (select count(*)::text from public.salary_agg_by_church('test-gangnam')),
         '1'
  union all
  select 3, '교회 test-small(2건) 행수  → null 증명',
         (select count(*)::text from public.salary_agg_by_church('test-small')),
         '0'
  union all
  select 4, '개요: 총 제보 수',
         (select total_reports::text from public.salary_overview(10320)),
         '5'
  union all
  select 5, '개요: 파트전도사 시급 중앙값',
         (select round(median_hourly_part)::text from public.salary_overview(10320)),
         '약 12275'
  union all
  select 6, '개요: 최저임금(10320) 미만 비율',
         (select round(below_min_wage_rate, 2)::text from public.salary_overview(10320)),
         '0.60'
) t
order by ord;

rollback;
