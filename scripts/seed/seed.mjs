// ============================================================
// 홍라인드 시드 러너
//   seed-content.mjs 의 ACCOUNTS / POSTS / COMMENTS 를 읽어
//   실제 Supabase 에 계정·글·댓글·반응을 적재한다.
//
//   service_role(secret) 키로 동작 → RLS 우회 (남의 명의로 글 작성 가능).
//   ※ 이 키는 절대 클라이언트/깃에 노출 금지. scripts/seed/.env.seed 에만 둘 것.
//
// 실행:
//   1) scripts/seed/.env.seed 작성 (.env.seed.example 참고)
//   2) 프로젝트 루트에서:  node scripts/seed/seed.mjs
//      (미리보기만:        node scripts/seed/seed.mjs --dry)
//
// 계정 승인/인증 상태는 트리거 때문에 여기서 못 올린다.
// 적재 후 scripts/seed/promote-seed.sql 을 Supabase SQL 에디터에서 1회 실행.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ACCOUNTS, POSTS, COMMENTS } from './seed-content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const EMAIL_DOMAIN = 'seed.honglind.local'; // promote-seed.sql 이 이 도메인으로 시드 계정을 찾음

// ── .env.seed 로드 (dotenv 의존성 없이 간단 파싱) ──
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '.env.seed'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* .env.seed 없으면 OS 환경변수 사용 */
  }
}
loadEnv();

const URL = process.env.SEED_SUPABASE_URL;
const KEY = process.env.SEED_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('✗ SEED_SUPABASE_URL / SEED_SERVICE_ROLE_KEY 가 필요합니다. scripts/seed/.env.seed 를 확인하세요.');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ── 유틸 ──
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function ts(daysAgo = 0, atHour) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(atHour ?? rand(7, 23), rand(0, 59), rand(0, 59), 0);
  return d.toISOString();
}
const log = (...a) => console.log(...a);

