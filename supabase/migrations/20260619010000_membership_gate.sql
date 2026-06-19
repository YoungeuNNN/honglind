-- ============================================================
-- 2단계 게이트: 가입(학생증) → 읽기 / 재학증명서 → 쓰기
--
--   1단계 membership_status: pending → approved / rejected
--       · 가입 = '신청'. 학생증 업로드 후 'pending' 계정 생성
--       · 관리자가 학생증 확인 → 'approved' 시 읽기 권한 부여
--   2단계 verification_status (앞 마이그레이션): 재학증명서 → 쓰기 권한
--
-- 비로그인/미승인 사용자는 본문/댓글을 볼 수 없고,
-- post_previews 뷰를 통해 '제목 목록'만 볼 수 있다.
-- ============================================================

-- ───────────────── profiles 컬럼 추가 ─────────────────
alter table public.profiles
  add column if not exists membership_status text not null default 'pending'
    check (membership_status in ('pending', 'approved', 'rejected')),
  add column if not exists membership_note text,            -- 가입 신청 메모
  add column if not exists student_id_doc text,             -- 학생증 이미지 경로 (storage)
  add column if not exists enrollment_doc text;             -- 재학증명서 이미지 경로 (storage)

create index if not exists profiles_membership_idx
  on public.profiles (membership_status);

-- 기존 관리자 계정은 자동 승인
update public.profiles
  set membership_status = 'approved'
  where role = 'admin' and membership_status <> 'approved';

-- ───────────────── 헬퍼: 가입(학생증) 승인 여부 ─────────────────
create or replace function public.is_member_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select membership_status = 'approved' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_member_approved() to anon, authenticated;

-- ───────────────── 가입 시 신청 메모 저장 ─────────────────
-- 기존 도메인 화이트리스트 차단(EMAIL_DOMAIN_NOT_ALLOWED)을 유지하면서
-- membership_note 를 metadata 에서 받아 저장하도록 보강한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_email_allowed(new.email) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED'
      using hint = '허용되지 않은 이메일 도메인입니다. 관리자에게 문의하세요.';
  end if;
  insert into public.profiles (id, email, nickname, membership_note)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'membership_note'
  );
  return new;
end;
$$;

-- ───────────────── 상태 변경 가드 (membership + verification) ─────────────────
-- 일반 사용자는 자신을 승인/인증 상태로 올릴 수 없다.
--   membership_status: 본인은 rejected→pending(재신청)만, 승인은 관리자만
--   verification_status: 본인은 (unverified|rejected)→pending 만, 승인은 관리자만
create or replace function public.enforce_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1단계: membership_status
  if new.membership_status is distinct from old.membership_status then
    if public.is_admin() then
      null;
    elsif auth.uid() = old.id
          and new.membership_status = 'pending'
          and old.membership_status = 'rejected' then
      null; -- 본인 재신청 허용
    else
      new.membership_status := old.membership_status;
    end if;
  end if;

  -- 2단계: verification_status
  if new.verification_status is distinct from old.verification_status then
    if public.is_admin() then
      null;
    elsif auth.uid() = old.id
          and new.verification_status = 'pending'
          and old.verification_status in ('unverified', 'rejected') then
      null;
    else
      new.verification_status := old.verification_status;
    end if;
  end if;

  if new.verified_at is distinct from old.verified_at and not public.is_admin() then
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;
-- 트리거는 앞 마이그레이션에서 생성됨 (profiles_enforce_verification)

-- ───────────────── RLS: 읽기를 승인 회원으로 제한 ─────────────────
-- profiles: 본인 + 승인 회원 + 관리자만 (미승인도 자기 행은 봐야 상태 확인 가능)
drop policy if exists "profiles: read all" on public.profiles;
create policy "profiles: read approved" on public.profiles for select
  using (id = auth.uid() or public.is_member_approved() or public.is_admin());

-- posts 본문: 승인 회원 + 관리자만
drop policy if exists "posts: read all" on public.posts;
create policy "posts: read approved" on public.posts for select
  using (public.is_member_approved() or public.is_admin());

-- comments / likes / prayers / poll: 승인 회원 + 관리자만
drop policy if exists "comments: read all" on public.comments;
create policy "comments: read approved" on public.comments for select
  using (public.is_member_approved() or public.is_admin());

drop policy if exists "post_likes: read all" on public.post_likes;
create policy "post_likes: read approved" on public.post_likes for select
  using (public.is_member_approved() or public.is_admin());

drop policy if exists "post_prayers: read all" on public.post_prayers;
create policy "post_prayers: read approved" on public.post_prayers for select
  using (public.is_member_approved() or public.is_admin());

drop policy if exists "comment_likes: read all" on public.comment_likes;
create policy "comment_likes: read approved" on public.comment_likes for select
  using (public.is_member_approved() or public.is_admin());

drop policy if exists "poll_options: read all" on public.poll_options;
create policy "poll_options: read approved" on public.poll_options for select
  using (public.is_member_approved() or public.is_admin());

drop policy if exists "poll_votes: read all" on public.poll_votes;
create policy "poll_votes: read approved" on public.poll_votes for select
  using (public.is_member_approved() or public.is_admin());

-- announcements 는 공개 유지(랜딩/티저용) — 정책 변경 없음
-- allowed_email_domains 는 가입 폼용으로 anon 읽기 유지 — 변경 없음

-- ───────────────── 제목 미리보기 공개 뷰 ─────────────────
-- security definer 뷰(소유자 권한)로 posts RLS 를 우회하되, 안전한 컬럼만 노출.
create or replace view public.post_previews as
  select id, category, title, created_at, views, prayer_answered
  from public.posts;

grant select on public.post_previews to anon, authenticated;

-- ───────────────── Storage: 인증 서류 비공개 버킷 ─────────────────
insert into storage.buckets (id, name, public)
  values ('verification-docs', 'verification-docs', false)
  on conflict (id) do nothing;

-- 본인은 자기 폴더({uid}/...)에만 업로드/조회, 관리자는 전체 조회
drop policy if exists "verification-docs: insert own" on storage.objects;
create policy "verification-docs: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verification-docs: update own" on storage.objects;
create policy "verification-docs: update own" on storage.objects for update to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verification-docs: read own or admin" on storage.objects;
create policy "verification-docs: read own or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
