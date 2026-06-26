// ============================================================
// 글 1개 올리기 (지정 페르소나 명의, 오늘 날짜)
//   아래 POST 객체만 바꿔서 매일 한 편씩 올릴 수 있다.
//   계정은 없으면 자동 생성(@seed.honglind.local), 있으면 재사용.
//
//   실행:  node scripts/seed/post-one.mjs
//          node scripts/seed/post-one.mjs --dry   (미리보기, 쓰기 없음)
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PERSONAS } from './personas.mjs';

// ── 오늘 올릴 글 ──────────────────────────────────────────────
const POST = {
  handle: 'u22',            // 누구 명의로 (personas.mjs 의 handle)
  category: '자유',          // 자유 | 사역고민 | 신학토론 | 설교준비 | 기도요청
  title: '첫 글이네요',
  content:
    '둘러보다 보니 아직 아무 글도 없어서, 제가 첫 글을 남기게 되네요,,\n' +
    '같은 길 걷는 분들 모이는 공간이 생긴 것 같아 반갑습니다.\n' +
    '휑하지만 앞으로 하나둘 채워지겠죠. 다들 자주 들러요.',
};
// ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const EMAIL_DOMAIN = 'seed.honglind.local';

try {
  const raw = readFileSync(resolve(__dirname, '.env.seed'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const URL = process.env.SEED_SUPABASE_URL;
const KEY = process.env.SEED_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('✗ SEED_SUPABASE_URL / SEED_SERVICE_ROLE_KEY 필요 (scripts/seed/.env.seed)');
  process.exit(1);
}

const persona = PERSONAS.find((p) => p.handle === POST.handle);
if (!persona) { console.error(`✗ personas.mjs 에 handle '${POST.handle}' 없음`); process.exit(1); }
const email = `${POST.handle}@${EMAIL_DOMAIN}`;

console.log(`\n글 1개 올리기 — ${DRY ? '[DRY RUN]' : '실제 게시'}`);
console.log(`작성자 : ${persona.nickname} (${email})`);
console.log(`게시판 : ${POST.category}`);
console.log(`제목   : ${POST.title}`);
console.log(`본문   :\n${POST.content}\n`);
if (DRY) { console.log('[DRY] 실제 게시는 --dry 빼고 실행'); process.exit(0); }

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(em) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === em);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

let user = await findUserByEmail(email);
if (user) {
  console.log('· 계정 재사용');
} else {
  const password = `Seed!${Math.random().toString(36).slice(2)}9aZ`;
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nickname: persona.nickname },
  });
  if (error) { console.error('✗ 계정 생성 실패:', error.message); process.exit(1); }
  user = data.user;
  console.log('+ 계정 생성');
}

await db.from('profiles').update({ nickname: persona.nickname }).eq('id', user.id);

const { data: post, error } = await db
  .from('posts')
  .insert({
    author_id: user.id,
    category: POST.category,
    title: POST.title,
    content: POST.content,
    views: 1,
  })
  .select('id, created_at')
  .single();
if (error) { console.error('✗ 게시 실패:', error.message); process.exit(1); }

console.log(`\n✓ 게시 완료 (${post.created_at})`);
console.log(`  글 ID: ${post.id}`);
console.log('  홈페이지 새로고침하면 보입니다.');
