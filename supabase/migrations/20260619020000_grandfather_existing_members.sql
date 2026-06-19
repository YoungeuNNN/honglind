-- ============================================================
-- 기존 회원 그랜드파더링 (1회성)
--   이 마이그레이션 적용 시점까지 가입한 회원에게
--   읽기(학생증 승인) + 쓰기(재학증명서 인증) 권한을 일괄 부여한다.
--
-- 주의: enforce_verification_change 트리거는 관리자가 아닌 컨텍스트의
-- 상태 변경을 되돌린다. 마이그레이션은 auth.uid() 가 없어 '관리자 아님'으로
-- 판정되므로, 업데이트 동안만 트리거를 비활성화한다.
-- ============================================================

alter table public.profiles disable trigger profiles_enforce_verification;

update public.profiles
set
  membership_status   = 'approved',
  verification_status = 'verified',
  verified_at         = coalesce(verified_at, now())
where created_at < now()
  and (membership_status <> 'approved' or verification_status <> 'verified');

alter table public.profiles enable trigger profiles_enforce_verification;
