-- ============================================================
-- 홍라인드 (Honglind) 초기 스키마
-- 사역자/신학생 익명 커뮤니티
-- ============================================================

-- ───────────────── Extensions ─────────────────
create extension if not exists pgcrypto;

-- ───────────────── Profiles ─────────────────
-- auth.users(id) 와 1:1. 트리거로 가입 시 자동 생성.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text not null,
  email         text,
  affiliation   text,
  role          text not null default 'user' check (role in ('admin', 'user')),
  banned        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index profiles_nickname_idx on public.profiles (nickname);

-- 가입 시 자동 profile 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 헬퍼: 현재 사용자 admin 여부
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ───────────────── Posts ─────────────────
create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  category        text not null,
  title           text not null,
  content         text not null,
  views           integer not null default 0,
  cheongbing      jsonb,
  sermon_verse    text,
  prayer_answered boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_category_idx   on public.posts (category);
create index posts_author_id_idx  on public.posts (author_id);

-- views 카운터 (atomic). SECURITY DEFINER 로 RLS 우회 — 누구나 조회 시 +1
create or replace function public.increment_post_views(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set views = views + 1 where id = p_post_id;
$$;

-- ───────────────── Post Likes ─────────────────
create table public.post_likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

-- ───────────────── Post Prayers ─────────────────
create table public.post_prayers (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_prayers_user_idx on public.post_prayers (user_id);

-- ───────────────── Comments ─────────────────
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  parent_id   uuid references public.comments(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index comments_post_idx on public.comments (post_id);
create index comments_parent_idx on public.comments (parent_id);

-- ───────────────── Comment Likes ─────────────────
create table public.comment_likes (
  comment_id  uuid not null references public.comments(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ───────────────── Bookmarks ─────────────────
create table public.bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ───────────────── Blocks ─────────────────
create table public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ───────────────── Notifications ─────────────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('like', 'prayer', 'comment', 'reply')),
  post_id     uuid references public.posts(id) on delete cascade,
  message     text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ───────────────── Messages (DM) ─────────────────
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  read         boolean not null default false,
  created_at   timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create index messages_thread_idx on public.messages (sender_id, receiver_id, created_at);
create index messages_inbox_idx  on public.messages (receiver_id, read);

-- ───────────────── Reports ─────────────────
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('post', 'comment')),
  target_id    uuid not null,
  reason       text not null,
  detail       text,
  status       text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

-- ───────────────── Announcements ─────────────────
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);
create index announcements_created_idx on public.announcements (created_at desc);

-- ───────────────── Polls (특수 카테고리) ─────────────────
create table public.poll_options (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  text        text not null,
  position    integer not null,
  created_at  timestamptz not null default now()
);
create index poll_options_post_idx on public.poll_options (post_id, position);

create table public.poll_votes (
  option_id   uuid not null references public.poll_options(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (option_id, user_id)
);
create index poll_votes_user_idx on public.poll_votes (user_id);

-- ============================================================
-- RLS 정책
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.posts          enable row level security;
alter table public.post_likes     enable row level security;
alter table public.post_prayers   enable row level security;
alter table public.comments       enable row level security;
alter table public.comment_likes  enable row level security;
alter table public.bookmarks      enable row level security;
alter table public.blocks         enable row level security;
alter table public.notifications  enable row level security;
alter table public.messages       enable row level security;
alter table public.reports        enable row level security;
alter table public.announcements  enable row level security;
alter table public.poll_options   enable row level security;
alter table public.poll_votes     enable row level security;

-- ── profiles ──
create policy "profiles: read all"            on public.profiles for select using (true);
create policy "profiles: insert own"          on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own or admin" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "profiles: delete own or admin" on public.profiles for delete using (id = auth.uid() or public.is_admin());

-- ── posts ──
create policy "posts: read all"               on public.posts for select using (true);
create policy "posts: insert auth"            on public.posts for insert with check (author_id = auth.uid());
create policy "posts: update own or admin"    on public.posts for update using (author_id = auth.uid() or public.is_admin());
create policy "posts: delete own or admin"    on public.posts for delete using (author_id = auth.uid() or public.is_admin());

-- ── post_likes / post_prayers ──
create policy "post_likes: read all"          on public.post_likes for select using (true);
create policy "post_likes: insert own"        on public.post_likes for insert with check (user_id = auth.uid());
create policy "post_likes: delete own"        on public.post_likes for delete using (user_id = auth.uid());

create policy "post_prayers: read all"        on public.post_prayers for select using (true);
create policy "post_prayers: insert own"      on public.post_prayers for insert with check (user_id = auth.uid());
create policy "post_prayers: delete own"      on public.post_prayers for delete using (user_id = auth.uid());

-- ── comments ──
create policy "comments: read all"            on public.comments for select using (true);
create policy "comments: insert auth"         on public.comments for insert with check (author_id = auth.uid());
create policy "comments: update own or admin" on public.comments for update using (author_id = auth.uid() or public.is_admin());
create policy "comments: delete own or admin" on public.comments for delete using (author_id = auth.uid() or public.is_admin());

-- ── comment_likes ──
create policy "comment_likes: read all"       on public.comment_likes for select using (true);
create policy "comment_likes: insert own"     on public.comment_likes for insert with check (user_id = auth.uid());
create policy "comment_likes: delete own"     on public.comment_likes for delete using (user_id = auth.uid());

-- ── bookmarks ──
create policy "bookmarks: read own"           on public.bookmarks for select using (user_id = auth.uid());
create policy "bookmarks: insert own"         on public.bookmarks for insert with check (user_id = auth.uid());
create policy "bookmarks: delete own"         on public.bookmarks for delete using (user_id = auth.uid());

-- ── blocks ──
create policy "blocks: read own"              on public.blocks for select using (blocker_id = auth.uid());
create policy "blocks: insert own"            on public.blocks for insert with check (blocker_id = auth.uid());
create policy "blocks: delete own"            on public.blocks for delete using (blocker_id = auth.uid());

-- ── notifications ──
create policy "notifications: read own"       on public.notifications for select using (user_id = auth.uid());
create policy "notifications: insert auth"    on public.notifications for insert with check (auth.uid() is not null);
create policy "notifications: update own"     on public.notifications for update using (user_id = auth.uid());
create policy "notifications: delete own"     on public.notifications for delete using (user_id = auth.uid());

-- ── messages ──
create policy "messages: read participant"    on public.messages for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "messages: insert as sender"    on public.messages for insert with check (sender_id = auth.uid());
create policy "messages: update receiver"     on public.messages for update using (receiver_id = auth.uid());

-- ── reports ──
create policy "reports: read own or admin"    on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports: insert auth"          on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports: update admin"         on public.reports for update using (public.is_admin());
create policy "reports: delete admin"         on public.reports for delete using (public.is_admin());

-- ── announcements ──
create policy "announcements: read all"       on public.announcements for select using (true);
create policy "announcements: insert admin"   on public.announcements for insert with check (public.is_admin());
create policy "announcements: update admin"   on public.announcements for update using (public.is_admin());
create policy "announcements: delete admin"   on public.announcements for delete using (public.is_admin());

-- ── poll_options ──
create policy "poll_options: read all"        on public.poll_options for select using (true);
create policy "poll_options: insert post owner" on public.poll_options
  for insert with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "poll_options: delete post owner" on public.poll_options
  for delete using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- ── poll_votes ──
create policy "poll_votes: read all"          on public.poll_votes for select using (true);
create policy "poll_votes: insert own"        on public.poll_votes for insert with check (user_id = auth.uid());
create policy "poll_votes: delete own"        on public.poll_votes for delete using (user_id = auth.uid());

-- 익명 권한 (Realtime 등에서 참조용)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on function public.increment_post_views(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
