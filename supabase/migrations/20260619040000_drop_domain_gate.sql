-- ============================================================
-- 이메일 도메인 가입 제한 해제
--   신대원 재학 검증이 학생증/재학증명서(관리자 승인)로 바뀌었으므로,
--   가입 시 이메일 도메인(예: puts.ac.kr) 강제를 제거한다.
--   allowed_email_domains 테이블/함수는 그대로 두어 추후 재사용 가능.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
