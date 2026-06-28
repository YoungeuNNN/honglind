-- ============================================================
-- 관리자 가산 좋아요(like_boost)
--   posts.like_boost: 실제 post_likes 수에 더해 표시되는 보정치(>= 0).
--   표시 좋아요 = COUNT(post_likes) + like_boost
--   posts UPDATE RLS는 'author or admin' 이므로 관리자가 like_boost를 수정할 수 있다.
-- ============================================================

alter table public.posts
  add column if not exists like_boost integer not null default 0;

-- 미리보기 뷰: like_count 에 보정치 반영 + like_boost 노출(관리자 UI용)
drop view if exists public.post_previews;

create view public.post_previews as
  select
    p.id, p.author_id, p.category, p.title,
    case when public.is_member_approved() or public.is_admin() then p.content else null end as content,
    p.views, p.cheongbing, p.market, p.attachments, p.sermon_verse, p.prayer_answered,
    p.created_at, p.updated_at,
    (select count(*) from public.post_likes   l  where l.post_id  = p.id) + p.like_boost as like_count,
    (select count(*) from public.comments     c  where c.post_id  = p.id) as comment_count,
    (select count(*) from public.post_prayers pr where pr.post_id = p.id) as prayer_count,
    p.like_boost
  from public.posts p;

grant select on public.post_previews to anon, authenticated;
