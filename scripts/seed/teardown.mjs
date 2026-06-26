// ============================================================
// 시드 데이터 제거 (롤백)
//   @seed.honglind.local 계정과 그들이 쓴 글/댓글/반응을 모두 삭제.
//   글 삭제 시 댓글/좋아요/기도/북마크는 FK on delete cascade 로 함께 지워진다.
//
//   실행:  node scripts/seed/teardown.mjs
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
  console.error('✗ SEED_SUPABASE_URL / SEED_SERVICE_ROLE_KEY 필요 (.env.seed)');
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let removed = 0;
for (let page = 1; page <= 20; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  const seeds = data.users.filter((u) => u.email?.endsWith(`@${EMAIL_DOMAIN}`));
  for (const u of seeds) {
    // 글을 먼저 지워야(author_id 는 on delete set null 이므로) 글이 남지 않는다.
    await db.from('posts').delete().eq('author_id', u.id);
    const { error: dErr } = await db.auth.admin.deleteUser(u.id);
    if (dErr) console.error(`  ! 삭제 실패 ${u.email}: ${dErr.message}`);
    else { removed++; console.log(`- 삭제 ${u.email}`); }
  }
  if (data.users.length < 200) break;
}
console.log(`\n✓ 시드 계정 ${removed}개 및 관련 글 제거 완료.`);
