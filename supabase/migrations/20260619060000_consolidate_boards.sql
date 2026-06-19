-- ============================================================
-- 게시판 정리
--   삭제: 교회생활, 신학교(신학교생활) → 기존 글은 '자유'로 이동
--   이름변경: 설교나눔 → 설교준비
-- (posts.category 는 text 라 제약 없음 — 단순 값 갱신)
-- ============================================================

update public.posts set category = '자유'   where category in ('교회생활', '신학교');
update public.posts set category = '설교준비' where category = '설교나눔';
