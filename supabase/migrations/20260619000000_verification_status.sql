-- ============================================================
-- 단계적 권한(신학대학원 재학생 인증) 도입
--   가입(unverified) → 읽기/둘러보기 가능
--   인증 신청(pending) → 관리자 검토 대기
--   승인(verified) → 글쓰기 / 댓글 / DM 가능
--   거절(rejected) → 재신청 가능
-- 서버측에서 RLS 로 강제하여 프론트 우회 가입/작성을 차단한다.
-- ============================================================

-- ───────────────── profiles 컬럼 추가 ─────────────────
alter table public.profiles
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  add column if not exists verification_note text,   -- 신청 시 제출 메모 / 거절 사유
  add column if not exists verified_at timestamptz;

create index if not exists profiles_verification_idx
  on public.profiles (verification_status);

-- 기존 관리자 계정은 자동 인증 처리
update public.profiles
  set verification_status = 'verified', verified_at = now()
  where role = 'admin' and verification_status <> 'verified';

-- ───────────────── 헬퍼: 현재 사용자 인증 여부 ─────────────────
create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select verification_status = 'verified' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_verified() to anon, authenticated;

-- ───────────────── 인증 상태 변경 가드 트리거 ─────────────────
-- 일반 사용자는 자신을 'verified' 로 올릴 수 없다.
--   · 관리자: 모든 전환 허용
--   · 본인: unverified/rejected → pending (인증 신청) 만 허용
--   · 그 외 변경 시도는 무시(이전 값 유지)
-- verified_at 은 관리자만 변경 가능.
create or replace function public.enforce_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    if public.is_admin() then
      null; -- 관리자는 그대로 허용
    elsif auth.uid() = old.id
          and new.verification_status = 'pending'
          and old.verification_status in ('unverified', 'rejected') then
      null; -- 본인 인증 신청 허용
    else
      new.verification_status := old.verification_status; -- 그 외엔 되돌림
    end if;
  end if;

  if new.verified_at is distinct from old.verified_at and not public.is_admin() then
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_verification on public.profiles;
create trigger profiles_enforce_verification
  before update on public.profiles
  for each row execute function public.enforce_verification_change();

-- ───────────────── RLS: 작성 권한을 verified 로 제한 ─────────────────
-- 읽기(select) 정책은 그대로 두고, insert 정책만 교체한다.

-- posts
drop policy if exists "posts: insert auth" on public.posts;
create policy "posts: insert verified" on public.posts
  for insert with check (author_id = auth.uid() and (public.is_verified() or public.is_admin()));

-- comments
drop policy if exists "comments: insert auth" on public.comments;
create policy "comments: insert verified" on public.comments
  for insert with check (author_id = auth.uid() and (public.is_verified() or public.is_admin()));

-- messages (DM)
drop policy if exists "messages: insert as sender" on public.messages;
create policy "messages: insert verified" on public.messages
  for insert with check (sender_id = auth.uid() and (public.is_verified() or public.is_admin()));
