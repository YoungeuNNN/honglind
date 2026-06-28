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
  handle: 'u14',            // 주1일출근 (시니컬·자조 톤, 주말 파트타임 전도사)
  category: '사역고민',      // 자유 | 사역고민 | 신학토론 | 설교준비 | 기도요청
  title: '하 사역지 옮겨야 할까요,,',
  content:
    '매주 주일이면 퇴근이 오후 9시 넘어요. 9시요...\n' +
    '아침 일찍 나가서 예배 세팅하고 부서 돌고 마감까지 하면 하루가 그냥 통째로 사라짐ㅎㅎ\n' +
    '주 1회 출근인데 그 하루가 평일 이틀치 같은 느낌이랄까.\n' +
    '사명으로 버틴다 버틴다 하는데 요즘은 진짜 옮겨야 하나 싶은 생각이 자꾸 드네요.\n' +
    '다들 주일에 몇 시쯤 퇴근하세요...? 저만 이런 건가 싶어서요.',
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
