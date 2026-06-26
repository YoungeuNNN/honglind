// ============================================================
// 콘텐츠 전체 초기화 + 관리자 권한 부여 (처음부터 다시 시작)
//
//   1) 모든 글/댓글/반응/공지/신고/DM/알림 삭제 (계정/프로필은 유지)
//   2) 지정 이메일 계정에 role='admin' 부여 → 모든 RLS 게이트 통과
//      (+ membership/verification 도 시도하되, 트리거가 되돌리면 SQL 안내)
//
//   ⚠️ 되돌릴 수 없는 작업입니다. 반드시 --yes 플래그가 있어야 실행됩니다.
//
//   실행:
//     node scripts/seed/reset-and-admin.mjs --dry          # 미리보기(쓰기 없음)
//     node scripts/seed/reset-and-admin.mjs --yes          # 실제 실행
//     node scripts/seed/reset-and-admin.mjs --yes --keep-content   # 권한만, 삭제 생략
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN_EMAIL = 'pollllllion@puts.ac.kr'; // 관리자 권한을 줄 계정
const NIL = '00000000-0000-0000-0000-000000000000';

const DRY = process.argv.includes('--dry');
const YES = process.argv.includes('--yes');
const KEEP = process.argv.includes('--keep-content');

// .env.seed 로드
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
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// 삭제 순서: 자식/독립 테이블 → 부모(posts). posts 삭제 시 다수는 cascade 로 함께 제거됨.
const WIPE = [
  ['messages', 'DM'],
  ['reports', '신고'],
  ['notifications', '알림'],
  ['announcements', '공지'],
  ['posts', '글(+댓글/좋아요/기도/북마크/투표 cascade)'],
];

async function countAll() {
  const out = {};
  for (const [t] of WIPE) {
    const { count } = await db.from(t).select('*', { count: 'exact', head: true });
    out[t] = count ?? 0;
  }
  return out;
}

async function main() {
  console.log(`\n초기화 + 관리자 부여 — ${DRY ? '[DRY RUN]' : YES ? '실제 실행' : '미실행(--yes 필요)'}`);
  console.log(`대상 DB : ${URL}`);
  console.log(`관리자  : ${ADMIN_EMAIL}\n`);

  const before = await countAll();
  console.log('현재 데이터 수:');
  for (const [t, label] of WIPE) console.log(`  · ${t.padEnd(14)} ${String(before[t]).padStart(4)}  ${label}`);

  if (!DRY && !YES) {
    console.log('\n실제로 지우려면 --yes 를 붙여 다시 실행하세요. (되돌릴 수 없음)');
    return;
  }
  if (DRY) {
    console.log('\n[DRY] 위 데이터가 삭제 대상입니다. 실제 실행: --yes');
    return;
  }

  // ── 1) 콘텐츠 삭제 ──
  if (!KEEP) {
    console.log('\n삭제 중...');
    for (const [t, label] of WIPE) {
      const { error } = await db.from(t).delete().neq('id', NIL);
      if (error) throw new Error(`${t} 삭제 실패: ${error.message}`);
      console.log(`  - ${t} 비움 (${label})`);
    }
  } else {
    console.log('\n--keep-content: 삭제 생략, 권한만 부여');
  }

  // ── 2) 관리자 권한 ──
  console.log('\n관리자 권한 부여...');
  const { data: prof, error: findErr } = await db
    .from('profiles')
    .select('id, nickname, email, role, membership_status, verification_status')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();
  if (findErr) throw new Error(`프로필 조회 실패: ${findErr.message}`);
  if (!prof) throw new Error(`이메일 ${ADMIN_EMAIL} 프로필을 찾지 못했습니다. 한 번이라도 로그인/가입했는지 확인하세요.`);

  const { error: upErr } = await db
    .from('profiles')
    .update({ role: 'admin', membership_status: 'approved', verification_status: 'verified' })
    .eq('id', prof.id);
  if (upErr) throw new Error(`권한 부여 실패: ${upErr.message}`);

  // 트리거가 되돌렸는지 실제 상태 재확인
  const { data: after } = await db
    .from('profiles')
    .select('role, membership_status, verification_status, verified_at')
    .eq('id', prof.id)
    .single();

  console.log(`  닉네임: ${prof.nickname}`);
  console.log(`  role               : ${after.role}`);
  console.log(`  membership_status  : ${after.membership_status}`);
  console.log(`  verification_status: ${after.verification_status}`);

  const afterCount = await countAll();
  console.log('\n삭제 후 데이터 수:');
  for (const [t] of WIPE) console.log(`  · ${t.padEnd(14)} ${String(afterCount[t]).padStart(4)}`);

  console.log('\n✓ 완료.');
  if (after.role === 'admin') {
    console.log('  role=admin 이므로 모든 RLS 게이트(읽기/쓰기/관리)를 이미 통과합니다.');
  }
  if (after.verification_status !== 'verified' || after.membership_status !== 'approved') {
    console.log('  ※ 인증 뱃지/상태 컬럼은 트리거가 되돌렸습니다. 화면 뱃지까지 깔끔히 하려면');
    console.log('    Supabase SQL 에디터에서 scripts/seed/grant-admin.sql 을 1회 실행하세요.');
  }
}

main().catch((e) => {
  console.error('\n✗ 실패:', e.message);
  process.exit(1);
});
