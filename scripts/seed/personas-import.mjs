// CSV → personas.mjs 반영 (구글시트/엑셀에서 고친 내용을 시스템에 적용)
//   실행:
//     node scripts/seed/personas-import.mjs
//        → scripts/seed/personas.csv 사용
//     node scripts/seed/personas-import.mjs "C:/Users/polll/Downloads/personas - 시트1.csv"
//        → 구글시트에서 받은 파일을 직접 지정 (personas.csv 로 복사 후 반영)
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(__dirname, 'personas.csv');

// 인자로 외부 CSV 경로를 주면, 먼저 personas.csv 로 복사(원본 갱신)한 뒤 반영
const argPath = process.argv[2];
if (argPath) {
  copyFileSync(resolve(argPath), CSV_PATH);
  console.log(`· ${argPath}\n  → personas.csv 로 복사함`);
}

// RFC4180 풍 CSV 파서 (따옴표·쉼표·줄바꿈 처리)
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

const csv = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(csv);
const header = rows.shift().map((h) => h.trim());
const idx = (k) => header.indexOf(k);
const need = ['handle', 'nickname', 'persona', 'voice', 'posts_per_week'];
for (const k of need) if (idx(k) < 0) { console.error(`✗ CSV 헤더에 '${k}' 없음`); process.exit(1); }

const items = rows.map((r) => ({
  handle: r[idx('handle')].trim(),
  nickname: r[idx('nickname')],
  persona: r[idx('persona')],
  voice: r[idx('voice')],
  posts_per_week: Number(r[idx('posts_per_week')]) || 1,
}));

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const body = items
  .map((p) => `  { handle: '${esc(p.handle)}', nickname: '${esc(p.nickname)}',\n` +
              `    persona: '${esc(p.persona)}',\n` +
              `    voice: '${esc(p.voice)}',\n` +
              `    posts_per_week: ${p.posts_per_week} },`)
  .join('\n');

const out = `// ============================================================
// 홍라인드 가상 유저 풀 (${items.length})
//   ※ 이 파일은 personas.csv 에서 자동 생성됩니다.
//      수정은 personas.csv 에서 한 뒤 \`node scripts/seed/personas-import.mjs\` 실행.
// ============================================================

export const PERSONAS = [
${body}
];
`;

writeFileSync(resolve(__dirname, 'personas.mjs'), out, 'utf8');
console.log(`✓ personas.mjs 갱신 (${items.length}행). CSV 수정 내용이 반영됐습니다.`);