// 이미 존재하는 시드 계정이면 재사용 (재실행 멱등성)
async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  log(`\n홍라인드 시드 — ${DRY ? '[DRY RUN: 쓰기 없음]' : '실제 적재'}`);
  log(`대상: ${URL}`);
  log(`계정 ${ACCOUNTS.length} · 글 ${POSTS.length} · 댓글 ${COMMENTS.length}\n`);
  if (DRY) {
    log('— dry run 이라 실제 쓰기는 하지 않습니다. 콘텐츠 검증만 수행 —');
    validate();
    log('\n✓ 콘텐츠 구조 OK. 실제 적재는 --dry 빼고 다시 실행하세요.');
    return;
  }
  validate();

  // ── 1) 계정 ──
  const idByHandle = new Map();
  for (const a of ACCOUNTS) {
    const email = `${a.handle}@${EMAIL_DOMAIN}`;
    let user = await findUserByEmail(email);
    if (user) {
      log(`· 계정 재사용  ${a.nickname} (${email})`);
    } else {
      const password = `Seed!${Math.random().toString(36).slice(2)}9aZ`;
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: a.nickname },
      });
      if (error) throw new Error(`계정 생성 실패 ${email}: ${error.message}`);
      user = data.user;
      log(`+ 계정 생성  ${a.nickname} (${email})`);
    }
    idByHandle.set(a.handle, user.id);
    // 닉네임/소속 갱신 (트리거가 막지 않는 컬럼만)
    const { error: pErr } = await db
      .from('profiles')
      .update({ nickname: a.nickname, affiliation: a.affiliation || null })
      .eq('id', user.id);
    if (pErr) throw new Error(`프로필 갱신 실패 ${a.nickname}: ${pErr.message}`);
  }

  // ── 2) 글 ──
  const postIdByKey = new Map();
  for (const p of POSTS) {
    const author_id = idByHandle.get(p.author);
    if (!author_id) throw new Error(`글 ${p.key}: author '${p.author}' 미정의`);
    const row = {
      author_id,
      category: p.category,
      title: p.title,
      content: p.content,
      created_at: ts(p.daysAgo, p.atHour),
      views: p.views ?? rand(8, 80),
      prayer_answered: !!p.prayerAnswered,
      sermon_verse: p.sermonVerse ?? null,
      market: p.market ?? null,
    };
    const { data, error } = await db.from('posts').insert(row).select('id').single();
    if (error) throw new Error(`글 적재 실패 ${p.key}: ${error.message}`);
    postIdByKey.set(p.key, data.id);

    // 좋아요 / 기도
    for (const h of p.likedBy ?? []) {
      const uid = idByHandle.get(h);
      if (uid) await db.from('post_likes').insert({ post_id: data.id, user_id: uid }).then(() => {});
    }
    for (const h of p.prayedBy ?? []) {
      const uid = idByHandle.get(h);
      if (uid) await db.from('post_prayers').insert({ post_id: data.id, user_id: uid }).then(() => {});
    }
    log(`+ 글  [${p.category}] ${p.title.slice(0, 28)}`);
  }

  // ── 3) 댓글 / 대댓글 ──
  const commentIdByKey = new Map();
  for (const c of COMMENTS) {
    const post_id = postIdByKey.get(c.post);
    const author_id = idByHandle.get(c.author);
    if (!post_id) throw new Error(`댓글: post '${c.post}' 미정의`);
    if (!author_id) throw new Error(`댓글: author '${c.author}' 미정의`);
    const parent_id = c.replyTo ? commentIdByKey.get(c.replyTo) ?? null : null;
    const { data, error } = await db
      .from('comments')
      .insert({ post_id, author_id, parent_id, content: c.content, created_at: ts(c.daysAgo, c.atHour) })
      .select('id')
      .single();
    if (error) throw new Error(`댓글 적재 실패 (post ${c.post}): ${error.message}`);
    if (c.key) commentIdByKey.set(c.key, data.id);
  }
  log(`+ 댓글 ${COMMENTS.length}개`);

  log('\n✓ 적재 완료.');
  log('  → 마지막으로 scripts/seed/promote-seed.sql 을 Supabase SQL 에디터에서 1회 실행하면');
  log('    시드 계정이 승인·인증 상태가 되어 글 작성자와 상태가 일치합니다.\n');
}

// ── 콘텐츠 사전 검증 ──
function validate() {
  const handles = new Set(ACCOUNTS.map((a) => a.handle));
  const postKeys = new Set(POSTS.map((p) => p.key));
  const VALID_CAT = new Set(['자유', '사역고민', '신학토론', '설교준비', '기도요청', '연봉', '사역장터', '청빙']);
  const errs = [];
  if (handles.size !== ACCOUNTS.length) errs.push('ACCOUNTS handle 중복');
  if (postKeys.size !== POSTS.length) errs.push('POSTS key 중복');
  for (const p of POSTS) {
    if (!handles.has(p.author)) errs.push(`글 ${p.key}: 미정의 author '${p.author}'`);
    if (!VALID_CAT.has(p.category)) errs.push(`글 ${p.key}: 알 수 없는 category '${p.category}'`);
  }
  const seenC = new Set();
  for (const c of COMMENTS) {
    if (!postKeys.has(c.post)) errs.push(`댓글: 미정의 post '${c.post}'`);
    if (!handles.has(c.author)) errs.push(`댓글: 미정의 author '${c.author}'`);
    if (c.key) seenC.add(c.key);
    if (c.replyTo && !seenC.has(c.replyTo)) errs.push(`댓글 replyTo '${c.replyTo}': 앞선 댓글 key 가 없음(순서 확인)`);
  }
  if (errs.length) {
    console.error('✗ 콘텐츠 오류:\n  - ' + errs.join('\n  - '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\n✗ 실패:', e.message);
  process.exit(1);
});
