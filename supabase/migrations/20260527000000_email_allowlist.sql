-- ============================================================
-- 회원가입 허용 이메일 도메인 화이트리스트
-- ============================================================
-- 가입은 본 테이블에 등록된 도메인의 이메일로만 허용된다.
-- 도메인은 모두 lowercase 로 저장된다. 매칭은 '@' 이후 부분만 비교한다.
-- 가입 차단은 클라이언트 검증 + handle_new_user 트리거 가드의 2중 구조.

create table public.allowed_email_domains (
  id          uuid primary key default gen_random_uuid(),
  domain      text not null unique check (domain = lower(domain) and domain <> ''),
  description text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index allowed_email_domains_domain_idx on public.allowed_email_domains (domain);

alter table public.allowed_email_domains enable row level security;

-- 화이트리스트는 가입 폼 드롭다운에서 anon 도 조회 가능해야 한다
create policy "allowed_email_domains: read all"     on public.allowed_email_domains
  for select using (true);
create policy "allowed_email_domains: insert admin" on public.allowed_email_domains
  for insert with check (public.is_admin());
create policy "allowed_email_domains: update admin" on public.allowed_email_domains
  for update using (public.is_admin());
create policy "allowed_email_domains: delete admin" on public.allowed_email_domains
  for delete using (public.is_admin());

grant select on public.allowed_email_domains to anon, authenticated;
grant insert, update, delete on public.allowed_email_domains to authenticated;

-- 헬퍼: 이메일의 도메인이 허용 리스트에 있는지
create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_email_domains
    where domain = lower(split_part(p_email, '@', 2))
  );
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;

-- handle_new_user 트리거 보강: 허용 도메인이 아니면 가입 차단
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
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- 초기 허용 도메인 시드
insert into public.allowed_email_domains (domain, description)
values ('puts.ac.kr', '평택대학교 신학대학원')
on conflict (domain) do nothing;
