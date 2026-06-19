-- ============================================================
-- 사역장터 게시판 (Phase 1: 게시판 + 거래정보 + 자료 첨부, 결제 없음)
--   posts.market       : 거래 메타(유형/가격/상태/연락) jsonb
--   posts.attachments  : 첨부 파일/이미지 목록 jsonb 배열
-- 자료/미리보기 파일은 별도 공개 버킷(market-files)에 저장한다.
-- (결제 연동은 Phase 2 — 사업자/PG 준비 후 별도 작업)
-- ============================================================

alter table public.posts
  add column if not exists market jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ───────────────── Storage: 사역장터 첨부 버킷 ─────────────────
-- 미리보기 이미지가 <img> 로 바로 보이도록 공개 버킷으로 둔다.
-- (실제 유료 자료 다운로드 보호는 Phase 2 결제 연동 시 비공개 전환)
insert into storage.buckets (id, name, public)
  values ('market-files', 'market-files', true)
  on conflict (id) do nothing;

drop policy if exists "market-files: insert own" on storage.objects;
create policy "market-files: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'market-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "market-files: update own" on storage.objects;
create policy "market-files: update own" on storage.objects for update to authenticated
  using (bucket_id = 'market-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "market-files: delete own" on storage.objects;
create policy "market-files: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'market-files' and (storage.foldername(name))[1] = auth.uid()::text);
