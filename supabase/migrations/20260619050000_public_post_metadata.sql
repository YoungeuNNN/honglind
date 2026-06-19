-- ============================================================
-- 목록/제목/메타는 누구나, 본문(content)만 승인 회원에게.
--   post_previews 뷰를 확장: 모든 메타 + 좋아요/댓글/기도 카운트 노출,
--   content 는 승인 회원(또는 관리자)에게만, 그 외에는 NULL.
-- posts/comments 등 원본 테이블 RLS(승인자만 select)는 그대로 유지하여
-- API 직접 호출로 본문이 새지 않게 한다.
-- ============================================================

-- 기존 뷰(컬럼 구성이 달라 REPLACE 불가)를 먼저 제거
drop view if exists public.post_previews;

create view public.post_previews as
  select
    p.id, p.author_id, p.category, p.title,
    case when public.is_member_approved() or public.is_admin() then p.content else null end as content,
    p.views, p.cheongbing, p.market, p.attachments, p.sermon_verse, p.prayer_answered,
    p.created_at, p.updated_at,
    (select count(*) from public.post_likes   l  where l.post_id  = p.id) as like_count,
    (select count(*) from public.comments     c  where c.post_id  = p.id) as comment_count,
    (select count(*) from public.post_prayers pr where pr.post_id = p.id) as prayer_count
  from public.posts p;

grant select on public.post_previews to anon, authenticated;
