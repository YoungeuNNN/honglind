// personas.mjs → personas.csv 내보내기 (엑셀/구글시트용)
//   실행:  node scripts/seed/personas-export.mjs
//   결과:  scripts/seed/personas.csv  (UTF-8 BOM, 엑셀에서 한글 안 깨짐)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PERSONAS } from './personas.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cols = ['handle', 'nickname', 'persona', 'voice', 'posts_per_week'];
const lines = [cols.join(',')];
for (const p of PERSONAS) lines.push(cols.map((c) => cell(p[c])).join(','));

writeFileSync(resolve(__dirname, 'personas.csv'), '﻿' + lines.join('\r\n'), 'utf8');
console.log(`✓ personas.csv 생성 (${PERSONAS.length}행). 엑셀/구글시트로 열어 편집하세요.`);
