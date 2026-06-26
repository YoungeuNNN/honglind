-- ============================================================
-- 관리자 권한 + 승인/인증 완전 부여 (1회성)
--   Supabase 대시보드 → SQL Editor 에서 실행.
--   enforce_verification_change 트리거가 비관리자 컨텍스트의 상태 변경을
--   되돌리므로, 업데이트 동안만 트리거를 비활성화한다(grandfather 패턴).
--
--   대상 이메일을 본인 계정으로 확인하세요.
-- ============================================================

alter table public.profiles disable trigger profiles_enforce_verification;

update public.profiles
set
  role                = 'admin',
  membership_status   = 'approved',
  verification_status = 'verified',
  verified_at         = coalesce(verified_at, now())
where email = 'pollllllion@puts.ac.kr';

alter table public.profiles enable trigger profiles_enforce_verification;

-- 확인
select nickname, email, role, membership_status, verification_status, verified_at
from public.profiles
where email = 'pollllllion@puts.ac.kr';
