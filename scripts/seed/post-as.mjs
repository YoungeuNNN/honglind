// ============================================================
// 홍라인드 — 가계정(시드 페르소나) 명의로 글/댓글 올리기 (재사용 범용)
//   queue.json 에 적은 항목들을 순서대로 삽입한다.
//   service_role 키로 동작 → RLS 우회 (페르소나 명의로 작성).
//
//   실행:
//     node scripts/seed/post-as.mjs --dry          (미리보기, 쓰기 없음)
//     node scripts/seed/post-as.mjs                (실제 삽입)
//     node scripts/seed/post-as.mjs my-queue.json  (다른 파일 지정)
//
//   queue.json 형식 — 배열. 각 항목은 글 또는 댓글:
//   [
//     { "type": "post",    "handle": "u15", "category": "자유",
//       "title": "제목", "content": "본문\n여러 줄 가능", "views": 12 },
//     { "type": "comment", "handle": "u32", "postId": "<글 UUID>",
//       "content": "댓글 내용", "parentId": null }
//   ]
//   handle 은 personas.csv 의 handle (u01~u50). 닉네임이 아니라 핸들.
//   category: 자유 / 사역고민 / 신학토론 / 설교준비 / 기도요청 / 사역장터
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const queueArg = args.find((a) => !a.startsWith('--'));
const QUEUE_PATH = resolve(__dirname, queueArg || 'queue.json');
const DOMAIN = 'seed.honglind.local';
const VALID_CAT = new Set(['자유', '사역고민', '신학토론', '설교준비', '기도요청', '사역장터', '청빙', '연봉']);

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '.env.seed'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* */ }
}
loadEnv();
const URL = process.env.SEED_SUPABASE_URL, KEY = process.env.SEED_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('✗ scripts/seed/.env.seed 확인 (SEED_SUPABASE_URL / SEED_SERVICE_ROLE_KEY)'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// handle → user_id 캐시
const idCache = new Map();
async function idByHandle(handle) {
  if (idCache.has(handle)) return idCache.get(handle);
  const email = `${handle}@${DOMAIN}`;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) { idCache.set(handle, hit.id); return hit.id; }
    if (data.users.length < 200) break;
  }
  throw new Error(`시드 계정 없음: ${email} (personas.csv 의 handle 인지 확인)`);
}

function loadQueue() {
  let raw;
  try { raw = readFileSync(QUEUE_PATH, 'utf8'); }
  catch { console.error(`✗ 큐 파일 없음: ${QUEUE_PATH}`); process.exit(1); }
  let items;
  try { items = JSON.parse(raw); }
  catch (e) { console.error(`✗ JSON 파싱 실패: ${e.message}`); process.exit(1); }
  if (!Array.isArray(items)) { console.error('✗ 큐는 배열이어야 합니다.'); process.exit(1); }
  const errs = [];
  items.forEach((it, i) => {
    if (it.type === 'post') {
      if (!it.handle) errs.push(`#${i}: handle 없음`);
      if (!VALID_CAT.has(it.category)) errs.push(`#${i}: 잘못된 category '${it.category}'`);
      if (!it.title || !it.content) errs.push(`#${i}: title/content 필요`);
    } else if (it.type === 'comment') {
      if (!it.handle) errs.push(`#${i}: handle 없음`);
      if (!it.postId) errs.push(`#${i}: postId 필요`);
      if (!it.content) errs.push(`#${i}: content 필요`);
    } else errs.push(`#${i}: type 은 'post' 또는 'comment'`);
  });
  if (errs.length) { console.error('✗ 큐 오류:\n  - ' + errs.join('\n  - ')); process.exit(1); }
  return items;
}

async function main() {
  const items = loadQueue();
  console.log(`\n홍라인드 가계정 작성 — ${DRY ? '[DRY: 쓰기 없음]' : '실제 삽입'}`);
  console.log(`큐: ${QUEUE_PATH} (${items.length}건)\n`);

  for (const [i, it] of items.entries()) {
    const uid = await idByHandle(it.handle);
    const tag = `#${i + 1} ${it.handle}`;
    if (DRY) {
      if (it.type === 'post') console.log(`· [글] ${tag} [${it.category}] ${it.title}`);
      else console.log(`· [댓글] ${tag} → post ${it.postId}`);
      continue;
    }
    if (it.type === 'post') {
      const { data, error } = await db.from('posts').insert({
        author_id: uid, category: it.category, title: it.title, content: it.content,
        views: it.views ?? 5 + Math.floor(Math.random() * 40),
        prayer_answered: !!it.prayerAnswered, sermon_verse: it.sermonVerse ?? null,
      }).select('id').single();
      if (error) throw new Error(`글 실패 (${tag}): ${error.message}`);
      console.log(`+ [글] ${tag} [${it.category}] ${it.title}  → id ${data.id}`);
    } else {
      const { data, error } = await db.from('comments').insert({
        post_id: it.postId, author_id: uid, parent_id: it.parentId ?? null, content: it.content,
      }).select('id').single();
      if (error) throw new Error(`댓글 실패 (${tag}): ${error.message}`);
      console.log(`+ [댓글] ${tag} → id ${data.id}`);
    }
  }
  console.log(`\n✓ 완료 — ${items.length}건 처리.`);
}

main().catch((e) => { console.error('\n✗ 실패:', e.message); process.exit(1); });
