-- ============================================================
-- 시드 계정 승인·인증 처리 (1회성)
--   seed.mjs 적재 후 Supabase 대시보드 → SQL Editor 에서 실행.
--
--   enforce_verification_change 트리거는 관리자가 아닌 컨텍스트의
--   상태 변경을 되돌리므로, 업데이트 동안만 트리거를 비활성화한다.
--   (grandfather 마이그레이션과 동일한 패턴)
--
--   대상: 이메일이 '@seed.honglind.local' 인 계정만.
-- ============================================================

alter table public.profiles disable trigger profiles_enforce_verification;

update public.profiles
set
  membership_status   = 'approved',
  verification_status = 'verified',
  verified_at         = coalesce(verified_at, now())
where email like '%@seed.honglind.local'
  and (membership_status <> 'approved' or verification_status <> 'verified');

alter table public.profiles enable trigger profiles_enforce_verification;

-- 확인
select nickname, email, membership_status, verification_status
from public.profiles
where email like '%@seed.honglind.local'
order by created_at;
