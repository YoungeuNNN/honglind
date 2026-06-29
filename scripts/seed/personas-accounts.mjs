// ============================================================
// 홍라인드 — personas.csv 의 50명을 실제 Supabase 로그인 계정으로 생성
//   이메일 패턴: {handle}@seed.honglind.local  (promote-seed.sql / teardown.mjs 와 동일)
//   service_role(secret) 키로 동작 → RLS 우회.
//
//   실행:
//     node scripts/seed/personas-accounts.mjs --dry   (미리보기, 쓰기 없음)
//     node scripts/seed/personas-accounts.mjs         (실제 생성)
//
//   멱등: 이미 같은 이메일 계정이 있으면 재사용하고 닉네임만 갱신한다.
//   글/댓글은 만들지 않는다(계정만). 콘텐츠는 별도.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const EMAIL_DOMAIN = 'seed.honglind.local';

// ── .env.seed 로드 (dotenv 없이 간단 파싱) ──
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '.env.seed'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* OS 환경변수 사용 */ }
}
loadEnv();

const URL = process.env.SEED_SUPABASE_URL;
const KEY = process.env.SEED_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('✗ SEED_SUPABASE_URL / SEED_SERVICE_ROLE_KEY 가 필요합니다. scripts/seed/.env.seed 확인.');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ── personas.csv 파싱 (RFC4180 풍) ──
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim()));
}

const csv = readFileSync(resolve(__dirname, 'personas.csv'), 'utf8');
const rows = parseCSV(csv);
const header = rows.shift().map((h) => h.trim());
const hIdx = header.indexOf('handle');
const nIdx = header.indexOf('nickname');
if (hIdx < 0 || nIdx < 0) { console.error('✗ CSV 헤더에 handle/nickname 없음'); process.exit(1); }
const PERSONAS = rows.map((r) => ({ handle: r[hIdx].trim(), nickname: r[nIdx] }));

// 멱등용: 이메일로 기존 계정 검색
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n홍라인드 페르소나 계정 생성 — ${DRY ? '[DRY RUN: 쓰기 없음]' : '실제 생성'}`);
  console.log(`대상: ${URL}`);
  console.log(`personas.csv 행 수: ${PERSONAS.length}\n`);

  if (DRY) {
    PERSONAS.forEach((p, i) =>
      console.log(`  ${String(i + 1).padStart(2)}. ${p.handle}@${EMAIL_DOMAIN}  →  ${p.nickname}`));
    console.log(`\n✓ 미리보기 완료. 실제 생성은 --dry 빼고 실행하세요.`);
    return;
  }

  let created = 0, reused = 0;
  for (const p of PERSONAS) {
    const email = `${p.handle}@${EMAIL_DOMAIN}`;
    let user = await findUserByEmail(email);
    if (user) {
      reused++;
      console.log(`· 재사용  ${p.nickname} (${email})`);
    } else {
      const password = `Seed!${Math.random().toString(36).slice(2)}9aZ`;
      const { data, error } = await db.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { nickname: p.nickname },
      });
      if (error) throw new Error(`계정 생성 실패 ${email}: ${error.message}`);
      user = data.user;
      created++;
      console.log(`+ 생성    ${p.nickname} (${email})`);
      await sleep(150); // auth rate limit 여유
    }
    // 닉네임 갱신 (트리거가 만든 profile 의 닉네임을 CSV 기준으로 맞춤)
    const { error: pErr } = await db.from('profiles').update({ nickname: p.nickname }).eq('id', user.id);
    if (pErr) throw new Error(`프로필 갱신 실패 ${p.nickname}: ${pErr.message}`);
  }

  console.log(`\n✓ 완료 — 신규 생성 ${created}명 · 재사용 ${reused}명 (총 ${PERSONAS.length}명)`);
  console.log('  → 승인·인증 상태로 만들려면 scripts/seed/promote-seed.sql 을 Supabase SQL 에디터에서 1회 실행하세요.');
}

main().catch((e) => { console.error('\n✗ 실패:', e.message); process.exit(1); });
