-- ============================================================
-- 처음부터 다시 시작: 콘텐츠 전체 삭제 + 본인 계정 관리자/승인/인증
--   Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번에 실행.
--   하나의 트랜잭션으로 처리되어 중간 실패 시 전체 롤백됩니다.
--
--   ⚠️ posts/comments/공지/신고/DM/알림이 전부 삭제됩니다. 계정/프로필은 유지.
--   대상 관리자 이메일이 본인 계정인지 반드시 확인하세요.
-- ============================================================

begin;

-- ── 1) 콘텐츠 전체 삭제 ──
-- posts 삭제 시 comments / post_likes / post_prayers / bookmarks /
-- poll_options / poll_votes / comment_likes / (post 참조)notifications 는
-- on delete cascade 로 함께 삭제된다.
delete from public.messages;
delete from public.reports;
delete from public.notifications;
delete from public.announcements;
delete from public.posts;

-- ── 2) 본인 계정에 모든 권한 ──
-- enforce_verification_change 트리거는 비관리자 컨텍스트의 상태 변경을
-- 되돌리므로, 업데이트 동안만 비활성화한다.
alter table public.profiles disable trigger profiles_enforce_verification;

update public.profiles
set
  role                = 'admin',
  membership_status   = 'approved',
  verification_status = 'verified',
  verified_at         = coalesce(verified_at, now())
where email = 'pollllllion@puts.ac.kr';

alter table public.profiles enable trigger profiles_enforce_verification;

commit;

-- ── 확인 ──
select 'posts' as tbl, count(*) from public.posts
union all select 'comments', count(*) from public.comments
union all select 'announcements', count(*) from public.announcements
union all select 'messages', count(*) from public.messages;

select nickname, email, role, membership_status, verification_status
from public.profiles
where email = 'pollllllion@puts.ac.kr';
