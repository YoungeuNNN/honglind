// ============================================================
// 홍라인드 — 페르소나 명의로 댓글 1 + 글 2 삽입 (1회성)
//   · 첫 사역고민 글에 댓글 (jenny_p / u32)
//   · 기도요청 글 1 (기도탑주인 / u35)
//   · 자유 글 1 (coffeeholic / u02)
//   service_role 키로 동작 → RLS 우회.
//
//   실행:  node scripts/seed/insert-content.mjs --dry   (미리보기)
//          node scripts/seed/insert-content.mjs         (실제 삽입)
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const DOMAIN = 'seed.honglind.local';
const TARGET_POST_ID = '12c551a5-44eb-44f3-aca4-bbc3cc4de569'; // "하 사역지 옮겨야 할까요,,"

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
if (!URL || !KEY) { console.error('✗ .env.seed 확인'); process.exit(1); }
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function idByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`계정 없음: ${email}`);
}

// 작성할 내용
const COMMENT = {
  byHandle: 'u32', // jenny_p
  content:
    '헐 주일 9시 퇴근이라니ㅠㅠ 진짜 고생 많으세요... 저도 주일 끝나면 영혼까지 탈탈 털리는 느낌이라 너무 공감돼요. ' +
    '옮길까 하는 마음이 드는 게 이상한 게 아니라, 그만큼 진심으로 감당해오셨다는 증거 같아요. ' +
    '너무 혼자 짊어지지 마시고 한 주만이라도 쉼 꼭 챙기시길요. 응원하고 또 기도할게요!',
};

const PRAYER_POST = {
  byHandle: 'u35', // 기도탑주인
  category: '기도요청',
  title: '지친 동역자들을 위해 함께 기도해요',
  content:
    '요즘 주변에 몸도 마음도 많이 지친 동역자들이 자주 눈에 들어옵니다. 사명으로 버틴다지만, 그 버팀이 길어지면 사람이 마르더라고요.\n' +
    '오늘도 기도탑에서 그분들 한 분 한 분 떠올리며 기도했습니다. 이 글 보시는 분들도 곁에 지친 동역자 한 명을 마음에 품고 함께 중보해 주시면 좋겠어요.\n' +
    '강건함과 쉼을, 그리고 무엇보다 처음 부르심의 기쁨이 회복되기를 기도합니다.',
};

const FREE_POST = {
  byHandle: 'u02', // coffeeholic
  category: '자유',
  title: '오늘도 아아 한 잔으로 하루를 엽니다 ㅋㅋ',
  content:
    '심방 나가기 전에 카페 들러 아이스 아메리카노 픽업하는 게 요즘 유일한 낙이네요.\n' +
    '잠은 부족한데 할 일은 왜 안 줄어드는지... 다들 사역하면서 카페인 얼마나 드세요? ' +
    '저는 하루 두 잔은 기본인데 줄여야 하나 고민만 석 달째입니다 ㅎㅎ 오늘도 다들 화이팅이에요!',
};

async function main() {
  console.log(`\n콘텐츠 삽입 — ${DRY ? '[DRY: 쓰기 없음]' : '실제 삽입'}\n`);

  const uComment = await idByEmail(`${COMMENT.byHandle}@${DOMAIN}`);
  const uPrayer  = await idByEmail(`${PRAYER_POST.byHandle}@${DOMAIN}`);
  const uFree    = await idByEmail(`${FREE_POST.byHandle}@${DOMAIN}`);

  if (DRY) {
    console.log('· 댓글   →', COMMENT.byHandle, '→ post', TARGET_POST_ID);
    console.log('· 기도요청 글 →', PRAYER_POST.byHandle, '|', PRAYER_POST.title);
    console.log('· 자유 글 →', FREE_POST.byHandle, '|', FREE_POST.title);
    console.log('\n✓ 미리보기 완료.');
    return;
  }

  // 1) 댓글
  const { data: c, error: cErr } = await db.from('comments')
    .insert({ post_id: TARGET_POST_ID, author_id: uComment, parent_id: null, content: COMMENT.content })
    .select('id').single();
  if (cErr) throw new Error(`댓글 실패: ${cErr.message}`);
  console.log('+ 댓글 작성  id', c.id);

  // 2) 기도요청 글
  const { data: p1, error: p1Err } = await db.from('posts')
    .insert({ author_id: uPrayer, category: PRAYER_POST.category, title: PRAYER_POST.title,
              content: PRAYER_POST.content, views: 7, prayer_answered: false })
    .select('id').single();
  if (p1Err) throw new Error(`기도요청 글 실패: ${p1Err.message}`);
  console.log('+ 기도요청 글  id', p1.id);

  // 3) 자유 글
  const { data: p2, error: p2Err } = await db.from('posts')
    .insert({ author_id: uFree, category: FREE_POST.category, title: FREE_POST.title,
              content: FREE_POST.content, views: 12, prayer_answered: false })
    .select('id').single();
  if (p2Err) throw new Error(`자유 글 실패: ${p2Err.message}`);
  console.log('+ 자유 글  id', p2.id);

  console.log('\n✓ 완료 — 댓글 1 + 글 2 삽입됨.');
}

main().catch((e) => { console.error('\n✗ 실패:', e.message); process.exit(1); });
